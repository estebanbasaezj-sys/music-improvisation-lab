// Herramientas de pistas sin IA (instantáneas) y ayudas para aislar el instrumento elegido:
// - centro/lados (mid/side): en muchas grabaciones de jazz cada instrumento está en un lado del estéreo;
// - filtro de banda por instrumento (su registro habitual);
// - realce de la melodía principal: a partir de las notas detectadas (Basic Pitch) deja pasar solo los
//   armónicos de esa línea y atenúa el resto (piano, guitarra de acompañamiento) en una pista ya separada.
import { fft } from './analysis';

export type Instrument = 'sax' | 'trumpet' | 'voice' | 'guitar' | 'piano' | 'bass' | 'drums' | 'lead';
export const INSTRUMENT_INFO: Record<Instrument, { label: string; icon: string; range: [number, number]; band: [number, number]; lead: boolean }> = {
  sax: { label: 'Saxofón', icon: '🎷', range: [44, 81], band: [90, 9000], lead: true }, // del barítono/tenor grave al alto agudo (concierto)
  trumpet: { label: 'Trompeta', icon: '🎺', range: [52, 84], band: [150, 10000], lead: true },
  voice: { label: 'Voz', icon: '🎤', range: [45, 81], band: [100, 9000], lead: true },
  guitar: { label: 'Guitarra', icon: '🎸', range: [40, 88], band: [80, 8000], lead: false },
  piano: { label: 'Piano', icon: '🎹', range: [33, 100], band: [50, 9000], lead: false },
  bass: { label: 'Bajo / contrabajo', icon: '🎻', range: [28, 60], band: [35, 1200], lead: false },
  drums: { label: 'Batería', icon: '🥁', range: [0, 127], band: [30, 16000], lead: false },
  lead: { label: 'Instrumento principal (cualquiera)', icon: '⭐', range: [36, 96], band: [80, 10000], lead: true },
};

/** Divide en centro (L+R)/2 y lados (L−R)/2. */
export function midSide(buf: AudioBuffer, ctx: BaseAudioContext): { center: AudioBuffer; sides: AudioBuffer } {
  const L = buf.getChannelData(0);
  const R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
  const c = ctx.createBuffer(2, buf.length, buf.sampleRate);
  const s = ctx.createBuffer(2, buf.length, buf.sampleRate);
  const c0 = c.getChannelData(0), c1 = c.getChannelData(1), s0 = s.getChannelData(0), s1 = s.getChannelData(1);
  for (let i = 0; i < buf.length; i++) { const m = (L[i] + R[i]) / 2, d = (L[i] - R[i]) / 2; c0[i] = c1[i] = m; s0[i] = d; s1[i] = -d; }
  return { center: c, sides: s };
}

/** Copia del fragmento [from, to) en segundos. */
export function sliceBuffer(buf: AudioBuffer, from: number, to: number, ctx: BaseAudioContext): AudioBuffer {
  const a = Math.max(0, Math.floor(from * buf.sampleRate));
  const b = Math.min(buf.length, Math.ceil(to * buf.sampleRate));
  const out = ctx.createBuffer(buf.numberOfChannels, Math.max(1, b - a), buf.sampleRate);
  for (let c = 0; c < buf.numberOfChannels; c++) out.getChannelData(c).set(buf.getChannelData(c).subarray(a, b));
  return out;
}

const hann = (n: number) => Float32Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n));

/**
 * Aplica una ganancia por (trama, bin) calculada por `gainAt(frameTimeSec, freqHz)` mediante STFT/ISTFT
 * (Hann de 2048, salto 512, reconstrucción por solapamiento normalizado). Procesa cada canal.
 */
export async function spectralGain(buf: AudioBuffer, ctx: BaseAudioContext, gainAt: (t: number) => (f: number) => number, onProgress?: (p: number) => void): Promise<AudioBuffer> {
  const N = 2048, H = 512, sr = buf.sampleRate, w = hann(N);
  const out = ctx.createBuffer(buf.numberOfChannels, buf.length, sr);
  const frames = Math.ceil(buf.length / H) + 1;
  const re = new Float32Array(N), im = new Float32Array(N);
  const gains: Float32Array[] = [];
  for (let f = 0; f < frames; f++) {
    const g = gainAt((f * H) / sr);
    const row = new Float32Array(N / 2 + 1);
    for (let k = 0; k <= N / 2; k++) row[k] = g((k * sr) / N);
    gains.push(row);
  }
  // suavizado temporal de la máscara (evita el "ruido musical")
  for (let f = 1; f < frames; f++) for (let k = 0; k <= N / 2; k++) gains[f][k] = 0.6 * gains[f][k] + 0.4 * gains[f - 1][k];
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const x = buf.getChannelData(c), y = out.getChannelData(c);
    const norm = new Float32Array(buf.length + N);
    const acc = new Float32Array(buf.length + N);
    for (let f = 0; f < frames; f++) {
      const off = f * H - N / 2;
      for (let i = 0; i < N; i++) { const j = off + i; re[i] = j >= 0 && j < x.length ? x[j] * w[i] : 0; im[i] = 0; }
      fft(re, im);
      const g = gains[f];
      for (let k = 0; k <= N / 2; k++) { re[k] *= g[k]; im[k] *= g[k]; if (k > 0 && k < N / 2) { re[N - k] = re[k]; im[N - k] = -im[k]; } }
      // inversa: conj → fft → conj / N
      for (let i = 0; i < N; i++) im[i] = -im[i];
      fft(re, im);
      for (let i = 0; i < N; i++) { const j = off + i; if (j >= 0 && j < buf.length) { acc[j] += (re[i] / N) * w[i]; norm[j] += w[i] * w[i]; } }
      if (f % 200 === 0) { onProgress?.((c + f / frames) / buf.numberOfChannels); await new Promise((r) => setTimeout(r, 0)); }
    }
    for (let i = 0; i < buf.length; i++) y[i] = norm[i] > 1e-6 ? acc[i] / norm[i] : 0;
  }
  return out;
}

/** Filtro de banda suave (paso alto + paso bajo) para centrarse en el registro del instrumento. */
export function bandGain(lo: number, hi: number) {
  return () => (f: number) => (f < lo ? Math.pow(f / lo, 2) : f > hi ? Math.pow(hi / f, 2) : 1);
}

/**
 * Realce de la melodía principal: en cada instante deja pasar los armónicos de la nota que suena en la
 * línea detectada (notas en segundos relativas al buffer) y atenúa lo demás a `floor`.
 */
export function leadGain(notes: { midi: number; start: number; dur: number }[], floor = 0.08) {
  const sorted = [...notes].sort((a, b) => a.start - b.start);
  return (t: number) => {
    // nota activa (con 40 ms de margen para el ataque y la cola)
    let n: (typeof sorted)[number] | undefined;
    for (const x of sorted) { if (x.start - 0.04 <= t && t <= x.start + x.dur + 0.06) n = x; if (x.start > t + 0.1) break; }
    if (!n) return () => floor;
    const f0 = 440 * Math.pow(2, (n.midi - 69) / 12);
    return (f: number) => {
      if (f < f0 * 0.8 || f > 12000) return floor;
      const h = Math.max(1, Math.round(f / f0));
      const width = Math.max(18, 0.035 * h * f0);
      const d = (f - h * f0) / width;
      return Math.max(floor, Math.exp(-0.5 * d * d));
    };
  };
}

/** Energía RMS de un buffer (para saber qué pistas tienen contenido). */
export function rms(buf: AudioBuffer): number {
  let e = 0, n = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i += 4) { e += d[i] * d[i]; n++; } }
  return Math.sqrt(e / Math.max(1, n));
}

/** Codifica un AudioBuffer como WAV de 16 bits (para guardar proyectos y descargar pistas). */
export function toWav(buf: AudioBuffer): Blob {
  const ch = Math.min(2, buf.numberOfChannels), n = buf.length, sr = buf.sampleRate;
  const data = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); data.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt '); data.setUint32(16, 16, true);
  data.setUint16(20, 1, true); data.setUint16(22, ch, true); data.setUint32(24, sr, true); data.setUint32(28, sr * ch * 2, true);
  data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true); w(36, 'data'); data.setUint32(40, n * ch * 2, true);
  const chans = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, chans[c][i])); data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  return new Blob([data.buffer], { type: 'audio/wav' });
}

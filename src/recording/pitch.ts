// Detección de altura monofónica (algoritmo YIN simplificado). Fiable para una sola nota sostenida
// (saxofón, voz, una nota de guitarra o piano). NO detecta acordes.

export interface PitchResult {
  freq: number;
  clarity: number; // 0..1 (1 = periodicidad perfecta)
  rms: number;
}

export function detectPitch(buf: Float32Array, sampleRate: number, minFreq = 55, maxFreq = 1500): PitchResult | null {
  const n = buf.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < 0.008) return null;
  const maxTau = Math.min(Math.floor(sampleRate / minFreq), Math.floor(n / 2));
  const minTau = Math.max(2, Math.floor(sampleRate / maxFreq));
  const d = new Float32Array(maxTau + 1);
  const W = n - maxTau;
  for (let tau = 1; tau <= maxTau; tau++) {
    let s = 0;
    for (let i = 0; i < W; i++) {
      const diff = buf[i] - buf[i + tau];
      s += diff * diff;
    }
    d[tau] = s;
  }
  // diferencia normalizada acumulada
  const cmnd = new Float32Array(maxTau + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    running += d[tau];
    cmnd[tau] = running === 0 ? 1 : (d[tau] * tau) / running;
  }
  const threshold = 0.15;
  let tau = -1;
  for (let t = minTau; t <= maxTau; t++) {
    if (cmnd[t] < threshold) {
      while (t + 1 <= maxTau && cmnd[t + 1] < cmnd[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;
  // interpolación parabólica
  const x0 = tau > 1 ? cmnd[tau - 1] : cmnd[tau];
  const x2 = tau < maxTau ? cmnd[tau + 1] : cmnd[tau];
  const denom = x0 + x2 - 2 * cmnd[tau];
  const better = denom !== 0 ? tau + (x0 - x2) / (2 * denom) : tau;
  return { freq: sampleRate / better, clarity: 1 - cmnd[tau], rms };
}

export const freqToMidi = (f: number) => 69 + 12 * Math.log2(f / 440);

/** Segmenta un flujo de alturas en notas estables. */
export class NoteSegmenter {
  private current: number | null = null;
  private since = 0;
  private committed = false;
  notes: { midi: number; t: number }[] = [];
  constructor(private minMs = 90) {}
  push(m: number | null, tMs: number) {
    const r = m === null ? null : Math.round(m);
    if (r !== this.current) {
      this.current = r;
      this.since = tMs;
      this.committed = false;
      return;
    }
    if (r !== null && !this.committed && tMs - this.since >= this.minMs) {
      this.committed = true;
      this.notes.push({ midi: r, t: this.since });
    }
  }
  reset() {
    this.notes = [];
    this.current = null;
    this.committed = false;
  }
}

/** Compara secuencias por clase de altura (independiente de la octava) usando la subsecuencia común más larga. */
export function compareSequences(target: number[], played: number[]) {
  const a = target.map((m) => ((m % 12) + 12) % 12);
  const b = played.map((m) => ((m % 12) + 12) % 12);
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  // reconstruir qué notas objetivo se encontraron
  const matched = new Array(a.length).fill(false);
  let i = a.length;
  let j = b.length;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { matched[i - 1] = true; i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return { matched, correct: dp[a.length][b.length], total: a.length, extra: Math.max(0, b.length - dp[a.length][b.length]) };
}

/** Escucha el micrófono y reporta alturas. */
export class PitchListener {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private raf = 0;
  async start(onPitch: (r: PitchResult | null, tMs: number) => void) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    this.ctx = new AudioContext();
    const src = this.ctx.createMediaStreamSource(this.stream);
    const an = this.ctx.createAnalyser();
    an.fftSize = 2048;
    src.connect(an);
    const buf = new Float32Array(an.fftSize);
    const loop = () => {
      an.getFloatTimeDomainData(buf);
      const r = detectPitch(buf, this.ctx!.sampleRate);
      onPitch(r && r.clarity > 0.85 ? r : null, performance.now());
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }
  stop() {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close();
    this.ctx = null;
    this.stream = null;
  }
}

/** ¿La página está incrustada (p. ej. dentro de claude.ai), donde el navegador suele bloquear el micrófono? */
export const isEmbedded = () => { try { return window.self !== window.top; } catch { return true; } };

/** Mensaje claro cuando el micrófono no está disponible. */
export function micErrorText(e: unknown): string {
  const name = (e as { name?: string })?.name ?? '';
  if (isEmbedded()) return 'Dentro de claude.ai el navegador no permite que la página use el micrófono. Graba con tu teléfono o computador y sube el audio (abajo), o usa la app en su propia dirección.';
  if (name === 'NotAllowedError') return 'El permiso del micrófono está denegado. Actívalo en el candado de la barra de direcciones y recarga la página.';
  if (name === 'NotFoundError') return 'No se encontró ningún micrófono conectado.';
  return 'No se pudo usar el micrófono. Puedes grabar con otra app y subir el audio.';
}

/**
 * Notas de un archivo de audio (mismo método que en vivo: YIN cada 20 ms + segmentación).
 * Sirve para evaluar grabaciones subidas cuando el micrófono en vivo no está disponible.
 */
export async function notesFromAudioFile(file: Blob, ctx: BaseAudioContext): Promise<{ midi: number; t: number }[]> {
  const buf = await ctx.decodeAudioData(await file.arrayBuffer());
  const sr = buf.sampleRate;
  const ch = buf.getChannelData(0);
  const win = 2048;
  const hop = Math.round(sr * 0.02);
  const seg = new NoteSegmenter(90);
  for (let s = 0; s + win <= ch.length; s += hop) {
    const r = detectPitch(ch.subarray(s, s + win), sr);
    seg.push(r && r.clarity > 0.85 ? freqToMidi(r.freq) : null, (s / sr) * 1000);
  }
  return seg.notes;
}

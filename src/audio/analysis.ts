// Análisis de audio sin dependencias: FFT, cromagrama, detección de acordes (plantillas + suavizado
// Viterbi), tonalidad (Krumhansl-Schmuckler), envolvente de ataques, tempo y pulsos (programación
// dinámica tipo Ellis). Pensado para dar ESTIMACIONES útiles para practicar, no transcripciones perfectas.

export function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1; let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k; const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

/** Mezcla a mono y remuestrea (lineal) a `target` Hz. */
export function toMono(channels: Float32Array[], sr: number, target: number): Float32Array {
  const len = channels[0].length;
  const ratio = sr / target;
  const out = new Float32Array(Math.floor(len / ratio));
  for (let i = 0; i < out.length; i++) {
    const x = i * ratio;
    const i0 = Math.floor(x);
    const f = x - i0;
    let s = 0;
    for (const ch of channels) s += ch[i0] * (1 - f) + (ch[Math.min(len - 1, i0 + 1)] ?? 0) * f;
    out[i] = s / channels.length;
  }
  return out;
}

/** Cromagrama de un espectro de magnitudes. */
export function chromaFromMagnitudes(mag: Float32Array | number[], sr: number, nfft: number, fmin = 65, fmax = 2100): { chroma: number[]; bass: number[] } {
  const chroma = new Array(12).fill(0);
  const bass = new Array(12).fill(0);
  for (let k = 1; k < mag.length; k++) {
    const f = (k * sr) / nfft;
    if (f < fmin || f > fmax) continue;
    const m = 69 + 12 * Math.log2(f / 440);
    const p = ((Math.round(m) % 12) + 12) % 12;
    const w = mag[k] * (1 - Math.min(1, Math.abs(m - Math.round(m)) * 1.6));
    chroma[p] += w;
  }
  // bajo: el primer pico importante desde abajo (40–300 Hz) suele ser la fundamental del acorde
  const k0 = Math.max(1, Math.floor((40 * nfft) / sr));
  const k1 = Math.min(mag.length - 2, Math.ceil((300 * nfft) / sr));
  let max = 0;
  for (let k = k0; k <= k1; k++) max = Math.max(max, mag[k]);
  if (max > 0) {
    for (let k = k0 + 1; k <= k1; k++) {
      if (mag[k] >= 0.35 * max && mag[k] >= mag[k - 1] && mag[k] >= mag[k + 1]) {
        const m = 69 + 12 * Math.log2((k * sr) / nfft / 440);
        bass[((Math.round(m) % 12) + 12) % 12] += mag[k];
        break;
      }
    }
  }
  return { chroma, bass };
}

export const normalize = (v: number[]) => { const s = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) || 1; return v.map((x) => x / s); };

export interface Frames { chroma: number[][]; bass: number[][]; onset: number[]; hopSec: number; rms: number[] }

/** Análisis por tramas de una señal mono. */
export function frameAnalysis(x: Float32Array, sr: number, nfft = 4096, hop = 1024): Frames {
  const win = new Float32Array(nfft).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (nfft - 1)));
  const re = new Float32Array(nfft);
  const im = new Float32Array(nfft);
  const chroma: number[][] = [];
  const bass: number[][] = [];
  const onset: number[] = [];
  const rms: number[] = [];
  let prev: Float32Array | null = null;
  for (let s = 0; s + nfft <= x.length; s += hop) {
    let e = 0;
    for (let i = 0; i < nfft; i++) { re[i] = x[s + i] * win[i]; im[i] = 0; e += x[s + i] * x[s + i]; }
    rms.push(Math.sqrt(e / nfft));
    fft(re, im);
    const mag = new Float32Array(nfft / 2);
    for (let k = 0; k < nfft / 2; k++) mag[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
    const c = chromaFromMagnitudes(mag, sr, nfft);
    chroma.push(c.chroma);
    bass.push(c.bass);
    // flujo espectral (log) para detectar ataques
    let flux = 0;
    if (prev) for (let k = 2; k < 400 && k < mag.length; k++) { const d = Math.log1p(mag[k]) - Math.log1p(prev[k]); if (d > 0) flux += d; }
    onset.push(flux);
    prev = mag;
  }
  return { chroma, bass, onset, hopSec: hop / sr, rms };
}

// ---------------------------------------------------------------- acordes
export const CHORD_QUALITIES: { id: string; ints: number[]; w: number }[] = [
  { id: 'maj', ints: [0, 4, 7], w: 1 },
  { id: 'm', ints: [0, 3, 7], w: 1 },
  { id: '7', ints: [0, 4, 7, 10], w: 0.97 },
  { id: 'maj7', ints: [0, 4, 7, 11], w: 0.96 },
  { id: 'm7', ints: [0, 3, 7, 10], w: 0.97 },
  { id: 'm7b5', ints: [0, 3, 6, 10], w: 0.93 },
  { id: 'dim7', ints: [0, 3, 6, 9], w: 0.9 },
  { id: '6', ints: [0, 4, 7, 9], w: 0.9 },
];
export const PC_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export interface ChordGuess { root: number; quality: string; score: number }

export function chordScores(chroma: number[], bass?: number[], allowed = CHORD_QUALITIES.map((q) => q.id)): ChordGuess[] {
  const c = normalize(chroma);
  const b = bass ? normalize(bass) : null;
  const out: ChordGuess[] = [];
  for (let root = 0; root < 12; root++) for (const q of CHORD_QUALITIES) {
    if (!allowed.includes(q.id)) continue;
    const t = new Array(12).fill(0);
    q.ints.forEach((iv, i) => { t[(root + iv) % 12] = i === 0 ? 1.15 : i === 1 ? 1.05 : 1; });
    const tn = normalize(t);
    let s = 0;
    for (let k = 0; k < 12; k++) s += c[k] * tn[k];
    // penalizar energía fuera del acorde
    let outE = 0;
    for (let k = 0; k < 12; k++) if (t[k] === 0) outE += c[k] * c[k];
    s = s * q.w - outE * 0.6;
    // penalizar notas del acorde que no suenan (evita confundir G7 con Dm7 cuando falta el Do)
    for (let k = 0; k < 12; k++) if (t[k] > 0 && c[k] < 0.12) s -= 0.14;
    if (b) s += 0.4 * b[root];
    out.push({ root, quality: q.id, score: s });
  }
  return out.sort((x, y) => y.score - x.score);
}

/** Secuencia de acordes suavizada con Viterbi (penaliza cambios rápidos). */
export function chordSequence(chromas: number[][], basses: number[][] | null, changePenalty = 0.12, allowed?: string[]): ChordGuess[] {
  const states: { root: number; quality: string }[] = [];
  for (let r = 0; r < 12; r++) for (const q of CHORD_QUALITIES) if (!allowed || allowed.includes(q.id)) states.push({ root: r, quality: q.id });
  const S = states.length;
  const T = chromas.length;
  if (!T) return [];
  const emis = chromas.map((c, t) => {
    const sc = chordScores(c, basses?.[t], allowed);
    const map = new Map(sc.map((g) => [`${g.root}:${g.quality}`, g.score]));
    return states.map((s) => map.get(`${s.root}:${s.quality}`) ?? -1);
  });
  const dp = new Float64Array(S);
  const back: Int32Array[] = [];
  for (let s = 0; s < S; s++) dp[s] = emis[0][s];
  for (let t = 1; t < T; t++) {
    let bestPrev = 0;
    for (let s = 1; s < S; s++) if (dp[s] > dp[bestPrev]) bestPrev = s;
    const nd = new Float64Array(S);
    const bk = new Int32Array(S);
    for (let s = 0; s < S; s++) {
      const stay = dp[s];
      const sw = dp[bestPrev] - changePenalty;
      if (stay >= sw) { nd[s] = stay + emis[t][s]; bk[s] = s; } else { nd[s] = sw + emis[t][s]; bk[s] = bestPrev; }
    }
    back.push(bk);
    dp.set(nd);
  }
  let s = 0;
  for (let k = 1; k < S; k++) if (dp[k] > dp[s]) s = k;
  const path = new Array(T);
  path[T - 1] = s;
  for (let t = T - 1; t > 0; t--) { s = back[t - 1][s]; path[t - 1] = s; }
  return path.map((st: number, t: number) => ({ ...states[st], score: emis[t][st] }));
}

// ---------------------------------------------------------------- tonalidad
const KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
function corr(a: number[], b: number[]) {
  const ma = a.reduce((x, y) => x + y, 0) / 12;
  const mb = b.reduce((x, y) => x + y, 0) / 12;
  let n = 0; let da = 0; let db = 0;
  for (let i = 0; i < 12; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return n / Math.sqrt(da * db || 1);
}
export function detectKey(chromaSum: number[]): { tonic: number; minor: boolean; confidence: number }[] {
  const res: { tonic: number; minor: boolean; confidence: number }[] = [];
  for (let t = 0; t < 12; t++) {
    const rot = (p: number[]) => p.map((_, i) => p[(i - t + 12) % 12]);
    res.push({ tonic: t, minor: false, confidence: corr(chromaSum, rot(KS_MAJOR)) });
    res.push({ tonic: t, minor: true, confidence: corr(chromaSum, rot(KS_MINOR)) });
  }
  return res.sort((a, b) => b.confidence - a.confidence);
}

// ---------------------------------------------------------------- tempo y pulsos
export function estimateTempo(onset: number[], hopSec: number, minBpm = 60, maxBpm = 200): { bpm: number; confidence: number } {
  const o = onset.map((x, i) => x - (onset.slice(Math.max(0, i - 8), i + 8).reduce((a, b) => a + b, 0) / Math.min(16, onset.length)));
  const pos = o.map((x) => Math.max(0, x));
  let best = { bpm: 120, confidence: 0 };
  const scores: { bpm: number; s: number }[] = [];
  for (let bpm = minBpm; bpm <= maxBpm; bpm += 0.5) {
    const lag = 60 / bpm / hopSec;
    let s = 0;
    for (let i = 0; i + lag * 2 < pos.length; i++) {
      const a = pos[i] * interp(pos, i + lag);
      const b = pos[i] * interp(pos, i + lag * 2);
      s += a + 0.5 * b;
    }
    // preferencia suave por tempos medios (como el oído humano)
    s *= Math.exp(-0.5 * (Math.log2(bpm / 120) / 1.0) ** 2);
    scores.push({ bpm, s });
  }
  const max = Math.max(...scores.map((x) => x.s));
  const sorted = [...scores].sort((a, b) => b.s - a.s);
  best = { bpm: sorted[0].bpm, confidence: max > 0 ? sorted[0].s / (scores.reduce((a, b) => a + b.s, 0) / scores.length) : 0 };
  return best;
}
function interp(a: number[], x: number) {
  const i = Math.floor(x);
  const f = x - i;
  return (a[i] ?? 0) * (1 - f) + (a[i + 1] ?? 0) * f;
}

/** Seguimiento de pulsos por programación dinámica (Ellis 2007). Devuelve instantes en segundos. */
export function trackBeats(onset: number[], hopSec: number, bpm: number, tightness = 100): number[] {
  const period = 60 / bpm / hopSec;
  const n = onset.length;
  const mean = onset.reduce((a, b) => a + b, 0) / Math.max(1, n);
  const std = Math.sqrt(onset.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n)) || 1;
  const o = onset.map((x) => (x - mean) / std);
  const score = new Float64Array(n);
  const back = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    let best = -Infinity; let bi = -1;
    const lo = Math.round(i - 2 * period);
    const hi = Math.round(i - period / 2);
    for (let j = Math.max(0, lo); j <= hi && j < i; j++) {
      const pen = -tightness * Math.log((i - j) / period) ** 2;
      const v = score[j] + pen;
      if (v > best) { best = v; bi = j; }
    }
    score[i] = o[i] + (bi >= 0 ? best : 0);
    back[i] = bi;
  }
  // último pulso: máximo en el último periodo
  let last = n - 1;
  for (let i = Math.max(0, Math.floor(n - period)); i < n; i++) if (score[i] > score[last]) last = i;
  const beats: number[] = [];
  for (let i = last; i >= 0; i = back[i]) { beats.push(i * hopSec); if (back[i] < 0) break; }
  return beats.reverse();
}

/** Chroma media de un intervalo de tramas. */
export function meanChroma(frames: number[][], from: number, to: number): number[] {
  const out = new Array(12).fill(0);
  const a = Math.max(0, Math.floor(from));
  const b = Math.min(frames.length, Math.max(a + 1, Math.ceil(to)));
  for (let i = a; i < b; i++) for (let k = 0; k < 12; k++) out[k] += frames[i][k];
  return out;
}

/** Tonalidad a partir de los acordes detectados (más fiable en jazz que el perfil de notas). */
export function detectKeyFromChords(chords: { root: number; quality: string; dur: number }[]): { tonic: number; minor: boolean; confidence: number }[] {
  const MAJ: Record<number, string[]> = { 0: ['maj', 'maj7', '6'], 2: ['m', 'm7'], 4: ['m', 'm7'], 5: ['maj', 'maj7', '6'], 7: ['maj', '7'], 9: ['m', 'm7'], 11: ['m7b5', 'dim7'] };
  const MIN: Record<number, string[]> = { 0: ['m', 'm7', '6'], 2: ['m7b5'], 3: ['maj', 'maj7'], 5: ['m', 'm7'], 7: ['7', 'maj', 'm', 'm7'], 8: ['maj', 'maj7', '7'], 10: ['7', 'maj'] };
  const out: { tonic: number; minor: boolean; confidence: number }[] = [];
  const total = chords.reduce((a, c) => a + c.dur, 0) || 1;
  for (let t = 0; t < 12; t++) for (const minor of [false, true]) {
    const tbl = minor ? MIN : MAJ;
    let s = 0;
    chords.forEach((c, i) => {
      const deg = (c.root - t + 12) % 12;
      const fit = tbl[deg]?.includes(c.quality) ? 1 : tbl[deg] ? 0.4 : -0.3;
      s += fit * c.dur;
      if (deg === 0 && fit === 1) s += 0.6 * c.dur; // la tónica pesa más
      const prev = chords[i - 1];
      if (prev && deg === 0 && (prev.root - t + 12) % 12 === 7) s += 1; // cadencia V → I
      if (i === chords.length - 1 && deg === 0) s += 0.5;
    });
    out.push({ tonic: t, minor, confidence: s / total });
  }
  return out.sort((a, b) => b.confidence - a.confidence);
}

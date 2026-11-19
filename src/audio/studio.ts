// Estudio de transcripción: carga de audio, cambio de velocidad/tono offline (SoundTouch, MPL-2.0),
// análisis de tonalidad/tempo/acordes (analysis.ts) y transcripción de notas (Basic Pitch, Apache-2.0).
import { SoundTouch, Stretch } from '@soundtouchjs/core';
import { Tone } from './engine';
import { chordSequence, detectKey, detectKeyFromChords, estimateTempo, frameAnalysis, meanChroma, toMono, trackBeats, PC_NAMES } from './analysis';

export async function decodeAudio(data: ArrayBuffer): Promise<AudioBuffer> {
  const ctx = Tone.getContext().rawContext as BaseAudioContext;
  return await ctx.decodeAudioData(data.slice(0));
}

const yieldUI = () => new Promise((r) => setTimeout(r, 0));

interface Pipe { inputBuffer: { putSamples(s: Float32Array, p?: number, n?: number): void } | null; outputBuffer: { frameCount: number; extract(o: Float32Array, p?: number, n?: number): void; receive(n?: number): void } | null; process(): void }

export async function runPipe(pipe: Pipe, inter: Float32Array, frames: number, onProgress?: (p: number) => void): Promise<Float32Array> {
  const out: Float32Array[] = [];
  let outFrames = 0;
  const CH = 8192;
  const drain = () => {
    const ob = pipe.outputBuffer!;
    while (ob.frameCount > 0) {
      const n = ob.frameCount;
      const tmp = new Float32Array(n * 2);
      ob.extract(tmp, 0, n);
      ob.receive(n);
      out.push(tmp);
      outFrames += n;
    }
  };
  for (let pos = 0; pos < frames; pos += CH) {
    const n = Math.min(CH, frames - pos);
    pipe.inputBuffer!.putSamples(inter, pos, n);
    pipe.process();
    drain();
    if ((pos / CH) % 16 === 0) { onProgress?.(pos / frames); await yieldUI(); }
  }
  // vaciar la cola con silencio
  const pad = new Float32Array(CH * 2);
  for (let k = 0; k < 4; k++) { pipe.inputBuffer!.putSamples(pad, 0, CH); pipe.process(); drain(); }
  const res = new Float32Array(outFrames * 2);
  let o = 0;
  for (const c of out) { res.set(c, o); o += c.length; }
  return res;
}

/** Devuelve una copia con otra velocidad (sin cambiar tono) y/o otro tono (sin cambiar velocidad). */
export async function stretchBuffer(buf: AudioBuffer, speed: number, semitones: number, onProgress?: (p: number) => void): Promise<AudioBuffer> {
  if (Math.abs(speed - 1) < 1e-3 && semitones === 0) return buf;
  const frames = buf.length;
  const L = buf.getChannelData(0);
  const R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
  let inter = new Float32Array(frames * 2);
  for (let i = 0; i < frames; i++) { inter[2 * i] = L[i]; inter[2 * i + 1] = R[i]; }
  let n = frames;
  if (semitones !== 0) {
    const st = new SoundTouch({ sampleRate: buf.sampleRate });
    st.pitchSemitones = semitones;
    inter = await runPipe(st as unknown as Pipe, inter, n, (p) => onProgress?.(p * (Math.abs(speed - 1) > 1e-3 ? 0.5 : 1)));
    n = Math.min(frames, inter.length / 2);
  }
  if (Math.abs(speed - 1) > 1e-3) {
    const sp = new Stretch({ sampleRate: buf.sampleRate, createBuffers: true });
    sp.tempo = speed;
    inter = await runPipe(sp as unknown as Pipe, inter, n, (p) => onProgress?.(0.5 + p * 0.5));
    n = inter.length / 2;
  }
  const ctx = Tone.getContext().rawContext as BaseAudioContext;
  const target = Math.round(frames / speed);
  const out = ctx.createBuffer(2, Math.max(1, Math.min(target, n)), buf.sampleRate);
  const oL = out.getChannelData(0);
  const oR = out.getChannelData(1);
  for (let i = 0; i < out.length; i++) { oL[i] = inter[2 * i]; oR[i] = inter[2 * i + 1]; }
  return out;
}

export interface ChordSpan { start: number; end: number; root: number; quality: string }
export interface Analysis {
  key: { tonic: number; minor: boolean; name: string };
  bpm: number;
  beats: number[]; // segundos
  downbeatOffset: number; // índice del primer tiempo 1
  chords: ChordSpan[]; // por medio compás
  duration: number;
}

export async function analyzeAudio(buf: AudioBuffer, onProgress?: (p: number, label: string) => void): Promise<Analysis> {
  const chans = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i));
  onProgress?.(0.05, 'Preparando audio');
  await yieldUI();
  const sr = 11025;
  const mono = toMono(chans, buf.sampleRate, sr);
  onProgress?.(0.15, 'Detectando ataques y tempo');
  await yieldUI();
  const fine = frameAnalysis(mono, sr, 1024, 256);
  const tempo = estimateTempo(fine.onset, fine.hopSec, 70, 210);
  let beats = trackBeats(fine.onset, fine.hopSec, tempo.bpm);
  if (beats.length < 8) { beats = []; for (let t = 0; t < mono.length / sr; t += 60 / tempo.bpm) beats.push(t); }
  onProgress?.(0.45, 'Calculando armonía');
  await yieldUI();
  const coarse = frameAnalysis(mono, sr, 4096, 1024);
  // croma por tiempo (pulso)
  const fps = 1 / coarse.hopSec;
  const beatChroma: number[][] = [];
  const beatBass: number[][] = [];
  for (let i = 0; i + 1 < beats.length; i++) {
    beatChroma.push(meanChroma(coarse.chroma, beats[i] * fps, beats[i + 1] * fps));
    beatBass.push(meanChroma(coarse.bass, beats[i] * fps, beats[i + 1] * fps));
  }
  onProgress?.(0.7, 'Reconociendo acordes');
  await yieldUI();
  // acordes por medio compás: se suma el croma de cada par de pulsos y se elige el desfase (0–3)
  // que mejor explica el audio (las ventanas bien alineadas contienen un solo acorde)
  const sumRange = (arr: number[][], a: number, b: number) => { const o = new Array(12).fill(0); for (let k = a; k < b && k < arr.length; k++) for (let j = 0; j < 12; j++) o[j] += arr[k][j]; return o; };
  const halves = (off: number) => {
    const ch: number[][] = []; const bs: number[][] = []; const idx: number[] = [];
    for (let i = off; i + 2 <= beatChroma.length; i += 2) { ch.push(sumRange(beatChroma, i, i + 2)); bs.push(sumRange(beatBass, i, i + 1)); idx.push(i); }
    return { ch, bs, idx };
  };
  let bestOff = 0; let bestScore = -Infinity; let bestSeq: ReturnType<typeof chordSequence> = []; let bestIdx: number[] = [];
  for (let off = 0; off < 4; off++) {
    const h = halves(off);
    const seq = chordSequence(h.ch, h.bs, 0.04);
    let sc = seq.reduce((a, g) => a + g.score, 0) / Math.max(1, seq.length);
    // a igualdad, preferir que los cambios caigan al principio del compás (ventanas pares)
    let onBar = 0; let changes = 0;
    for (let k = 1; k < seq.length; k++) if (seq[k].root !== seq[k - 1].root || seq[k].quality !== seq[k - 1].quality) { changes++; if (k % 2 === 0) onBar++; }
    sc += changes ? (onBar / changes) * 0.05 : 0;
    if (sc > bestScore) { bestScore = sc; bestOff = off; bestSeq = seq; bestIdx = h.idx; }
  }
  const chords: ChordSpan[] = bestSeq.map((g, k) => ({ start: beats[bestIdx[k]], end: beats[Math.min(bestIdx[k] + 2, beats.length - 1)], root: g.root, quality: g.quality }));
  const durs = chords.map((c) => ({ root: c.root, quality: c.quality, dur: c.end - c.start }));
  const keyC = detectKeyFromChords(durs)[0];
  const total = coarse.chroma.reduce((a, c) => a.map((x, i) => x + c[i]), new Array(12).fill(0));
  const keyP = detectKey(total)[0];
  const key = keyC.confidence > 0.6 ? keyC : keyP;
  onProgress?.(1, 'Listo');
  return { key: { tonic: key.tonic, minor: key.minor, name: `${PC_NAMES[key.tonic]}${key.minor ? 'm' : ''}` }, bpm: Math.round(tempo.bpm), beats, downbeatOffset: bestOff, chords, duration: buf.duration };
}

export interface TNote { midi: number; start: number; dur: number; amp: number }

/** Transcripción de notas con Basic Pitch (modelo local, se carga al usarlo). */
export async function transcribeNotes(buf: AudioBuffer, from: number, to: number, onProgress?: (p: number) => void): Promise<TNote[]> {
  const [{ BasicPitch, outputToNotesPoly, addPitchBendsToNoteEvents, noteFramesToTime }, tf] = await Promise.all([import('@spotify/basic-pitch'), import('@tensorflow/tfjs')]);
  try { await tf.setBackend('webgl'); } catch { await tf.setBackend('cpu'); }
  await tf.ready();
  const chans = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i).subarray(Math.floor(from * buf.sampleRate), Math.floor(to * buf.sampleRate)));
  const mono = toMono(chans, buf.sampleRate, 22050);
  const bp = new BasicPitch(tf.loadGraphModel('./models/basic-pitch/model.json'));
  const frames: number[][] = [];
  const onsets: number[][] = [];
  const contours: number[][] = [];
  await bp.evaluateModel(mono, (f, o, c) => { frames.push(...f); onsets.push(...o); contours.push(...c); }, (p) => onProgress?.(p));
  const notes = noteFramesToTime(addPitchBendsToNoteEvents(contours, outputToNotesPoly(frames, onsets, 0.5, 0.3, 5, true, null, null, true)));
  return notes.map((n) => ({ midi: n.pitchMidi, start: n.startTimeSeconds + from, dur: n.durationSeconds, amp: n.amplitude })).sort((a, b) => a.start - b.start);
}

/** Elimina armónicos detectados como notas (8ª, 12ª, 15ª… de una nota más grave que suena a la vez). */
export function removeHarmonics(notes: TNote[]): TNote[] {
  const H = [12, 19, 24, 28, 31];
  return notes.filter((n) => !notes.some((m) => {
    const iv = n.midi - m.midi;
    if (m === n || !H.includes(iv)) return false;
    const overlap = m.start <= n.start + 0.08 && m.start + m.dur >= n.start + Math.min(0.1, n.dur / 2);
    // una 8ª exacta puede ser una duplicación real: solo se descarta si es claramente más débil
    return overlap && (iv === 12 ? n.amp < m.amp * 0.9 : m.amp >= n.amp * 0.6);
  }));
}

/** Melodía: la nota más aguda en cada momento (técnica "skyline"), sin armónicos. */
export function skyline(notes: TNote[], minAmp = 0.25): TNote[] {
  const ns = removeHarmonics(notes).filter((n) => n.amp >= minAmp).sort((a, b) => a.start - b.start || b.midi - a.midi);
  const out: TNote[] = [];
  for (const n of ns) {
    const last = out[out.length - 1];
    if (last && n.start < last.start + last.dur - 0.03) {
      if (n.midi > last.midi + 2) { last.dur = Math.max(0.05, n.start - last.start); out.push({ ...n }); }
      continue;
    }
    out.push({ ...n });
  }
  return out;
}

/** Convierte segundos a posición en tiempos usando los pulsos detectados. */
export function secToBeat(t: number, beats: number[]): number {
  if (beats.length < 2) return t * 2;
  if (t <= beats[0]) return (t - beats[0]) / (beats[1] - beats[0]);
  for (let i = 0; i + 1 < beats.length; i++) if (t < beats[i + 1]) return i + (t - beats[i]) / (beats[i + 1] - beats[i]);
  const last = beats.length - 1;
  return last + (t - beats[last]) / (beats[last] - beats[last - 1]);
}

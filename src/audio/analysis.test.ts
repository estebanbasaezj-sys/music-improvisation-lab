import { describe, expect, it } from 'vitest';
import { chordScores, chordSequence, detectKey, detectKeyFromChords, estimateTempo, frameAnalysis, trackBeats, PC_NAMES } from './analysis';

const SR = 11025;
const tone = (buf: Float32Array, midi: number, t0: number, t1: number, amp = 0.2) => {
  const f = 440 * 2 ** ((midi - 69) / 12);
  for (let i = Math.floor(t0 * SR); i < Math.min(buf.length, t1 * SR); i++) {
    const t = i / SR - t0;
    const env = Math.min(1, t * 50) * Math.exp(-t * 1.5);
    buf[i] += amp * env * (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(4 * Math.PI * f * t) + 0.2 * Math.sin(6 * Math.PI * f * t));
  }
};

describe('análisis de audio', () => {
  it('reconoce acordes sintéticos', () => {
    const cases: [number[], string][] = [[[48, 52, 55, 60, 64], 'C maj'], [[50, 53, 57, 60, 65], 'D m7'], [[43, 47, 50, 53, 59], 'G 7'], [[45, 48, 52, 57, 60], 'A m'], [[41, 45, 48, 52, 57], 'F maj7']];
    for (const [notes, want] of cases) {
      const buf = new Float32Array(SR * 2);
      notes.forEach((m) => tone(buf, m, 0, 2));
      const fr = frameAnalysis(buf, SR);
      const sum = fr.chroma.reduce((a, c) => a.map((x, i) => x + c[i]), new Array(12).fill(0));
      const bs = fr.bass.reduce((a, c) => a.map((x, i) => x + c[i]), new Array(12).fill(0));
      const g = chordScores(sum, bs)[0];
      expect(`${PC_NAMES[g.root]} ${g.quality}`).toBe(want);
    }
  });
  it('secuencia ii-V-I y tonalidad', () => {
    const buf = new Float32Array(SR * 6);
    const prog = [[50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59]];
    prog.forEach((ns, k) => ns.forEach((m) => tone(buf, m, k * 2, k * 2 + 2)));
    const fr = frameAnalysis(buf, SR);
    const seq = chordSequence(fr.chroma, fr.bass);
    const at = (sec: number) => seq[Math.floor(sec / fr.hopSec)];
    expect(`${PC_NAMES[at(1).root]}${at(1).quality}`).toBe('Dm7');
    expect(`${PC_NAMES[at(3).root]}${at(3).quality}`).toBe('G7');
    expect(`${PC_NAMES[at(5).root]}${at(5).quality}`).toBe('Cmaj7');
    const key = detectKeyFromChords([{ root: 2, quality: 'm7', dur: 2 }, { root: 7, quality: '7', dur: 2 }, { root: 0, quality: 'maj7', dur: 2 }])[0];
    expect(PC_NAMES[key.tonic]).toBe('C');
    // perfil de notas: una pieza en La menor
    const sumMin = new Array(12).fill(0);
    [9, 11, 0, 2, 4, 5, 7, 9, 9, 4, 0].forEach((p) => (sumMin[p] += 1));
    expect(detectKey(sumMin)[0]).toMatchObject({ tonic: 9, minor: true });
  });
  it('tempo y pulsos de una pista de clics', () => {
    for (const bpm of [90, 120, 150]) {
      const buf = new Float32Array(SR * 12);
      for (let t = 0.3; t < 12; t += 60 / bpm) tone(buf, 84, t, t + 0.08, 0.5);
      const fr = frameAnalysis(buf, SR, 1024, 256);
      const tp = estimateTempo(fr.onset, fr.hopSec);
      const ratio = tp.bpm / bpm;
      expect([0.5, 1, 2].some((r) => Math.abs(ratio - r) < 0.04), `${bpm} → ${tp.bpm}`).toBe(true);
      const beats = trackBeats(fr.onset, fr.hopSec, bpm);
      const iois = beats.slice(1).map((b, i) => b - beats[i]);
      const med = iois.sort((a, b) => a - b)[Math.floor(iois.length / 2)];
      expect(Math.abs(med - 60 / bpm)).toBeLessThan(0.03);
    }
  });
});

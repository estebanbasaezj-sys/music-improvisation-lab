import { describe, expect, it, vi } from 'vitest';
vi.mock('./engine', () => ({ Tone: {}, ensureAudio: vi.fn(), triggerNotes: vi.fn(), triggerDrum: vi.fn(), click: vi.fn(), swingRatio: () => 2 / 3, swingBeat: (b: number, r = 2 / 3) => (Math.abs(b - Math.floor(b) - 0.5) < 1e-6 ? Math.floor(b) + r : b) }));
import { compVoicings, generateBacking, swingBeat, walkingBass } from './backing';
import { PROGRESSIONS, realize, progressionById } from '../theory/progressions';
import { chordPcs } from '../theory/chords';
import { parseNote } from '../theory/notes';
import { SONGS } from '../content/songs';
import { parseChart } from '../theory/progressions';

const chordAt = (evts: ReturnType<typeof realize>, beat: number) => {
  let acc = 0;
  for (const e of evts) { if (beat < acc + e.beats) return e; acc += e.beats; }
  return evts[evts.length - 1];
};

describe('acompañamientos', () => {
  it('walking bass: fundamental en el tiempo 1 de cada acorde y rango correcto', () => {
    for (const p of PROGRESSIONS) for (const k of ['C', 'F', 'Bb', 'E']) {
      const ev = realize(p, parseNote(k));
      const bass = walkingBass(ev);
      let acc = 0;
      for (const e of ev) {
        const n = bass.find((b) => b.beat === acc)!;
        expect(((n.midis[0] % 12) + 12) % 12).toBe(chordPcs(e.chord)[0]);
        acc += e.beats;
      }
      for (const b of bass) { expect(b.midis[0]).toBeGreaterThanOrEqual(28); expect(b.midis[0]).toBeLessThanOrEqual(50); }
    }
  });
  it('el piano solo toca notas del acorde o tensiones 9/13', () => {
    for (const s of SONGS) {
      const ev = parseChart(s.chart);
      const vs = compVoicings(ev);
      ev.forEach((e, i) => {
        const allowed = new Set([...chordPcs(e.chord), (chordPcs(e.chord)[0] + 2) % 12, (chordPcs(e.chord)[0] + 1) % 12, (chordPcs(e.chord)[0] + 9) % 12]);
        for (const m of vs[i]) expect(allowed.has(m % 12), `${s.title} ${i}`).toBe(true);
      });
    }
  });
  it('los eventos del piano y bajo caen dentro del acorde que corresponde', () => {
    for (const style of ['swing', 'blues', 'ballad', 'bossa', 'funk'] as const) {
      const ev = realize(progressionById('iiVI'), parseNote('C'));
      const notes = generateBacking(ev, style);
      const total = ev.reduce((s, e) => s + e.beats, 0);
      for (const n of notes) {
        if (n.part === 'comp' && n.beat >= total - 0.5) continue; // anticipación del siguiente chorus
        expect(n.beat).toBeGreaterThanOrEqual(0);
        expect(n.beat).toBeLessThan(total);
        if (n.part === 'comp' || n.part === 'gtr') {
          // vale el acorde que suena o, si es una anticipación (contratiempo), el siguiente
          const fits = (c: (typeof ev)[number]['chord']) => {
            const r = chordPcs(c)[0];
            const ok = new Set([...chordPcs(c), (r + 2) % 12, (r + 9) % 12, (r + 1) % 12]);
            return n.midis.every((m) => ok.has(m % 12));
          };
          expect(fits(chordAt(ev, n.beat).chord) || (n.beat % 1 !== 0 && fits(chordAt(ev, n.beat + 0.5).chord))).toBe(true);
        }
      }
    }
  });
  it('el acompañamiento trae teclado y guitarra por separado para el mezclador', () => {
    for (const style of ['swing', 'blues', 'ballad', 'bossa', 'funk'] as const) {
      const notes = generateBacking(realize(progressionById('iiVI'), parseNote('F')), style);
      expect(notes.some((n) => n.part === 'comp'), style).toBe(true);
      expect(notes.some((n) => n.part === 'gtr'), style).toBe(true);
      expect(notes.some((n) => n.part === 'bass'), style).toBe(true);
      expect(notes.some((n) => n.part === 'drum'), style).toBe(true);
    }
  });
  it('swing ternario', () => {
    expect(swingBeat(1.5)).toBeCloseTo(1 + 2 / 3);
    expect(swingBeat(2)).toBe(2);
  });
});

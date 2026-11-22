import { describe, expect, it } from 'vitest';
import { Level, WAYS, WayRequest, generateWay, hasResolvingDominant, wayAvailable } from './ways';
import { PROGRESSIONS, realize } from './progressions';
import { CADENCES, cadenceEvents } from './cadence';
import { chordNotes, chordSymbol } from './chords';
import { noteName, parseNote, pc } from './notes';
import { scaleById } from './scales';
import { availableTensions, chordStarts } from './line';

const names = { note: (n: Parameters<typeof noteName>[0]) => noteName(n), chord: chordSymbol };
const progs = [
  ...PROGRESSIONS.map((p) => ({ id: p.id, events: (k: string) => realize(p, parseNote(k)), minor: !!p.minor, blues: ['blues12', 'jazzBlues', 'minorBlues'].includes(p.id) })),
  ...CADENCES.map((c) => ({ id: `cad-${c.id}`, events: (k: string) => cadenceEvents(c, parseNote(k)), minor: !!c.minor, blues: !!c.blues })),
];
const req = (p: (typeof progs)[number], key: string, level: Level, range = { lo: 47, hi: 70 }, seed = 1): WayRequest => ({
  events: p.events(key), keyRoot: parseNote(key), minor: p.minor, blues: p.blues, range, level, seed, names,
  scaleName: (s) => `${noteName(s.root)} ${scaleById(s.scale).name}`,
});

describe('generador de solos por formas de tocar', () => {
  it('cada forma genera líneas válidas en todos los niveles, progresiones y tonalidades', () => {
    let built = 0;
    for (const p of progs) for (const key of ['C', 'Bb', 'F#']) for (const level of [1, 2, 3, 4, 5] as Level[]) for (const range of [{ lo: 47, hi: 70 }, { lo: 58, hi: 82 }]) {
      const r0 = req(p, key, level, range, level + key.length);
      const T = r0.events.reduce((s, e) => s + e.beats, 0);
      for (const w of WAYS) {
        const tag = `${p.id} ${key} N${level} ${range.lo} ${w.id}`;
        const av = wayAvailable(w.id, r0);
        let r; try { r = generateWay(w.id, r0); } catch (e) { throw new Error(`${tag}: ${(e as Error).message}`); }
        if (!av.ok) { expect(r, tag).toBeNull(); continue; }
        expect(r, tag).not.toBeNull();
        built++;
        expect(r!.notes.length, tag).toBeGreaterThan(1);
        expect(r!.phrases.length, tag).toBeGreaterThan(0);
        r!.notes.forEach((n, i) => {
          expect(Number.isFinite(n.midi), tag).toBe(true);
          expect(n.midi, tag).toBeGreaterThanOrEqual(range.lo);
          expect(n.midi, tag).toBeLessThanOrEqual(range.hi);
          expect(n.dur, tag).toBeGreaterThan(0);
          expect(n.start + n.dur, tag).toBeLessThanOrEqual(T + 1e-9);
          if (i > 0) expect(n.start, tag).toBeGreaterThanOrEqual(r!.notes[i - 1].start + r!.notes[i - 1].dur - 1e-9);
        });
      }
    }
    expect(built).toBeGreaterThan(2000);
  });

  it('el nivel cambia el ritmo: blancas y notas del acorde (1), negras (2), corcheas (3)', () => {
    const p = progs.find((x) => x.id === 'iiVI')!;
    const evts = p.events('C');
    const st = chordStarts(evts);
    const chordAtT = (t: number) => { let i = 0; while (i + 1 < st.length && st[i + 1] <= t + 1e-9) i++; return evts[i].chord; };
    for (const w of ['tonalidad', 'modos', 'terceras', 'arpegios'] as const) {
      const l1 = generateWay(w, req(p, 'C', w === 'terceras' ? 2 : 1))!;
      if (w !== 'terceras') for (const n of l1.notes) {
        expect(n.start % 2, `${w} N1 ${n.start}`).toBeCloseTo(0);
        // nivel 1: notas del acorde o tensiones disponibles (nunca la 4ª sobre un acorde mayor, por ejemplo)
        const c = chordAtT(n.start);
        const rel = (n.midi - pc(c.root) + 120) % 12;
        const ok = chordNotes(c).map(pc).includes(n.midi % 12) || (availableTensions(c).includes(({ 1: 'b9', 2: '9', 3: '#9', 5: '11', 6: '#11', 8: 'b13', 9: '13' } as Record<number, string>)[rel] ?? '-'));
        expect(ok, `${w} N1 ${n.start} ${n.midi}`).toBe(true);
      }
      const l2 = generateWay(w, req(p, 'C', 2))!;
      for (const n of l2.notes) expect(n.start % 1, `${w} N2`).toBeCloseTo(0);
      const l3 = generateWay(w, req(p, 'C', 3))!;
      expect(l3.notes.some((n) => Math.abs(n.start % 1 - 0.5) < 1e-6), `${w} N3`).toBe(true);
    }
  });

  it('niveles 4 y 5 agregan aproximaciones y enclosures en los cambios de acorde', () => {
    const p = progs.find((x) => x.id === 'turnaround' || x.id === 'cad-turnaround')!;
    const l4 = generateWay('modos', req(p, 'C', 4))!;
    expect(l4.notes.some((n) => n.tech === 'below')).toBe(true);
    const l5 = generateWay('modos', req(p, 'C', 5))!;
    expect(l5.notes.some((n) => n.tech === 'enclosure')).toBe(true);
  });

  it('respeta lo que cada forma necesita', () => {
    const vamp = progs.find((x) => x.id === 'dorianVamp')!;
    expect(hasResolvingDominant(vamp.events('D'))).toBe(false);
    expect(wayAvailable('b9', { events: vamp.events('D'), level: 5 }).ok).toBe(false);
    expect(wayAvailable('bebop', { events: vamp.events('D'), level: 2 }).reason).toMatch(/nivel 3/);
    const blues = progs.find((x) => x.id === 'blues12')!;
    expect(hasResolvingDominant(blues.events('F'))).toBe(true);
  });

  it('la mezcla usa varias formas distintas y es reproducible', () => {
    const p = progs.find((x) => x.id === 'blues12')!;
    const a = generateWay('mezcla', req(p, 'F', 3, undefined, 7))!;
    const b = generateWay('mezcla', req(p, 'F', 3, undefined, 7))!;
    expect(a.notes).toEqual(b.notes);
    expect(new Set(a.parts!.map((x) => x.way)).size).toBeGreaterThan(1);
  });

  it('la figura elegida (negra, corchea, semicorchea) cambia el ritmo de las formas de escala y arpegio', () => {
    const p = progs.find((x) => x.id === 'iiVI')!;
    for (const w of ['tonalidad', 'modos', 'arpegios', 'triesc', 'grupos'] as const) for (const figure of ['q', 'e', 's'] as const) {
      const r = generateWay(w, { ...req(p, 'C', 3), figure })!;
      expect(r.figureApplied, `${w} ${figure}`).toBe(true);
      const unit = figure === 'q' ? 1 : figure === 'e' ? 0.5 : 0.25;
      expect(r.notes.some((n) => Math.abs(n.dur - unit) < 1e-6), `${w} ${figure}`).toBe(true);
      const T = r.notes.length && 16;
      r.notes.forEach((n, i) => { expect(n.start + n.dur).toBeLessThanOrEqual(T + 1e-9); if (i) expect(n.start).toBeGreaterThanOrEqual(r.notes[i - 1].start + r.notes[i - 1].dur - 1e-9); });
    }
    expect(generateWay('motivo', { ...req(p, 'C', 3), figure: 's' })!.figureApplied).toBe(false);
  });
});

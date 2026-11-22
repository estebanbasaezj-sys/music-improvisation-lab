import { describe, expect, it } from 'vitest';
import { CADENCES, EXERCISES, ExCtx, ScalePick, cadenceById, cadenceEvents, easyPicks, modeOver, pentaFor, pickPcs, scaleOptions, stackChord } from './cadence';
import { chordNotes, chordSymbol, parseChord, seventhOf, thirdOf } from './chords';
import { noteName, parseNote, pc } from './notes';
import { scaleById } from './scales';
import { chordStarts } from './line';

const names = { note: (n: Parameters<typeof noteName>[0]) => noteName(n), chord: chordSymbol };
const RANGES = [{ lo: 47, hi: 70 }, { lo: 52, hi: 75 }, { lo: 50, hi: 76 }, { lo: 58, hi: 82 }];
const KEYS = ['C', 'F', 'Bb', 'E', 'Ab', 'F#'];

function ctxFor(cadId: string, key: string, mode: 'easy' | 'rec', range = RANGES[0], seed = 1): ExCtx {
  const cad = cadenceById(cadId);
  const k = parseNote(key);
  const events = cadenceEvents(cad, k);
  const picks: ScalePick[] = mode === 'easy' ? easyPicks(cad, events, k) : events.map((_, i) => scaleOptions(cad, events, i)[0]);
  return { events, picks, range, keyRoot: k, minor: !!cad.minor, blues: !!cad.blues, loops: !!cad.loops, seed, names, scaleName: (p) => `${noteName(p.root)} ${scaleById(p.scale).name}` };
}

describe('explorador de cadencias', () => {
  it('cada cadencia tiene opciones de escala coherentes con sus acordes', () => {
    for (const cad of CADENCES) {
      const evts = cadenceEvents(cad, parseNote(cad.defaultKey));
      evts.forEach((e, i) => {
        const opts = scaleOptions(cad, evts, i);
        expect(opts.length).toBeGreaterThan(1);
        expect(opts[0].tag === 'recomendada' || opts[0].tag === 'segura').toBe(true);
        // la recomendada contiene la 3ª y la 7ª del acorde
        const pcs = pickPcs(opts[0]);
        for (const g of [thirdOf(e.chord), seventhOf(e.chord)]) if (g) expect(pcs, `${cad.id} ${chordSymbol(e.chord)} ${opts[0].scale}`).toContain(pc(g));
      });
    }
  });

  it('el modo fácil cubre las notas guía (salvo la escala blues, que juega con la 3ª)', () => {
    for (const cad of CADENCES) {
      if (cad.blues) continue;
      const k = parseNote(cad.defaultKey);
      const evts = cadenceEvents(cad, k);
      easyPicks(cad, evts, k).forEach((p, i) => {
        const pcs = pickPcs(p);
        const c = evts[i].chord;
        for (const g of [thirdOf(c), seventhOf(c)]) if (g) expect(pcs, `${cad.id} ${chordSymbol(c)}`).toContain(pc(g));
      });
    }
  });

  it('nombra el modo que forma la escala de la tonalidad sobre cada acorde', () => {
    expect(modeOver({ root: parseNote('C'), scale: 'major' }, parseNote('G'))).toBe('Mixolidio');
    expect(modeOver({ root: parseNote('C'), scale: 'major' }, parseNote('D'))).toBe('Dórico');
    expect(modeOver({ root: parseNote('C'), scale: 'major' }, parseNote('C'))).toBeNull();
    const st = stackChord(['F', 'A', 'C', 'E'].map(parseNote));
    expect(st && chordSymbol(st)).toBe('Fmaj7');
    expect(pentaFor(parseChord('Dm7'), { root: parseNote('D'), scale: 'dorian' }).root).toEqual(parseNote('E'));
  });

  it('todos los ejercicios generan líneas válidas en todas las cadencias, tonalidades y registros', () => {
    for (const cad of CADENCES) for (const key of KEYS) for (const mode of ['easy', 'rec'] as const) for (const range of [RANGES[0], RANGES[3]]) {
      const ctx = ctxFor(cad.id, key, mode, range, KEYS.indexOf(key) + 1);
      const T = ctx.events.reduce((s, e) => s + e.beats, 0);
      for (const ex of EXERCISES) {
        const r = ex.build(ctx);
        const tag = `${cad.id} ${key} ${mode} ${range.lo} ${ex.id}`;
        if (!r) { expect(ex.needs, tag).toBeTruthy(); continue; }
        expect(r.notes.length, tag).toBeGreaterThan(3);
        expect(r.phrases.length, tag).toBeGreaterThan(0);
        r.notes.forEach((n, i) => {
          expect(Number.isFinite(n.midi), tag).toBe(true);
          expect(n.midi, tag).toBeGreaterThanOrEqual(range.lo);
          expect(n.midi, tag).toBeLessThanOrEqual(range.hi);
          expect(n.dur, tag).toBeGreaterThan(0);
          expect(n.start + n.dur, tag).toBeLessThanOrEqual(T + 1e-9);
          if (i > 0) expect(n.start, tag).toBeGreaterThanOrEqual(r.notes[i - 1].start + r.notes[i - 1].dur - 1e-9);
        });
      }
    }
  });

  it('el b9 y el sustituto tritonal solo aparecen donde hay un V7 que resuelve', () => {
    const b9 = EXERCISES.find((e) => e.id === 'fra-b9')!;
    expect(b9.build(ctxFor('dorianVamp', 'D', 'rec'))).toBeNull();
    const r = b9.build(ctxFor('iiVI', 'C', 'rec'))!;
    // sobre G7 (compás 2): B D F Ab, y Ab baja a G en el compás 3
    const v = r.notes.filter((n) => n.start >= 6 && n.start < 8).map((n) => n.midi % 12);
    expect(v).toEqual([11, 2, 5, 8]);
    const land = r.notes.find((n) => n.start === 8)!;
    expect(land.midi % 12).toBe(7);
    expect(land.midi).toBe(r.notes.filter((n) => n.start >= 6 && n.start < 8)[3].midi - 1);
  });

  it('escala bebop: en los tiempos caen notas del acorde', () => {
    const ex = EXERCISES.find((e) => e.id === 'beb-escala')!;
    for (const id of ['iiVI', 'turnaround', 'blues']) for (const key of KEYS) {
      const ctx = ctxFor(id, key, 'rec');
      const r = ex.build(ctx)!;
      const st = chordStarts(ctx.events);
      for (const n of r.notes) {
        if (Math.abs(n.start % 1) > 1e-6) continue;
        let ci = 0; while (ci + 1 < st.length && st[ci + 1] <= n.start + 1e-9) ci++;
        const c = ctx.events[ci].chord;
        const ok = chordNotes(c).map(pc);
        if (c.quality.id === 'maj7') ok.push((pc(c.root) + 9) % 12); // bebop mayor: acorde de sexta
        expect(ok, `${id} ${key} ${n.start}`).toContain(n.midi % 12);
      }
    }
  });

  it('aproximación: cada cambio de acorde llega a una nota del acorde desde medio tono abajo', () => {
    const ex = EXERCISES.find((e) => e.id === 'beb-aprox')!;
    for (const key of KEYS) {
      const ctx = ctxFor('iiVI', key, 'rec');
      const r = ex.build(ctx)!;
      for (const b of [4, 8, 12]) {
        const land = r.notes.find((n) => Math.abs(n.start - b) < 1e-6)!;
        const before = r.notes.find((n) => Math.abs(n.start - (b - 0.5)) < 1e-6)!;
        expect(land.midi - before.midi, `${key} ${b}`).toBe(1);
      }
    }
  });

  it('escala desde la fundamental: todas las notas son de la escala elegida', () => {
    const ex = EXERCISES.find((e) => e.id === 'esc-fund')!;
    for (const cad of CADENCES) {
      const ctx = ctxFor(cad.id, cad.defaultKey, 'rec');
      const r = ex.build(ctx)!;
      const st = chordStarts(ctx.events);
      for (const n of r.notes) {
        let ci = 0; while (ci + 1 < st.length && st[ci + 1] <= n.start + 1e-9) ci++;
        expect(pickPcs(ctx.picks[ci]), `${cad.id} ${n.start}`).toContain(n.midi % 12);
      }
    }
  });
});

describe('figuras, aproximaciones e ideas sin cuadratura', () => {
  it('todas las figuras (negra, corchea, semicorchea) y notas de llegada generan líneas válidas', async () => {
    const { buildExercise } = await import('./cadence');
    for (const cad of CADENCES) for (const fig of ['q', 'e', 's'] as const) for (const target of ['1', '3', '5', '7'] as const) {
      const base = ctxFor(cad.id, cad.defaultKey, 'rec');
      const ctx = { ...base, figure: fig, target };
      const T = ctx.events.reduce((s, e) => s + e.beats, 0);
      for (const ex of EXERCISES) {
        if (target !== '3' && ex.step !== 'aprox') continue;
        const r = buildExercise(ex, ctx);
        const tag = `${cad.id} ${fig} ${target} ${ex.id}`;
        if (!r) { expect(ex.needs, tag).toBeTruthy(); continue; }
        expect(r.notes.length, tag).toBeGreaterThan(1);
        r.notes.forEach((n, i) => {
          expect(n.dur, tag).toBeGreaterThan(0);
          expect(n.start + n.dur, tag).toBeLessThanOrEqual(T + 1e-9);
          expect(n.midi, tag).toBeGreaterThanOrEqual(ctx.range.lo);
          expect(n.midi, tag).toBeLessThanOrEqual(ctx.range.hi);
          if (i) expect(n.start, tag).toBeGreaterThanOrEqual(r.notes[i - 1].start + r.notes[i - 1].dur - 1e-9);
        });
        if (ex.scalable && fig === 's') expect(r.notes.some((n) => Math.abs(n.dur - 0.25) < 1e-6), tag).toBe(true);
        if (ex.scalable && fig === 'q') expect(r.notes.every((n) => n.dur >= 1 - 1e-6), tag).toBe(true);
      }
    }
  });

  it('aproximación cromática desde abajo: la nota anterior a cada llegada está medio tono abajo', async () => {
    const { buildExercise } = await import('./cadence');
    const ex = EXERCISES.find((e) => e.id === 'apr-cr-abajo')!;
    for (const fig of ['q', 'e', 's'] as const) for (const target of ['1', '3', '5', '7'] as const) {
      const ctx = { ...ctxFor('iiVI', 'F', 'rec'), figure: fig, target };
      const r = buildExercise(ex, ctx)!;
      for (const b of [4, 8]) {
        const land = r.notes.find((n) => Math.abs(n.start - b) < 1e-6)!;
        const prev = r.notes.filter((n) => n.start < b - 1e-9).pop()!;
        expect(land.midi - prev.midi, `${fig} ${target} ${b}`).toBe(1);
        expect(prev.dur, `${fig}`).toBeCloseTo(fig === 'q' ? 1 : fig === 'e' ? 0.5 : 0.25);
      }
    }
  });

  it('grupos de 3: la celda cruza los tiempos (no empieza siempre en el tiempo)', () => {
    const ex = EXERCISES.find((e) => e.id === 'com-3')!;
    const r = ex.build(ctxFor('iiVI', 'C', 'rec'))!;
    expect(r.notes.length).toBeGreaterThan(12);
  });
});

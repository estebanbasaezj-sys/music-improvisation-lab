import { describe, expect, it } from 'vitest';
import { UNITS, nodesFor, resolveKey, unitsFor } from './curriculum';
import { checkTap, generateItem, rhythmOnsets, parsePattern, scoreRhythm } from './items';
import { fingeringFor, FINGERINGS } from './fingerings';
import { parsePitch, midi } from '../theory/notes';
import { progressionById } from '../theory/progressions';
import { songById } from '../content/songs';
import { phraseById } from '../content/phrases';
import { lessonById } from '../content/lessons';
import { GUITAR_TUNING_MIDI } from '../theory/instruments';

describe('currículo por niveles', () => {
  it('todas las unidades tienen contenido válido y referencias existentes', () => {
    const ids = new Set<string>();
    for (const u of UNITS) {
      expect(ids.has(u.id), u.id).toBe(false); ids.add(u.id);
      expect(u.items.length, u.id).toBeGreaterThan(0);
      expect(u.tips.length, u.id).toBeGreaterThan(0);
      if (u.play && 'progression' in u.play) progressionById(u.play.progression);
      if (u.play?.k === 'song') expect(songById(u.play.song)).toBeDefined();
      if (u.play?.k === 'phrase') expect(phraseById(u.play.phrase)).toBeDefined();
      for (const g of u.guide ?? []) expect(lessonById(g), `${u.id} guía ${g}`).toBeDefined();
      for (const it of u.items) if (it.t === 'call-response') it.phrases.forEach((p) => expect(phraseById(p), p).toBeDefined());
    }
  });
  it('cada instrumento tiene camino desde el nivel 0 hasta el 5', () => {
    for (const i of ['sax', 'guitar', 'piano'] as const) {
      const levels = new Set(unitsFor(i).map((u) => u.level));
      [0, 1, 2, 3, 4, 5].forEach((l) => expect(levels.has(l as 0), `${i} nivel ${l}`).toBe(true));
      expect(nodesFor(i).length).toBeGreaterThan(40);
    }
  });
  it('las notas de saxo tienen digitación; las de guitarra están en el mástil', () => {
    for (const u of UNITS.filter((x) => x.track === 'sax')) for (const it of u.items) {
      const notes = 'notes' in it ? it.notes : it.t === 'play-seq' ? it.seqs.flatMap((q) => q.notes) : [];
      notes.forEach((n) => expect(fingeringFor(n), `${u.id} ${n}`).toBeDefined());
    }
    for (const u of UNITS.filter((x) => x.track === 'guitar')) for (const it of u.items) {
      const notes = 'notes' in it ? it.notes : it.t === 'play-seq' ? it.seqs.flatMap((q) => q.notes) : [];
      notes.forEach((n) => expect(midi(parsePitch(n))).toBeGreaterThanOrEqual(GUITAR_TUNING_MIDI[0]));
    }
    expect(FINGERINGS.length).toBeGreaterThan(30);
  });
  it('todos los ejercicios se generan con una respuesta verificable', () => {
    for (const i of ['sax', 'guitar', 'piano'] as const) for (const u of unitsFor(i)) for (const spec of u.items) for (let seed = 1; seed <= 12; seed++) for (const diff of [1, 2, 3] as const) {
      const item = generateItem(spec, { instrument: i, sax: seed % 2 ? 'tenor' : 'alto', solfeo: seed % 3 === 0, seed, diff });
      expect(item.prompt.length).toBeGreaterThan(3);
      const a = item.answer;
      if (a.type === 'choice') {
        expect(a.correct, `${u.id} ${spec.t}`).toBeGreaterThanOrEqual(0);
        expect(a.correct).toBeLessThan(a.options.length);
        expect(new Set(a.options).size, `${u.id} ${spec.t} ${a.options}`).toBe(a.options.length);
        expect(a.options.length).toBeGreaterThanOrEqual(2);
      } else if (a.type === 'tap') expect(a.target.length).toBeGreaterThan(0);
      else if (a.type === 'mic-seq') expect(a.midis.length).toBeGreaterThan(0);
      else if (a.type === 'order') expect([...a.tiles].sort()).toEqual([...a.correct].sort());
      else if (a.type === 'pairs') expect(a.pairs.length).toBe(4);
      else if (a.type === 'rhythm') expect(a.onsets.length).toBeGreaterThan(0);
      if (item.audio) item.audio.seq.forEach((n) => (Array.isArray(n.midi) ? n.midi : [n.midi]).forEach((m) => { expect(m).toBeGreaterThan(20); expect(m).toBeLessThan(100); }));
    }
  });
  it('comprobaciones', () => {
    expect(checkTap({ type: 'tap', target: [0, 4, 7], mode: 'pc', multi: true }, [60, 64, 55])).toBe(true);
    expect(checkTap({ type: 'tap', target: [0, 4, 7], mode: 'pc', multi: true }, [60, 63, 55])).toBe(false);
    expect(checkTap({ type: 'tap', target: [62], mode: 'midi', multi: false }, [74])).toBe(false);
    const r = rhythmOnsets(parsePattern('q q h'));
    expect(r.onsets).toEqual([0, 1, 2]);
    expect(r.beats).toBe(4);
    expect(scoreRhythm([0, 1, 2], [0.05, 0.97, 2.1], 0.2).ok).toBe(true);
    expect(scoreRhythm([0, 1, 2], [0.05, 1.5, 2.1], 0.2).ok).toBe(false);
    expect(resolveKey('written:G', 'sax', 'tenor')).toBe('F');
    expect(resolveKey('written:G', 'sax', 'alto')).toBe('Bb');
    expect(resolveKey('written:G', 'piano', 'alto')).toBe('G');
  });
});

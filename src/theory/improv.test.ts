import { describe, expect, it } from 'vitest';
import { IDEAS, generateSolo, IdeaId } from './improv';
import { analyzeLine } from './line';
import { parseChart, progressionById, realize, ChordEvent } from './progressions';
import { parseNote, pc } from './notes';
import { SONGS } from '../content/songs';
import { scaleById, scaleNotes } from './scales';

const ctx: { name: string; ev: ChordEvent[]; key: string; blues: boolean; minor?: boolean }[] = [
  { name: 'blues F', ev: realize(progressionById('blues12'), parseNote('F')), key: 'F', blues: true },
  { name: 'jazz blues Bb', ev: realize(progressionById('jazzBlues'), parseNote('Bb')), key: 'Bb', blues: true },
  { name: 'minor blues C', ev: realize(progressionById('minorBlues'), parseNote('C')), key: 'C', blues: true, minor: true },
  { name: 'iiVI C', ev: realize(progressionById('iiVI'), parseNote('C')), key: 'C', blues: false },
  { name: 'iiVI min D', ev: realize(progressionById('iiVImin'), parseNote('D')), key: 'D', blues: false, minor: true },
  { name: 'rhythm A Bb', ev: realize(progressionById('rhythmA'), parseNote('Bb')), key: 'Bb', blues: false },
  ...SONGS.filter((s) => ['autumn-leaves', 'satin-doll', 'blue-bossa'].includes(s.id)).map((s) => ({ name: s.title, ev: parseChart(s.chart), key: s.key.replace(/m$/, ''), blues: false, minor: s.key.endsWith('m') })),
];
const ranges = [{ lo: 48, hi: 70 }, { lo: 53, hi: 77 }, { lo: 57, hi: 81 }];
const good = new Set(['guide', 'chord', 'tension']);

describe('generador de solos', () => {
  for (const c of ctx) {
    it(`ideas válidas sobre ${c.name}`, () => {
      const total = c.ev.reduce((s, e) => s + e.beats, 0);
      const stats: Record<string, { on: number; ok: number }> = {};
      for (const idea of IDEAS.map((i) => i.id) as IdeaId[]) {
        if (idea === 'blues' && !c.blues) continue;
        for (const level of [1, 2, 3] as const) for (let seed = 1; seed <= 6; seed++) for (const range of ranges) {
          const solo = generateSolo({ events: c.ev, keyRoot: parseNote(c.key), minor: c.minor, blues: c.blues, range, level, seed, idea });
          expect(solo.notes.length, `${idea}`).toBeGreaterThan(0);
          expect(solo.phrases.length).toBeGreaterThan(0);
          solo.phrases.forEach((p) => expect(p.text.length).toBeGreaterThan(5));
          for (let i = 0; i < solo.notes.length; i++) {
            const n = solo.notes[i];
            expect(n.midi).toBeGreaterThanOrEqual(range.lo);
            expect(n.midi).toBeLessThanOrEqual(range.hi);
            expect(n.dur).toBeGreaterThan(0);
            expect(n.start + n.dur).toBeLessThanOrEqual(total + 1e-9);
            if (i > 0) expect(n.start).toBeGreaterThanOrEqual(solo.notes[i - 1].start + solo.notes[i - 1].dur - 1e-9);
          }
          const an = analyzeLine(solo.notes, c.ev, { keyRoot: parseNote(c.key), blues: c.blues });
          const st = (stats[idea] ??= { on: 0, ok: 0 });
          an.forEach((a) => {
            if (idea === 'guide') expect(a.role, `guide ${a.label}`).toBe('guide');
            if (idea === 'arpeggios' && a.tech === 'arpegio') expect(good.has(a.role), `${c.name} arp ${a.label}`).toBe(true);
            if ((idea === 'targets' || idea === 'bebop') && a.tech === 'objetivo') expect(a.role, `${c.name} objetivo ${a.label}`).toBe('guide');
            if (idea === 'space') expect(good.has(a.role), `${c.name} space ${a.label}`).toBe(true);
            if (idea === 'motif' && a.tech === 'motivo') expect(good.has(a.role), `${c.name} motif ${a.label}`).toBe(true);
            if (idea === 'blues') {
              const allowed = new Set([...scaleNotes(parseNote(c.key), scaleById('blues')).map(pc), (pc(parseNote(c.key)) + 4) % 12]);
              expect(allowed.has(((a.midi % 12) + 12) % 12)).toBe(true);
            }
            if (a.start % 1 === 0) { st.on++; if (good.has(a.role)) st.ok++; }
          });
        }
      }
      // en tiempo fuerte predominan las notas del acorde (principio del lenguaje bebop)
      for (const [idea, s] of Object.entries(stats)) if (idea !== 'blues') expect(s.ok / s.on, `${c.name} ${idea} ${s.ok}/${s.on}`).toBeGreaterThan(0.8);
    });
  }
});

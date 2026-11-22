import { describe, expect, it } from 'vitest';
import { guitarFingerings } from './fingering';
import { GUITAR_TUNING_MIDI } from './instruments';
import { parseNote } from './notes';
import { scaleById, scalePitches } from './scales';
import { midi } from './notes';

const line = (scale: string, root: string, octave: number) => scalePitches({ ...parseNote(root), octave }, scaleById(scale)).map(midi);

describe('digitaciones de guitarra', () => {
  it('pentatónica mayor de Do: posición abierta y otras más arriba, cada nota en un solo lugar', () => {
    const ms = line('pentMajor', 'C', 3);
    const fs = guitarFingerings(ms);
    expect(fs.length).toBeGreaterThan(2);
    const open = fs[0];
    expect(open.from).toBe(0);
    // Do3 en la 5ª cuerda, traste 3
    expect(open.at.get(48)).toEqual({ string: 1, fret: 3 });
    for (const f of fs) {
      expect(f.at.size).toBe(new Set(ms).size);
      for (const [m, p] of f.at) {
        expect(GUITAR_TUNING_MIDI[p.string] + p.fret).toBe(m);
        expect(f.to - f.from).toBeLessThanOrEqual(5);
      }
      // ascendente: nunca vuelve a una cuerda más grave
      const strings = [...new Set(ms)].sort((a, b) => a - b).map((m) => f.at.get(m)!.string);
      strings.forEach((s, i) => { if (i) expect(s).toBeGreaterThanOrEqual(strings[i - 1]); });
    }
  });

  it('funciona para escalas de 7 y 8 notas en varias tonalidades', () => {
    for (const [sc, root] of [['major', 'G'], ['dorian', 'D'], ['bebopDominant', 'A'], ['blues', 'E'], ['harmonicMinor', 'F']] as const) {
      const ms = line(sc, root, root === 'E' ? 2 : 3);
      const fs = guitarFingerings(ms);
      expect(fs.length, `${root} ${sc}`).toBeGreaterThan(0);
    }
  });

  it('no inventa posiciones para notas más graves que la guitarra', () => {
    expect(guitarFingerings([30, 32])).toEqual([]);
  });
});

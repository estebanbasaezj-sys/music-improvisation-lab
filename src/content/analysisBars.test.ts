import { describe, expect, it } from 'vitest';
import { SONGS } from './songs';
import { barsForAnalysis } from './analysisBars';

describe('compases de cada frase del análisis', () => {
  it('Autumn Leaves apunta a los compases correctos', () => {
    const s = SONGS.find((x) => x.id === 'autumn-leaves')!;
    const r = s.analysis.map((a) => barsForAnalysis(a, s));
    expect(r[0]).toEqual([0, 3]); // Cm7–F7–Bbmaj7
    expect(r[1]).toEqual([0, 3]); // Ebmaj7 (compás 4)
    expect(r[2]).toEqual([4, 7]); // Am7b5–D7–Gm
    expect(r[3]).toEqual([24, 31]); // sección C
    expect(r[4]).toBeNull(); // toda la canción
  });
  it('números de compás explícitos', () => {
    const s = SONGS.find((x) => x.id === 'blues-f')!;
    expect(s.analysis.map((a) => barsForAnalysis(a, s))).toEqual([[0, 3], [4, 7], [7, 10], [8, 11]]);
  });
  it('todas las frases dan un rango válido o el tema entero', () => {
    for (const s of SONGS) for (const a of s.analysis) {
      const r = barsForAnalysis(a, s);
      if (r) { expect(r[0]).toBeGreaterThanOrEqual(0); expect(r[1]).toBeLessThan(s.bars); expect(r[1]).toBeGreaterThanOrEqual(r[0]); }
    }
  });
});

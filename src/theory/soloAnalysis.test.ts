import { describe, expect, it } from 'vitest';
import { analyzeSolo } from './soloAnalysis';
import { parseChart } from './progressions';
import { parseNote, noteName } from './notes';
import { chordSymbol } from './chords';

const names = { note: (n: Parameters<typeof noteName>[0]) => noteName(n, true), chord: chordSymbol };
const q = (midi: number, start: number, dur = 0.5) => ({ midi, start, dur });

describe('explicación del solo', () => {
  const evts = parseChart('Dm7 | G7 | Cmaj7 | Cmaj7 |');
  const line = [
    q(62, 0), q(65, 0.5), q(69, 1), q(72, 1.5), q(74, 2), q(72, 2.5), // arpegio de Dm7 desde la fundamental
    q(72, 3), q(70, 3.5), q(71, 4, 1), // encierro de B (3ª de G7) en el cambio de acorde
    q(65, 5), q(67, 5.5), q(69, 6), q(67, 6.5), q(65, 7), q(63, 7.5), // ... y aproximación cromática Re♯ → Mi
    q(64, 8, 1), q(60, 12), q(62, 12.5), q(64, 13), q(65, 13.5), q(67, 14), q(69, 14.5, 1), // escala de Do
  ];
  const r = analyzeSolo(line, evts, { keyRoot: parseNote('C'), minor: false, names });
  const ids = r.devices.map((d) => d.id);
  it('reconoce arpegio, encierro, aproximación cromática, notas guía y escala', () => {
    for (const id of ['arpeggio', 'enclosure', 'chromatic', 'guide', 'scale']) expect(ids, id).toContain(id);
    expect(r.devices.find((d) => d.id === 'enclosure')!.bars).toContain(1);
  });
  it('identifica el material de Do mayor / Re dórico y explica cada acorde', () => {
    expect(r.overall!.coverage).toBeGreaterThan(0.85);
    expect(r.overall!.scale).toMatch(/jónico|dórico|mixolidio|eólico|lidio|pentatónica/);
    expect(r.perChord.length).toBeGreaterThanOrEqual(3);
    expect(r.perChord[0].chord).toBe('Dm7');
    expect(r.perChord[0].scale).toMatch(/^D dórico|^D eólico|^D pentatónica/);
  });
  it('divide en frases por los silencios y propone qué practicar', () => {
    expect(r.phrases.length).toBe(2);
    expect(r.phrases[0].text).toMatch(/termina en/);
    expect(r.practice.length).toBeGreaterThanOrEqual(3);
  });
  it('con muy pocas notas no inventa un análisis', () => {
    const e = analyzeSolo([q(60, 0)], evts, { keyRoot: parseNote('C'), minor: false, names });
    expect(e.devices.length).toBe(0);
    expect(e.summary[0]).toMatch(/No hay notas suficientes/);
  });
});

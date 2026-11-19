import { describe, expect, it } from 'vitest';
import { TUNES, parseMelody } from './repertoire';
import { parseChart } from '../theory/progressions';
import { chordPcs } from '../theory/chords';

describe('repertorio', () => {
  it('ids únicos y al menos 30 temas', () => {
    expect(new Set(TUNES.map((t) => t.id)).size).toBe(TUNES.length);
    expect(TUNES.length).toBeGreaterThanOrEqual(30);
  });
  it('cada cifrado se interpreta y sus secciones cubren todos los compases sin huecos', () => {
    for (const t of TUNES) {
      const ev = parseChart(t.chart);
      const bars = Math.max(...ev.map((e) => e.bar)) + 1;
      expect(t.sections[0].fromBar, t.title).toBe(0);
      t.sections.forEach((s, i) => { if (i) expect(s.fromBar, `${t.title} ${s.label}`).toBe(t.sections[i - 1].toBar + 1); });
      expect(t.sections[t.sections.length - 1].toBar + 1, t.title).toBe(bars);
      const formBars = /(\d+) compases/.exec(t.form);
      if (formBars) expect(bars, t.title).toBe(Number(formBars[1]));
    }
  });
  it('enlaces de YouTube con formato válido y sin repetir', () => {
    const ids = TUNES.flatMap((t) => t.recording.youtube.map((v) => v.id));
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{11}$/);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of TUNES) expect(t.recording.youtube.length, t.title).toBeGreaterThan(0);
    // al menos dos tercios de los temas tienen un video oficial que se puede ver dentro de la app
    expect(TUNES.filter((t) => t.recording.youtube.some((v) => v.embed)).length).toBeGreaterThanOrEqual(20);
  });
  it('solo los temas tradicionales traen melodía real, y esa melodía encaja con su armonía', () => {
    for (const t of TUNES) {
      if (!t.melody) continue;
      expect(t.tags).toContain('tradicional');
      const notes = parseMelody(t.melody.notes);
      const ev = parseChart(t.chart);
      const bars = Math.max(...ev.map((e) => e.bar)) + 1;
      expect(Math.max(...notes.map((n) => n.start + n.dur))).toBeLessThanOrEqual(bars * 4);
      // las notas largas (≥ 2 tiempos) deben ser notas del acorde o su 6ª/9ª
      for (const n of notes.filter((x) => x.dur >= 2)) {
        const c = ev.find((e) => e.bar === Math.floor(n.start / 4))!.chord;
        const r = chordPcs(c)[0];
        const ok = new Set([...chordPcs(c), (r + 2) % 12, (r + 9) % 12]);
        expect(ok.has(n.midi % 12), `${t.title} t=${n.start}`).toBe(true);
      }
    }
  });
  it('parseMelody rechaza compases que no suman 4 tiempos', () => {
    expect(() => parseMelody('C4:2 D4:1 |')).toThrow();
  });
});

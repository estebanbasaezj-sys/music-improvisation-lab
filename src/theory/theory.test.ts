import { describe, expect, it } from 'vitest';
import { IV, midi, noteName, parseNote, parsePitch, pitchName, transposeNote, transposePitch } from './notes';
import { SCALES, scaleById, scaleNotes, scalePitches, parentMajor } from './scales';
import { QUALITIES, chordNotes, chordSymbol, diatonicSevenths, guideToneLines, parseChord, voiceLead, voicing } from './chords';
import { PROGRESSIONS, analyze, parseChart, realize } from './progressions';
import { CHORD_SHAPES, concertKeyToWritten, concertToWrittenNote, concertToWrittenPitch, fingeringMatches, fingeringsFor, placeShape } from './instruments';
import { SONGS } from '../content/songs';

const names = (ns: { letter: number; acc: number }[]) => ns.map((n) => noteName(n)).join(' ');

describe('notas e intervalos', () => {
  it('ortografía interválica', () => {
    expect(noteName(transposeNote(parseNote('C'), IV.b3))).toBe('Eb');
    expect(noteName(transposeNote(parseNote('A'), IV['3']))).toBe('C#');
    expect(noteName(transposeNote(parseNote('Gb'), IV['4']))).toBe('Cb');
    expect(noteName(transposeNote(parseNote('B'), IV['#4']))).toBe('E#');
  });
  it('MIDI y octavas', () => {
    expect(midi(parsePitch('C4'))).toBe(60);
    expect(midi(parsePitch('A4'))).toBe(69);
    expect(pitchName(transposePitch(parsePitch('B3'), IV.b2))).toBe('C4');
    expect(midi(parsePitch('Cb4'))).toBe(59);
  });
});

describe('escalas', () => {
  it('escalas mayores en las 12 tonalidades tienen 7 letras distintas', () => {
    for (const k of ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']) {
      const ns = scaleNotes(parseNote(k), scaleById('major'));
      expect(new Set(ns.map((n) => n.letter)).size).toBe(7);
    }
  });
  it('valores conocidos', () => {
    expect(names(scaleNotes(parseNote('Eb'), scaleById('major')))).toBe('Eb F G Ab Bb C D');
    expect(names(scaleNotes(parseNote('A'), scaleById('pentMinor')))).toBe('A C D E G');
    expect(names(scaleNotes(parseNote('A'), scaleById('blues')))).toBe('A C D Eb E G');
    expect(names(scaleNotes(parseNote('C'), scaleById('pentMajor')))).toBe('C D E G A');
    expect(names(scaleNotes(parseNote('D'), scaleById('dorian')))).toBe('D E F G A B C');
    expect(names(scaleNotes(parseNote('F'), scaleById('lydian')))).toBe('F G A B C D E');
    expect(names(scaleNotes(parseNote('G'), scaleById('mixolydian')))).toBe('G A B C D E F');
    expect(names(scaleNotes(parseNote('B'), scaleById('locrian')))).toBe('B C D E F G A');
    expect(names(scaleNotes(parseNote('E'), scaleById('phrygian')))).toBe('E F G A B C D');
  });
  it('modos derivados de la escala madre', () => {
    for (const [root, mode] of [['D', 'dorian'], ['E', 'phrygian'], ['F', 'lydian'], ['G', 'mixolydian'], ['A', 'aeolian'], ['B', 'locrian']]) {
      expect(noteName(parentMajor(parseNote(root), mode))).toBe('C');
      const modeNotes = scaleNotes(parseNote(root), scaleById(mode)).map((n) => noteName(n)).sort();
      expect(modeNotes).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    }
  });
  it('alturas ascendentes', () => {
    const ps = scalePitches(parsePitch('G3'), scaleById('major'));
    const ms = ps.map(midi);
    expect(ms).toEqual([55, 57, 59, 60, 62, 64, 66, 67]);
    expect(SCALES.length).toBeGreaterThan(10);
  });
});

describe('acordes', () => {
  it('construcción', () => {
    expect(names(chordNotes(parseChord('Cmaj7')))).toBe('C E G B');
    expect(names(chordNotes(parseChord('Dm7')))).toBe('D F A C');
    expect(names(chordNotes(parseChord('G7')))).toBe('G B D F');
    expect(names(chordNotes(parseChord('Bm7b5')))).toBe('B D F A');
    expect(names(chordNotes(parseChord('Bdim7')))).toBe('B D F Ab');
    expect(names(chordNotes(parseChord('Ebmaj7')))).toBe('Eb G Bb D');
    expect(names(chordNotes(parseChord('F#m7')))).toBe('F# A C# E');
    expect(names(chordNotes(parseChord('Db7')))).toBe('Db F Ab Cb');
    expect(names(chordNotes(parseChord('G7b9')))).toBe('G B D F Ab');
    expect(names(chordNotes(parseChord('C13')))).toBe('C E G Bb D A');
  });
  it('parseo de símbolos', () => {
    for (const s of ['C', 'Cm', 'Cdim', 'Caug', 'C6', 'Cm6', 'Cmaj7', 'Cm7', 'C7', 'Cm7b5', 'Cdim7', 'C9', 'C13', 'C7b9', 'Bb7sus4']) {
      expect(chordSymbol(parseChord(s))).toBe(s.replace('7sus4', '7sus4'));
    }
  });
  it('diatónicos de C', () => {
    expect(diatonicSevenths(parseNote('C')).map(chordSymbol).join(' ')).toBe('Cmaj7 Dm7 Em7 Fmaj7 G7 Am7 Bm7b5');
  });
  it('voicings contienen las notas correctas', () => {
    const c = parseChord('Dm7');
    expect(voicing(c, 'root').map((p) => noteName(p)).join(' ')).toBe('D F A C');
    expect(voicing(c, 'inv1').map((p) => noteName(p)).join(' ')).toBe('F A C D');
    expect(voicing(c, 'rootlessA').map((p) => noteName(p)).join(' ')).toBe('F A C E');
    const g = parseChord('G7');
    expect(voicing(g, 'rootlessB').map((p) => noteName(p)).join(' ')).toBe('F A B D');
    const v = voicing(c, 'inv2').map(midi);
    for (let i = 1; i < v.length; i++) expect(v[i]).toBeGreaterThan(v[i - 1]);
  });
  it('conducción de voces ii-V-I mueve poco', () => {
    const vs = voiceLead(['Dm7', 'G7', 'Cmaj7'].map(parseChord));
    for (let i = 1; i < vs.length; i++) {
      const a = vs[i - 1].map(midi).sort((x, y) => x - y);
      const b = vs[i].map(midi).sort((x, y) => x - y);
      const move = a.reduce((s, m, j) => s + Math.abs(m - b[j]), 0);
      expect(move).toBeLessThanOrEqual(4);
    }
  });
  it('notas guía Dm7-G7-Cmaj7: F/C → F/B → E/B', () => {
    const { upper, lower } = guideToneLines(['Dm7', 'G7', 'Cmaj7'].map(parseChord));
    const pairs = upper.map((u, i) => [noteName(u), noteName(lower[i])].sort().join('/'));
    expect(pairs).toEqual(['C/F', 'B/F', 'B/E']);
  });
});

describe('guitarra', () => {
  it('todas las formas producen las notas del acorde en las 12 tonalidades', () => {
    const roots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    for (const shape of CHORD_SHAPES) {
      for (const r of roots) {
        const c = parseChord(r + (shape.quality === 'maj' ? '' : shape.quality));
        const f = placeShape(c, shape);
        expect(fingeringMatches(c, f), `${r}${shape.quality} ${shape.name} ${f.frets}`).toBe(true);
        expect(f.frets.every((x) => x === null || (x >= 0 && x <= 17))).toBe(true);
      }
    }
    expect(fingeringsFor(parseChord('G7')).length).toBeGreaterThan(2);
  });
  it('Gmaj7 drop 3 = 3x443x', () => {
    const f = fingeringsFor(parseChord('Gmaj7')).find((x) => x.shape.kind === 'drop3')!;
    expect(f.frets).toEqual([3, null, 4, 4, 3, null]);
  });
});

describe('saxofón', () => {
  it('transposición tenor (Si♭) y alto (Mi♭)', () => {
    expect(noteName(concertToWrittenNote(parseNote('C'), 'tenor'))).toBe('D');
    expect(noteName(concertToWrittenNote(parseNote('C'), 'alto'))).toBe('A');
    expect(noteName(concertToWrittenNote(parseNote('Bb'), 'tenor'))).toBe('C');
    expect(noteName(concertToWrittenNote(parseNote('Bb'), 'alto'))).toBe('G');
    expect(noteName(concertToWrittenNote(parseNote('Eb'), 'alto'))).toBe('C');
    expect(noteName(concertToWrittenNote(parseNote('F'), 'tenor'))).toBe('G');
    expect(noteName(concertKeyToWritten(parseNote('E'), 'tenor'))).toBe('F#');
    expect(noteName(concertKeyToWritten(parseNote('B'), 'alto'))).toBe('Ab');
    // altura: Bb3 de concierto en tenor = C5 escrito (9ª mayor arriba)
    expect(pitchName(concertToWrittenPitch(parsePitch('Bb3'), 'tenor'))).toBe('C5');
    // concierto C4 en alto = A4 escrito
    expect(pitchName(concertToWrittenPitch(parsePitch('C4'), 'alto'))).toBe('A4');
  });
});

describe('progresiones', () => {
  it('blues en F', () => {
    const ev = realize(PROGRESSIONS.find((p) => p.id === 'blues12')!, parseNote('F'));
    expect(ev.map((e) => chordSymbol(e.chord)).join(' ')).toBe('F7 Bb7 F7 F7 Bb7 Bb7 F7 F7 C7 Bb7 F7 C7');
  });
  it('ii-V-I en Bb y menor en C', () => {
    expect(realize(PROGRESSIONS.find((p) => p.id === 'iiVI')!, parseNote('Bb')).map((e) => chordSymbol(e.chord)).slice(0, 3).join(' ')).toBe('Cm7 F7 Bbmaj7');
    expect(realize(PROGRESSIONS.find((p) => p.id === 'iiVImin')!, parseNote('C')).map((e) => chordSymbol(e.chord)).slice(0, 3).join(' ')).toBe('Dm7b5 G7b9 Cm6');
  });
  it('análisis detecta ii-V-I', () => {
    const evts = parseChart('Cm7 | F7 | Bbmaj7 | Ebmaj7 | Am7b5 | D7 | Gm6 |');
    const labels = analyze(evts).map((m) => m.label);
    expect(labels[0]).toContain('ii-V-I → Bb');
    expect(labels.some((l) => l.includes('menor') && l.includes('G'))).toBe(true);
  });
  it('todas las progresiones y canciones se pueden interpretar en 12 tonalidades', () => {
    for (const p of PROGRESSIONS) for (const k of ['C', 'Db', 'F#', 'B']) expect(realize(p, parseNote(k)).length).toBeGreaterThan(0);
    for (const s of SONGS) {
      const ev = parseChart(s.chart);
      expect(ev.length).toBeGreaterThan(4);
      const bars = new Set(ev.map((e) => e.bar)).size;
      expect(bars, s.title).toBe(s.bars);
    }
  });
  it('todas las calidades tienen nombre', () => {
    for (const q of QUALITIES) expect(q.name.length).toBeGreaterThan(2);
  });
});

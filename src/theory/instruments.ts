// Datos específicos de instrumento derivados del motor común: transposición del saxo,
// afinación de guitarra y formas de acordes movibles.
import { Chord, chordPcs } from './chords';
import { IV, Interval, Note, Pitch, midi, pc, pitchFromMidi, simplify, transposeNote, transposePitch } from './notes';

export type InstrumentId = 'sax' | 'guitar' | 'piano';
export type SaxType = 'tenor' | 'alto';

export const INSTRUMENT_LABEL: Record<InstrumentId, string> = { sax: 'Saxofón', guitar: 'Guitarra', piano: 'Piano' };
export const INSTRUMENT_ICON: Record<InstrumentId, string> = { sax: '🎷', guitar: '🎸', piano: '🎹' };

/** Intervalo de concierto → escrito. Tenor (Si♭): suena una 9ª mayor por debajo de lo escrito.
 *  Alto (Mi♭): suena una 6ª mayor por debajo de lo escrito. */
export const SAX_TRANSPOSITION: Record<SaxType, { iv: Interval; label: string; key: string }> = {
  tenor: { iv: { semitones: 14, degree: 8 }, label: 'Saxo tenor en Si♭', key: 'Bb' },
  alto: { iv: { semitones: 9, degree: 5 }, label: 'Saxo alto en Mi♭', key: 'Eb' },
};

/** Nota de concierto → nota escrita para el saxo (sin octava). */
export function concertToWrittenNote(n: Note, sax: SaxType): Note {
  return simplify(transposeNote(n, SAX_TRANSPOSITION[sax].iv));
}
export function writtenToConcertNote(n: Note, sax: SaxType): Note {
  const iv = SAX_TRANSPOSITION[sax].iv;
  return simplify(transposeNote(n, { semitones: -iv.semitones, degree: -iv.degree }));
}
export function concertToWrittenPitch(p: Pitch, sax: SaxType): Pitch {
  const w = transposePitch(p, SAX_TRANSPOSITION[sax].iv);
  const s = simplify(w);
  return s === (w as Note) ? w : pitchFromMidi(midi(w), s);
}
export function writtenToConcertMidi(written: Pitch, sax: SaxType): number {
  return midi(written) - SAX_TRANSPOSITION[sax].iv.semitones;
}
/** Tonalidad escrita para el saxo dada una tonalidad de concierto (con ortografía de armadura razonable). */
export function concertKeyToWritten(key: Note, sax: SaxType, minor = false): Note {
  const w = transposeNote(key, SAX_TRANSPOSITION[sax].iv);
  const keys = minor ? ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'] : ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const preferred = keys[pc(w)];
  const letters = 'CDEFGAB';
  const pl = letters.indexOf(preferred[0]);
  return { letter: pl, acc: preferred.length > 1 ? (preferred[1] === '#' ? 1 : -1) : 0 };
}
/** Rango escrito cómodo para ejercicios (Si♭3 – Fa6 es el rango completo; usamos Re4–Re6). */
export const SAX_WRITTEN_COMFORT = { low: 62, high: 86 };

// ---------- Guitarra ----------
export const GUITAR_TUNING: Pitch[] = [
  { letter: 2, acc: 0, octave: 2 }, // E2 (6ª cuerda)
  { letter: 5, acc: 0, octave: 2 }, // A2
  { letter: 1, acc: 0, octave: 3 }, // D3
  { letter: 4, acc: 0, octave: 3 }, // G3
  { letter: 6, acc: 0, octave: 3 }, // B3
  { letter: 2, acc: 0, octave: 4 }, // E4 (1ª cuerda)
];
export const GUITAR_TUNING_MIDI = GUITAR_TUNING.map(midi); // [40,45,50,55,59,64]
export const fretMidi = (stringIdx: number, fret: number) => GUITAR_TUNING_MIDI[stringIdx] + fret;

/** Forma de acorde: desplazamientos de traste por cuerda (6ª→1ª) respecto a la fundamental; null = cuerda apagada. */
export interface ChordShape {
  quality: string;
  rootString: 6 | 5;
  offsets: (number | null)[];
  name: string;
  kind: 'drop3' | 'shell' | 'barre' | 'drop2';
}

const S = (quality: string, rootString: 6 | 5, offsets: (number | null)[], name: string, kind: ChordShape['kind']): ChordShape => ({ quality, rootString, offsets, name, kind });
const x = null;

export const CHORD_SHAPES: ChordShape[] = [
  // Shells (3 notas: 1-3-7 o 1-7-3) — lo primero que debe aprender un guitarrista de jazz
  S('maj7', 6, [0, x, 1, 1, x, x], 'Shell 1-7-3 (6ª cuerda)', 'shell'),
  S('m7', 6, [0, x, 0, 0, x, x], 'Shell 1-7-3 (6ª cuerda)', 'shell'),
  S('7', 6, [0, x, 0, 1, x, x], 'Shell 1-7-3 (6ª cuerda)', 'shell'),
  S('maj7', 5, [x, 0, x, 1, 2, x], 'Shell 1-3-7 (5ª cuerda)', 'shell'),
  S('m7', 5, [x, 0, x, 0, 1, x], 'Shell 1-b3-b7 (5ª cuerda)', 'shell'),
  S('7', 5, [x, 0, x, 0, 2, x], 'Shell 1-b7-3 (5ª cuerda)', 'shell'),
  // Drop 3 / cuatro notas
  S('maj7', 6, [0, x, 1, 1, 0, x], 'Drop 3 (6ª cuerda)', 'drop3'),
  S('m7', 6, [0, x, 0, 0, 0, x], 'Drop 3 (6ª cuerda)', 'drop3'),
  S('7', 6, [0, x, 0, 1, 0, x], 'Drop 3 (6ª cuerda)', 'drop3'),
  S('m7b5', 6, [0, x, 0, 0, -1, x], 'Drop 3 (6ª cuerda)', 'drop3'),
  S('dim7', 6, [0, x, -1, 0, -1, x], 'Drop 3 (6ª cuerda)', 'drop3'),
  S('6', 6, [0, x, -1, 1, 0, x], 'Drop 3 (6ª cuerda)', 'drop3'),
  S('13', 6, [0, x, 0, 1, 2, x], '13 (6ª cuerda)', 'drop3'),
  S('maj7', 5, [x, 0, 2, 1, 2, x], 'Drop 2 (5ª cuerda)', 'drop2'),
  S('m7', 5, [x, 0, 2, 0, 1, x], 'Drop 2 (5ª cuerda)', 'drop2'),
  S('7', 5, [x, 0, 2, 0, 2, x], 'Drop 2 (5ª cuerda)', 'drop2'),
  S('m7b5', 5, [x, 0, 1, 0, 1, x], 'Drop 2 (5ª cuerda)', 'drop2'),
  S('dim7', 5, [x, 0, 1, -1, 1, x], 'Drop 2 (5ª cuerda)', 'drop2'),
  S('9', 5, [x, 0, -1, 0, 0, x], '9 (5ª cuerda)', 'drop2'),
  S('m6', 5, [x, 0, -2, -1, -2, x], 'm6 (5ª cuerda)', 'drop2'),
  S('7b9', 5, [x, 0, -1, 0, -1, x], '7b9 (5ª cuerda)', 'drop2'),
  // Tríadas con cejilla (formas de rock conocidas)
  S('maj', 6, [0, 2, 2, 1, 0, 0], 'Cejilla forma de Mi', 'barre'),
  S('m', 6, [0, 2, 2, 0, 0, 0], 'Cejilla forma de Mi menor', 'barre'),
  S('maj', 5, [x, 0, 2, 2, 2, 0], 'Cejilla forma de La', 'barre'),
  S('m', 5, [x, 0, 2, 2, 1, 0], 'Cejilla forma de La menor', 'barre'),
  S('7', 6, [0, 2, 0, 1, 0, 0], 'Cejilla forma de Mi7', 'barre'),
  S('m7', 6, [0, 2, 0, 0, 0, 0], 'Cejilla forma de Mi m7', 'barre'),
];

export interface Fingering {
  frets: (number | null)[]; // 6 valores, índice 0 = 6ª cuerda
  shape: ChordShape;
  baseFret: number;
}

/** Ubica una forma movible para un acorde dado. */
export function placeShape(c: Chord, shape: ChordShape): Fingering {
  const sIdx = shape.rootString === 6 ? 0 : 1;
  let rootFret = (pc(c.root) - (GUITAR_TUNING_MIDI[sIdx] % 12) + 24) % 12;
  const minOff = Math.min(...shape.offsets.filter((o): o is number => o !== null));
  if (rootFret + minOff < 0) rootFret += 12;
  // formas con cejilla en traste 0 = acordes abiertos válidos; las demás preferimos traste ≥ 1
  if (rootFret + minOff === 0 && shape.kind !== 'barre') rootFret += 12;
  if (rootFret > 12 && rootFret + minOff - 12 >= 1) rootFret -= 12;
  const frets = shape.offsets.map((o) => (o === null ? null : rootFret + o));
  const used = frets.filter((f): f is number => f !== null && f > 0);
  return { frets, shape, baseFret: used.length ? Math.min(...used) : 1 };
}

export function fingeringsFor(c: Chord): Fingering[] {
  return CHORD_SHAPES.filter((s) => s.quality === c.quality.id).map((s) => placeShape(c, s));
}

export function fingeringMidis(f: Fingering): number[] {
  return f.frets.map((fr, i) => (fr === null ? null : fretMidi(i, fr))).filter((m): m is number => m !== null);
}

/** ¿Las notas de la digitación pertenecen al acorde? (validación musical). */
export function fingeringMatches(c: Chord, f: Fingering): boolean {
  const pcs = new Set(chordPcs(c));
  return fingeringMidis(f).every((m) => pcs.has(((m % 12) + 12) % 12));
}

export function noteAtFret(stringIdx: number, fret: number, spelling?: Note): Pitch {
  return pitchFromMidi(fretMidi(stringIdx, fret), spelling);
}

export { IV };

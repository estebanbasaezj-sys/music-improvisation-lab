// Motor de teoría: notas con ortografía correcta (letra + alteración), intervalos y transposición.
// Una nota se representa por su letra (0=C … 6=B) y su alteración (-2..+2), así "Gb" y "F#" son distintas.

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];

export interface Note {
  letter: number; // 0..6
  acc: number; // -2..2
}

/** Nota con altura absoluta (octava científica: C4 = do central = MIDI 60). */
export interface Pitch extends Note {
  octave: number;
}

export interface Interval {
  semitones: number;
  degree: number; // número de letras (0 = unísono, 2 = tercera, 4 = quinta …)
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

export function pc(n: Note): number {
  return mod(NATURAL_PC[n.letter] + n.acc, 12);
}

export function noteName(n: Note, unicode = false): string {
  const a = n.acc;
  const sharp = unicode ? '♯' : '#';
  const flat = unicode ? '♭' : 'b';
  const accStr = a > 0 ? sharp.repeat(a) : flat.repeat(-a);
  return LETTERS[n.letter] + accStr;
}

export function pitchName(p: Pitch, unicode = false): string {
  return noteName(p, unicode) + p.octave;
}

export function parseNote(s: string): Note {
  const m = /^([A-Ga-g])(##|bb|#|b|♯|♭|x)?/.exec(s.trim());
  if (!m) throw new Error(`Nota inválida: ${s}`);
  const letter = LETTERS.indexOf(m[1].toUpperCase() as (typeof LETTERS)[number]);
  const accMap: Record<string, number> = { '#': 1, '♯': 1, '##': 2, x: 2, b: -1, '♭': -1, bb: -2 };
  return { letter, acc: m[2] ? accMap[m[2]] : 0 };
}

export function parsePitch(s: string): Pitch {
  const m = /^([A-Ga-g](?:##|bb|#|b|x)?)(-?\d)$/.exec(s.trim());
  if (!m) throw new Error(`Altura inválida: ${s}`);
  return { ...parseNote(m[1]), octave: Number(m[2]) };
}

export function midi(p: Pitch): number {
  return (p.octave + 1) * 12 + NATURAL_PC[p.letter] + p.acc;
}

/** Transpone una nota (sin octava) conservando la ortografía interválica. */
export function transposeNote(n: Note, iv: Interval): Note {
  const letter = mod(n.letter + iv.degree, 7);
  const target = mod(pc(n) + iv.semitones, 12);
  let acc = mod(target - NATURAL_PC[letter], 12);
  if (acc > 6) acc -= 12;
  return { letter, acc };
}

/** Transpone una altura absoluta (octava correcta incluso en casos como B#3 → C4). */
export function transposePitch(p: Pitch, iv: Interval): Pitch {
  const n = transposeNote(p, iv);
  const targetMidi = midi(p) + iv.semitones;
  // octava = la que hace coincidir el MIDI con la letra/alteración elegidas
  const octave = Math.round((targetMidi - NATURAL_PC[n.letter] - n.acc) / 12) - 1;
  return { ...n, octave };
}

/** Construye una altura a partir de un número MIDI respetando una ortografía dada. */
export function pitchFromMidi(m: number, spelling?: Note): Pitch {
  const n = spelling ?? defaultSpelling(mod(m, 12));
  const octave = Math.round((m - NATURAL_PC[n.letter] - n.acc) / 12) - 1;
  return { ...n, octave };
}

const SHARP_SPELL: Note[] = [
  { letter: 0, acc: 0 }, { letter: 0, acc: 1 }, { letter: 1, acc: 0 }, { letter: 2, acc: -1 },
  { letter: 2, acc: 0 }, { letter: 3, acc: 0 }, { letter: 3, acc: 1 }, { letter: 4, acc: 0 },
  { letter: 5, acc: -1 }, { letter: 5, acc: 0 }, { letter: 6, acc: -1 }, { letter: 6, acc: 0 },
];
export function defaultSpelling(p: number): Note {
  return SHARP_SPELL[mod(p, 12)];
}

/** Intervalos por nombre de grado (notación de jazz). */
export const IV: Record<string, Interval> = {
  '1': { semitones: 0, degree: 0 },
  b2: { semitones: 1, degree: 1 },
  '2': { semitones: 2, degree: 1 },
  '#2': { semitones: 3, degree: 1 },
  b3: { semitones: 3, degree: 2 },
  '3': { semitones: 4, degree: 2 },
  '4': { semitones: 5, degree: 3 },
  '#4': { semitones: 6, degree: 3 },
  b5: { semitones: 6, degree: 4 },
  '5': { semitones: 7, degree: 4 },
  '#5': { semitones: 8, degree: 4 },
  b6: { semitones: 8, degree: 5 },
  '6': { semitones: 9, degree: 5 },
  bb7: { semitones: 9, degree: 6 },
  b7: { semitones: 10, degree: 6 },
  '7': { semitones: 11, degree: 6 },
  '8': { semitones: 12, degree: 7 },
  b9: { semitones: 13, degree: 8 },
  '9': { semitones: 14, degree: 8 },
  '#9': { semitones: 15, degree: 8 },
  '11': { semitones: 17, degree: 10 },
  '#11': { semitones: 18, degree: 10 },
  b13: { semitones: 20, degree: 12 },
  '13': { semitones: 21, degree: 12 },
};

export const INTERVAL_NAMES_ES: { name: string; short: string; iv: Interval }[] = [
  { name: 'Unísono', short: '1', iv: IV['1'] },
  { name: 'Segunda menor', short: 'b2', iv: IV.b2 },
  { name: 'Segunda mayor', short: '2', iv: IV['2'] },
  { name: 'Tercera menor', short: 'b3', iv: IV.b3 },
  { name: 'Tercera mayor', short: '3', iv: IV['3'] },
  { name: 'Cuarta justa', short: '4', iv: IV['4'] },
  { name: 'Tritono', short: '#4/b5', iv: IV['#4'] },
  { name: 'Quinta justa', short: '5', iv: IV['5'] },
  { name: 'Sexta menor', short: 'b6', iv: IV.b6 },
  { name: 'Sexta mayor', short: '6', iv: IV['6'] },
  { name: 'Séptima menor', short: 'b7', iv: IV.b7 },
  { name: 'Séptima mayor', short: '7', iv: IV['7'] },
  { name: 'Octava', short: '8', iv: IV['8'] },
];

export function intervalBetween(a: Pitch, b: Pitch): Interval {
  const semitones = midi(b) - midi(a);
  const degree = b.octave * 7 + b.letter - (a.octave * 7 + a.letter);
  return { semitones, degree };
}

/** 12 tonalidades con la ortografía más habitual para el músico de jazz. */
export const KEYS_MAJOR = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const KEYS_MINOR = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

/** Ortografía preferida para una tónica (evita G# mayor, D# mayor, etc.). */
export function preferredRoot(pitchClass: number, minor = false): Note {
  return parseNote((minor ? KEYS_MINOR : KEYS_MAJOR)[mod(pitchClass, 12)]);
}

/** Respeta la ortografía salvo dobles alteraciones o Cb/Fb/E#/B# aislados. */
export function simplify(n: Note): Note {
  if (Math.abs(n.acc) >= 2) return defaultSpellingFlatAware(pc(n), n.acc < 0);
  return n;
}
function defaultSpellingFlatAware(p: number, flats: boolean): Note {
  const flat: Note[] = [
    { letter: 0, acc: 0 }, { letter: 1, acc: -1 }, { letter: 1, acc: 0 }, { letter: 2, acc: -1 },
    { letter: 2, acc: 0 }, { letter: 3, acc: 0 }, { letter: 4, acc: -1 }, { letter: 4, acc: 0 },
    { letter: 5, acc: -1 }, { letter: 5, acc: 0 }, { letter: 6, acc: -1 }, { letter: 6, acc: 0 },
  ];
  return flats ? flat[p] : SHARP_SPELL[p];
}

export const SOLFEO: Record<string, string> = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };
export function noteNameEs(n: Note): string {
  const a = n.acc;
  return SOLFEO[LETTERS[n.letter]] + (a > 0 ? '♯'.repeat(a) : '♭'.repeat(-a));
}

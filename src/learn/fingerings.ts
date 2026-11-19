// Digitaciones estándar del saxofón (notas ESCRITAS; iguales para alto y tenor).
// Mano izquierda: 1 (Si), 2 (La), 3 (Sol) + llave de octava. Mano derecha: 4 (Fa), 5 (Mi), 6 (Re).
// Llaves adicionales: meñique izq. (Sol♯, Do♯ grave, Si grave, Si♭ grave), meñique der. (Mi♭, Do grave),
// llave "bis" (Si♭), palmas (Re, Mi♭, Fa agudos), lateral (Mi agudo).

export interface Fingering {
  written: string; // nota escrita con octava, p. ej. "G4"
  lh: [boolean, boolean, boolean];
  rh: [boolean, boolean, boolean];
  octave: boolean;
  extra: string[]; // llaves adicionales en español
  alt?: string; // alternativa común
}

const F = (written: string, lh: string, rh: string, octave: boolean, extra: string[] = [], alt?: string): Fingering => ({
  written,
  lh: [lh[0] === 'x', lh[1] === 'x', lh[2] === 'x'],
  rh: [rh[0] === 'x', rh[1] === 'x', rh[2] === 'x'],
  octave,
  extra,
  alt,
});

const LOW: Fingering[] = [
  F('Bb3', 'xxx', 'xxx', false, ['meñique izq.: Si♭ grave']),
  F('B3', 'xxx', 'xxx', false, ['meñique izq.: Si grave']),
  F('C4', 'xxx', 'xxx', false, ['meñique der.: Do grave']),
  F('C#4', 'xxx', 'xxx', false, ['meñique izq.: Do♯ grave']),
  F('D4', 'xxx', 'xxx', false),
  F('Eb4', 'xxx', 'xxx', false, ['meñique der.: Mi♭']),
  F('E4', 'xxx', 'xx-', false),
  F('F4', 'xxx', 'x--', false),
  F('F#4', 'xxx', '-x-', false, [], 'también 1-2-3 + 4-5 con llave de Fa♯'),
  F('G4', 'xxx', '---', false),
  F('G#4', 'xxx', '---', false, ['meñique izq.: Sol♯']),
  F('A4', 'xx-', '---', false),
  F('Bb4', 'x--', '---', false, ['llave «bis» (entre 1 y 2)'], 'también 1 + 4 (dedo índice derecho)'),
  F('B4', 'x--', '---', false),
  F('C5', '-x-', '---', false),
  F('C#5', '---', '---', false),
];

/** Registro medio y agudo: la llave de octava repite las digitaciones una octava arriba. */
const MID: Fingering[] = LOW.filter((f) => ['D4', 'Eb4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'Bb4', 'B4', 'C5', 'C#5'].includes(f.written)).map((f) => ({
  ...f,
  written: f.written.replace(/(\d)$/, (d) => String(Number(d) + 1)),
  octave: true,
}));

const HIGH: Fingering[] = [
  F('D6', '---', '---', true, ['palma: Re agudo']),
  F('Eb6', '---', '---', true, ['palma: Re agudo', 'palma: Mi♭ agudo']),
  F('E6', '---', '---', true, ['palma: Re', 'palma: Mi♭', 'lateral: Mi agudo']),
  F('F6', '---', '---', true, ['palma: Re', 'palma: Mi♭', 'lateral: Mi', 'palma: Fa agudo']),
];

export const FINGERINGS: Fingering[] = [...LOW, ...MID, ...HIGH];
export const fingeringFor = (written: string) => FINGERINGS.find((f) => f.written === written || f.written === enh(written));
function enh(n: string) {
  const map: Record<string, string> = { Db: 'C#', 'D#': 'Eb', Gb: 'F#', Ab: 'G#', 'A#': 'Bb' };
  const m = /^([A-G][#b]?)(\d)$/.exec(n);
  return m && map[m[1]] ? map[m[1]] + m[2] : n;
}

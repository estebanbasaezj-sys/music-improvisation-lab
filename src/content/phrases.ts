// Frases de vocabulario ORIGINALES (no transcritas de grabaciones), escritas como grados relativos
// a la tónica de la tonalidad. Así se transponen a cualquier tonalidad e instrumento sin duplicar datos.
import { IV, Note, Pitch, midi, transposePitch } from '../theory/notes';

export type PN = [degree: string, octave: number, start: number, dur: number];

export interface Phrase {
  id: string;
  title: string;
  context: 'blues12' | 'iiVI' | 'iiVImin' | 'dorianVamp' | 'minorBlues';
  defaultKey: string; // tonalidad de concierto sugerida
  bars: number;
  notes: PN[];
  concept: string;
  tip: string;
  level: 1 | 2 | 3;
}

export const PHRASES: Phrase[] = [
  {
    id: 'blues-call', title: 'Llamada pentatónica', context: 'blues12', defaultKey: 'F', bars: 2, level: 1,
    notes: [['b7', -1, 0, 0.5], ['1', 0, 0.5, 0.5], ['b3', 0, 1, 0.5], ['1', 0, 1.5, 1.5], ['b7', -1, 3, 0.5], ['1', 0, 3.5, 2]],
    concept: 'Pentatónica menor: b7 → 1 → b3 → 1.', tip: 'Termina en la tónica con una nota larga: así la frase "respira". Deja 2 compases de silencio después.',
  },
  {
    id: 'blues-bluenote', title: 'Blue note de paso', context: 'blues12', defaultKey: 'F', bars: 2, level: 1,
    notes: [['4', 0, 0, 0.5], ['b5', 0, 0.5, 0.5], ['4', 0, 1, 0.5], ['b3', 0, 1.5, 0.5], ['1', 0, 2, 1.5], ['b7', -1, 3.5, 0.5], ['1', 0, 4, 2]],
    concept: 'La b5 es nota de paso entre 4 y 5 (o de vuelta al 4).', tip: 'Toca la b5 corta y ligada: es un adorno, no un destino.',
  },
  {
    id: 'blues-major-minor', title: 'De b3 a 3 (blues mayor)', context: 'blues12', defaultKey: 'F', bars: 2, level: 1,
    notes: [['b3', 0, 0, 0.5], ['3', 0, 0.5, 0.5], ['5', 0, 1, 0.5], ['6', 0, 1.5, 0.5], ['5', 0, 2, 0.5], ['3', 0, 2.5, 0.5], ['1', 0, 3, 1]],
    concept: 'b3 → 3 sobre el I7: la "nota triste" resuelve a la 3ª del acorde.', tip: 'En guitarra haz un bend de cuarto de tono en la b3. En saxo, desliza (scoop).',
  },
  {
    id: 'blues-motif', title: 'Motivo y repetición', context: 'blues12', defaultKey: 'F', bars: 4, level: 1,
    notes: [['5', 0, 0, 0.5], ['b7', 0, 0.5, 0.5], ['1', 1, 1, 1.5], ['5', 0, 4, 0.5], ['b7', 0, 4.5, 0.5], ['b3', 1, 5, 1], ['1', 1, 6, 1.5]],
    concept: 'Un motivo de 3 notas se repite variando solo la nota final.', tip: 'Repite el mismo motivo sobre el IV7: la armonía cambia el color de las mismas notas.',
  },
  {
    id: 'blues-descent', title: 'Bajada por la escala blues', context: 'blues12', defaultKey: 'F', bars: 2, level: 2,
    notes: [['1', 1, 0, 0.5], ['b7', 0, 0.5, 0.5], ['5', 0, 1, 0.5], ['b5', 0, 1.5, 0.5], ['4', 0, 2, 0.5], ['b3', 0, 2.5, 0.5], ['1', 0, 3, 1]],
    concept: 'Escala blues descendente con corcheas swing.', tip: 'Acentúa las corcheas a contratiempo (las del "y").',
  },
  {
    id: 'bebop-dominant', title: 'Escala bebop sobre el I7', context: 'blues12', defaultKey: 'F', bars: 2, level: 3,
    notes: [['1', 1, 0, 0.5], ['7', 0, 0.5, 0.5], ['b7', 0, 1, 0.5], ['6', 0, 1.5, 0.5], ['5', 0, 2, 0.5], ['4', 0, 2.5, 0.5], ['3', 0, 3, 0.5], ['2', 0, 3.5, 0.5], ['1', 0, 4, 1]],
    concept: 'La 7ª mayor de paso hace que 1-3-5-b7 caigan en tiempo fuerte.', tip: 'Comprueba en la notación que en cada tiempo (negra) cae una nota del acorde.',
  },
  {
    id: 'iiVI-arp', title: 'Arpegio del ii y resolución por notas guía', context: 'iiVI', defaultKey: 'C', bars: 3, level: 1,
    notes: [['2', 0, 0, 0.5], ['4', 0, 0.5, 0.5], ['6', 0, 1, 0.5], ['1', 1, 1.5, 1.5], ['7', 0, 3, 1], ['5', 0, 4, 0.5], ['4', 0, 4.5, 0.5], ['2', 0, 5, 0.5], ['4', 0, 5.5, 2.5], ['3', 0, 8, 3]],
    concept: 'La 7ª del ii baja medio tono a la 3ª del V; la 7ª del V baja a la 3ª del I.', tip: 'Escucha el semitono C→B y F→E: es el "imán" del ii-V-I.',
  },
  {
    id: 'iiVI-chromatic', title: 'Aproximaciones cromáticas desde abajo', context: 'iiVI', defaultKey: 'C', bars: 3, level: 2,
    notes: [['3', 0, 0, 0.5], ['4', 0, 0.5, 1], ['6', 0, 1.5, 0.5], ['1', 1, 2, 0.5], ['6', 0, 2.5, 0.5], ['5', 0, 3, 0.5], ['b7', 0, 3.5, 0.5], ['7', 0, 4, 1], ['2', 1, 5, 0.5], ['4', 1, 5.5, 0.5], ['2', 1, 6, 0.5], ['7', 0, 6.5, 0.5], ['5', 0, 7, 0.5], ['#2', 1, 7.5, 0.5], ['3', 1, 8, 3]],
    concept: 'Cada acorde nuevo empieza en su 3ª, alcanzada desde medio tono abajo en el contratiempo anterior.', tip: 'La nota cromática va en tiempo débil; la nota del acorde en tiempo fuerte.',
  },
  {
    id: 'iiVI-enclosure', title: 'Enclosure (rodeo) a la 3ª del I', context: 'iiVI', defaultKey: 'C', bars: 3, level: 2,
    notes: [['1', 1, 0, 0.5], ['6', 0, 0.5, 0.5], ['4', 0, 1, 0.5], ['2', 0, 1.5, 0.5], ['1', 0, 2, 1], ['2', 0, 4, 0.5], ['4', 0, 4.5, 0.5], ['5', 0, 5, 0.5], ['7', 0, 5.5, 0.5], ['2', 1, 6, 0.5], ['4', 0, 6.5, 0.5], ['#2', 0, 7, 0.5], ['4', 0, 7.5, 0.5], ['3', 0, 8, 3]],
    concept: 'Rodear el objetivo: nota de arriba (diatónica) y de abajo (cromática) antes de caer en él.', tip: 'Practica primero solo los compases 2–3: F – D# – F … E.',
  },
  {
    id: 'iiVImin-line', title: 'ii-V-i menor con b9', context: 'iiVImin', defaultKey: 'C', bars: 3, level: 2,
    notes: [['2', 0, 0, 0.5], ['4', 0, 0.5, 0.5], ['b6', 0, 1, 0.5], ['1', 1, 1.5, 1.5], ['7', 0, 3, 1], ['b6', 0, 4, 0.5], ['4', 0, 4.5, 0.5], ['2', 0, 5, 0.5], ['7', -1, 5.5, 0.5], ['b6', -1, 6, 1], ['5', -1, 7, 1], ['b3', 0, 8, 3]],
    concept: 'La b6 de la tonalidad es la b9 del V7: el color de la menor armónica.', tip: 'Destaca el Ab sobre G7: es la nota que diferencia un V7 de un V7b9.',
  },
  {
    id: 'dorian-sixth', title: 'La 6ª dórica', context: 'dorianVamp', defaultKey: 'D', bars: 2, level: 2,
    notes: [['1', 0, 0, 0.5], ['2', 0, 0.5, 0.5], ['b3', 0, 1, 0.5], ['4', 0, 1.5, 0.5], ['5', 0, 2, 0.5], ['6', 0, 2.5, 1.5], ['5', 0, 4, 0.5], ['b3', 0, 4.5, 0.5], ['1', 0, 5, 2]],
    concept: 'La 6ª mayor sostenida sobre el i m7 es el sonido dórico.', tip: 'Compara: toca la misma frase con b6 (eólico) y escucha cómo se oscurece.',
  },
  {
    id: 'minor-blues-call', title: 'Respuesta en blues menor', context: 'minorBlues', defaultKey: 'C', bars: 2, level: 1,
    notes: [['5', 0, 0, 0.5], ['b3', 0, 0.5, 0.5], ['4', 0, 1, 0.5], ['b5', 0, 1.5, 0.5], ['4', 0, 2, 0.5], ['b3', 0, 2.5, 0.5], ['1', 0, 3, 2]],
    concept: 'Escala blues sobre un blues menor.', tip: 'Imítala, luego cambia solo el ritmo manteniendo las notas.',
  },
];

export const phraseById = (id: string) => PHRASES.find((p) => p.id === id);

/** Alturas de concierto de la frase a partir de la tónica (con octava). */
export function phrasePitches(p: Phrase, tonic: Pitch): Pitch[] {
  return p.notes.map(([deg, oct]) => {
    const iv = IV[deg];
    return transposePitch(tonic, { semitones: iv.semitones + 12 * oct, degree: iv.degree + 7 * oct });
  });
}

export function phraseEvents(p: Phrase, tonic: Pitch) {
  const ps = phrasePitches(p, tonic);
  return p.notes.map(([, , start, dur], i) => ({ midi: midi(ps[i]), start, dur }));
}

/** Elige la octava de la tónica para que la frase quede en un rango dado (MIDI de concierto). */
export function fitTonic(p: Phrase, key: Note, lo: number, hi: number): Pitch {
  let best: Pitch = { ...key, octave: 4 };
  let bestScore = Infinity;
  for (let o = 1; o <= 6; o++) {
    const t = { ...key, octave: o };
    const ms = phrasePitches(p, t).map(midi);
    const min = Math.min(...ms);
    const max = Math.max(...ms);
    const score = Math.max(0, lo - min) + Math.max(0, max - hi) + Math.abs((min + max) / 2 - (lo + hi) / 2) * 0.01;
    if (score < bestScore) { bestScore = score; best = t; }
  }
  return best;
}

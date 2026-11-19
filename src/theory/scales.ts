import { IV, Interval, Note, Pitch, midi, noteName, transposeNote, transposePitch } from './notes';

export interface ScaleDef {
  id: string;
  name: string;
  degrees: string[]; // nombres de grado relativos a la tónica
  family: 'mayor' | 'menor' | 'pentatónica' | 'blues' | 'modo' | 'jazz';
  /** grados característicos (los que definen el color) */
  characteristic?: string[];
  chords: string[]; // calidades de acorde sobre la tónica que la admiten
  summary: string;
  uses: string[];
  avoidWhen?: string;
}

const d = (s: string) => s.split(' ');

export const SCALES: ScaleDef[] = [
  {
    id: 'major', name: 'Mayor (jónica)', degrees: d('1 2 3 4 5 6 7'), family: 'mayor',
    characteristic: ['3', '7'], chords: ['maj7', '6', 'maj', 'maj9'],
    summary: 'La escala de referencia: T T S T T T S. Todo el sistema tonal se mide contra ella.',
    uses: ['Acordes I maj7 en jazz tonal', 'Melodías en tonalidad mayor', 'Base para construir acordes diatónicos'],
    avoidWhen: 'Sobre un maj7 la 4ª (nota "a evitar") choca con la 3ª si se sostiene: úsala de paso.',
  },
  {
    id: 'minor', name: 'Menor natural (eólica)', degrees: d('1 2 b3 4 5 b6 b7'), family: 'menor',
    characteristic: ['b3', 'b6'], chords: ['m7', 'm'],
    summary: 'Relativa de la mayor (empieza en el 6º grado). La b6 le da su color triste.',
    uses: ['vi m7 en tonalidad mayor', 'Pop/rock menor', 'Primer acercamiento al menor'],
    avoidWhen: 'En un ii m7 de un ii-V-I la b6 suena oscura: allí suele preferirse el dórico.',
  },
  {
    id: 'harmonicMinor', name: 'Menor armónica', degrees: d('1 2 b3 4 5 b6 7'), family: 'menor',
    characteristic: ['b6', '7'], chords: ['mMaj7', 'm'],
    summary: 'Menor natural con 7ª mayor: crea la sensible y el dominante V7 en menor.',
    uses: ['Tónica menor', 'Su 5º modo (frigio dominante) sobre el V7b9 del ii-V-i menor'],
  },
  {
    id: 'pentMajor', name: 'Pentatónica mayor', degrees: d('1 2 3 5 6'), family: 'pentatónica',
    characteristic: ['3', '6'], chords: ['maj', '6', 'maj7', '7'],
    summary: 'Cinco notas sin semitonos: imposible "equivocarse". Sonido abierto, country y blues mayor.',
    uses: ['Acorde I en blues (sonido dulce)', 'Acordes mayores y maj7', 'Frases de country-blues'],
  },
  {
    id: 'pentMinor', name: 'Pentatónica menor', degrees: d('1 b3 4 5 b7'), family: 'pentatónica',
    characteristic: ['b3', 'b7'], chords: ['m', 'm7', '7'],
    summary: 'La escala del blues y el rock. Sobre un acorde dominante, su b3 crea la "tensión azul".',
    uses: ['Blues (sobre los tres acordes)', 'Acordes m7', 'Rock y soul'],
  },
  {
    id: 'blues', name: 'Blues (menor)', degrees: d('1 b3 4 b5 5 b7'), family: 'blues',
    characteristic: ['b5'], chords: ['7', 'm7', 'm'],
    summary: 'Pentatónica menor + b5 ("blue note"). La b5 es nota de paso: tócala de camino al 4 o al 5.',
    uses: ['Blues de 12 compases', 'Frases de respuesta', 'Jazz blues'],
    avoidWhen: 'No te detengas sobre la b5 en tiempo fuerte salvo como efecto expresivo.',
  },
  {
    id: 'bluesMajor', name: 'Blues mayor', degrees: d('1 2 b3 3 5 6'), family: 'blues',
    characteristic: ['b3', '3'], chords: ['7', 'maj', '6'],
    summary: 'Pentatónica mayor + b3: el movimiento b3→3 es el sonido clásico del blues "dulce".',
    uses: ['Acorde I7 del blues', 'Swing y jump blues'],
  },
  {
    id: 'ionian', name: 'Jónico', degrees: d('1 2 3 4 5 6 7'), family: 'modo', characteristic: ['4', '7'],
    chords: ['maj7', '6'], summary: 'I grado de la escala mayor. Brillante y estable; la 4ª es la nota a evitar.',
    uses: ['Acorde Imaj7'],
  },
  {
    id: 'dorian', name: 'Dórico', degrees: d('1 2 b3 4 5 6 b7'), family: 'modo', characteristic: ['6'],
    chords: ['m7', 'm6', 'm9'],
    summary: 'Menor con 6ª MAYOR. Esa 6ª lo distingue del eólico: suena menor pero luminoso.',
    uses: ['ii m7 en un ii-V-I', 'Vamps menores modales (So What, Oye Como Va)', 'Blues menor jazzístico'],
  },
  {
    id: 'phrygian', name: 'Frigio', degrees: d('1 b2 b3 4 5 b6 b7'), family: 'modo', characteristic: ['b2'],
    chords: ['m7', 'sus4b9'], summary: 'Menor con 2ª menor: sonido oscuro, flamenco/español.',
    uses: ['iii m7 en tonalidad mayor (de paso)', 'Vamps modales oscuros'],
    avoidWhen: 'En jazz tonal rara vez se piensa en frigio: el iii m7 suele ser solo de paso.',
  },
  {
    id: 'lydian', name: 'Lidio', degrees: d('1 2 3 #4 5 6 7'), family: 'modo', characteristic: ['#4'],
    chords: ['maj7', 'maj7#11'], summary: 'Mayor con 4ª aumentada: elimina la nota a evitar del jónico. Flotante, moderno.',
    uses: ['IV maj7', 'Imaj7 con sonido moderno', 'Bandas sonoras'],
  },
  {
    id: 'mixolydian', name: 'Mixolidio', degrees: d('1 2 3 4 5 6 b7'), family: 'modo', characteristic: ['3', 'b7'],
    chords: ['7', '9', '13', '7sus4'],
    summary: 'Mayor con 7ª menor: es la escala "de" un acorde dominante. El tritono 3–b7 está dentro.',
    uses: ['V7 en ii-V-I', 'Cada acorde de un blues (sonido más "jazz" que la pentatónica)', 'Funk y rock'],
    avoidWhen: 'La 4ª choca con la 3ª del dominante si se sostiene; úsala de paso.',
  },
  {
    id: 'aeolian', name: 'Eólico', degrees: d('1 2 b3 4 5 b6 b7'), family: 'modo', characteristic: ['b6'],
    chords: ['m7', 'm'], summary: 'Menor natural. La b6 lo hace más melancólico que el dórico.',
    uses: ['vi m7', 'Tonalidades menores', 'Baladas y rock'],
  },
  {
    id: 'locrian', name: 'Locrio', degrees: d('1 b2 b3 4 b5 b6 b7'), family: 'modo', characteristic: ['b2', 'b5'],
    chords: ['m7b5'], summary: 'Único modo con quinta disminuida: encaja con el m7b5 (ii del ii-V-i menor).',
    uses: ['iiø (m7b5) en ii-V-i menor'],
    avoidWhen: 'No se usa como centro tonal; solo sobre un acorde m7b5 de paso.',
  },
  {
    id: 'phrygianDominant', name: 'Frigio dominante (5º de menor armónica)', degrees: d('1 b2 3 4 5 b6 b7'),
    family: 'jazz', characteristic: ['b2', '3'], chords: ['7b9'],
    summary: 'Dominante con b9 y b13: el sonido del V7 que resuelve a un acorde menor.',
    uses: ['V7b9 en ii-V-i menor'],
  },
  {
    id: 'dimHW', name: 'Disminuida (semitono-tono)', degrees: d('1 b2 b3 3 #4 5 6 b7'), family: 'jazz',
    characteristic: ['b2', 'b3', '#4'], chords: ['7b9', '13b9'],
    summary: 'Simétrica de 8 notas: contiene b9, #9, #11 y 13 sobre un dominante.',
    uses: ['Dominantes alterados con b9', 'Sonido bebop moderno'],
  },
  {
    id: 'bebopDominant', name: 'Bebop dominante', degrees: d('1 2 3 4 5 6 b7 7'), family: 'jazz',
    characteristic: ['7'], chords: ['7'],
    summary: 'Mixolidio + 7ª mayor de paso: en corcheas desde una nota del acorde, las notas del acorde caen en tiempo fuerte.',
    uses: ['Líneas bebop sobre V7', 'Blues jazzístico'],
  },
  {
    id: 'bebopMajor', name: 'Bebop mayor', degrees: d('1 2 3 4 5 #5 6 7'), family: 'jazz',
    characteristic: ['#5'], chords: ['6', 'maj7'],
    summary: 'Mayor + #5 de paso: bajando en corcheas desde una nota del acorde, 1-3-5-6 caen en los tiempos.',
    uses: ['Acordes I6 / Imaj7 en líneas bebop'],
  },
  {
    id: 'bebopDorian', name: 'Bebop menor (dórico + 7ª mayor de paso)', degrees: d('1 2 b3 4 5 6 b7 7'), family: 'jazz',
    characteristic: ['7'], chords: ['m7'],
    summary: 'Dórico con la 7ª mayor de paso entre la b7 y la fundamental: bajando desde la fundamental, 1-b7-5-b3 caen en los tiempos.',
    uses: ['ii m7 en líneas bebop', 'Vamps menores'],
  },
  {
    id: 'melodicMinor', name: 'Menor melódica (jazz)', degrees: d('1 2 b3 4 5 6 7'), family: 'jazz',
    characteristic: ['b3', '7'], chords: ['m6', 'mMaj7'],
    summary: 'Menor con 6ª y 7ª mayores (igual al subir y al bajar). De ella salen la alterada, la lidia dominante y la locria #2.',
    uses: ['Tónica menor (i m6)', 'Fuente de los sonidos del jazz moderno'],
  },
  {
    id: 'locrian2', name: 'Locrio #2 (6º de menor melódica)', degrees: d('1 2 b3 4 b5 b6 b7'), family: 'jazz',
    characteristic: ['2'], chords: ['m7b5'],
    summary: 'Locrio con 9ª natural: el m7b5 suena más suave y moderno.',
    uses: ['iiø en ii-V-i menor (sonido moderno)'],
  },
  {
    id: 'altered', name: 'Alterada (7º de menor melódica)', degrees: d('1 b2 b3 3 b5 b6 b7'), family: 'jazz',
    characteristic: ['b2', 'b3', 'b5', 'b6'], chords: ['7', '7b9', '7#9'],
    summary: 'Todas las tensiones alteradas del dominante: b9, #9, #11 y b13. Máxima tensión justo antes de resolver.',
    uses: ['V7 que resuelve (mayor o menor)', 'Sonido moderno y "de salida"'],
    avoidWhen: 'Solo sobre dominantes que resuelven; en un blues o un vamp estático suena fuera de lugar.',
  },
  {
    id: 'lydianDominant', name: 'Lidio dominante (lidio b7)', degrees: d('1 2 3 #4 5 6 b7'), family: 'jazz',
    characteristic: ['#4', 'b7'], chords: ['7', '9', '13'],
    summary: 'Mixolidio con #11: el dominante que no resuelve por quintas (sustituto tritonal, bVII7, IV7 del blues moderno).',
    uses: ['bII7 (sustituto tritonal)', 'bVII7 (cadencia backdoor)', 'Dominantes estáticos'],
  },
  {
    id: 'mixolydianb13', name: 'Mixolidio b13', degrees: d('1 2 3 4 5 b6 b7'), family: 'jazz',
    characteristic: ['b6'], chords: ['7'],
    summary: 'Mixolidio con b13: dominante secundario que va a un acorde menor (A7 → Dm7).',
    uses: ['VI7 (V7 del ii)', 'III7 (V7 del vi)'],
  },
];

export const scaleById = (id: string) => {
  const s = SCALES.find((x) => x.id === id);
  if (!s) throw new Error(`Escala desconocida ${id}`);
  return s;
};

export const scaleIntervals = (s: ScaleDef): Interval[] => s.degrees.map((g) => IV[g]);

export function scaleNotes(root: Note, s: ScaleDef): Note[] {
  return scaleIntervals(s).map((iv) => transposeNote(root, iv));
}

/** Alturas ascendentes de la escala (incluye la octava final si includeOctave). */
export function scalePitches(root: Pitch, s: ScaleDef, octaves = 1, includeTop = true): Pitch[] {
  const out: Pitch[] = [];
  for (let o = 0; o < octaves; o++) {
    for (const iv of scaleIntervals(s)) {
      out.push(transposePitch(root, { semitones: iv.semitones + 12 * o, degree: iv.degree + 7 * o }));
    }
  }
  if (includeTop) out.push(transposePitch(root, { semitones: 12 * octaves, degree: 7 * octaves }));
  return out;
}

export const scaleLabel = (root: Note, s: ScaleDef) => `${noteName(root)} ${s.name}`;

export function formulaSteps(s: ScaleDef): string {
  const semis = scaleIntervals(s).map((i) => i.semitones).concat(12);
  const out: string[] = [];
  for (let i = 1; i < semis.length; i++) {
    const diff = semis[i] - semis[i - 1];
    out.push(diff === 1 ? 'S' : diff === 2 ? 'T' : diff === 3 ? 'T½' : `${diff}st`);
  }
  return out.join(' ');
}

export const MODE_ORDER = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];

/** Para un modo, la tonalidad mayor "madre" (ej. D dórico → C mayor). */
export function parentMajor(root: Note, modeId: string): Note {
  const idx = MODE_ORDER.indexOf(modeId);
  if (idx < 0) return root;
  const major = scaleById('major');
  // la tónica del modo es el grado idx de la escala madre → bajar ese intervalo
  const iv = scaleIntervals(major)[idx];
  return transposeNote(root, { semitones: -iv.semitones, degree: -iv.degree });
}

export function sortMidi(ps: Pitch[]) {
  return [...ps].sort((a, b) => midi(a) - midi(b));
}

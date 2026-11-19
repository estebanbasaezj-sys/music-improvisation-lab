// Explorador de cadencias: para una cadencia elegida, qué escalas y modos sirven sobre cada acorde y una
// escalera de ejercicios (escala → tríadas y arpegios → ideas compuestas → bebop → frases clave).
// Todo el material es original y se genera con reglas sobre cualquier tonalidad. Cuando un recurso se
// asocia a músicos concretos, el texto lo dice como origen del RECURSO; nunca son transcripciones.
import { rng } from '../audio/rng';
import { Chord, QUALITIES, chordNotes, chordSymbol } from './chords';
import { ChordEvent, realize } from './progressions';
import { IV, Note, pc, transposeNote } from './notes';
import { MODE_ORDER, scaleById, scaleNotes } from './scales';
import { LineNote, chordStarts } from './line';
import { fillPath, generateSolo, nearestPc, step } from './improv';

// ---------------------------------------------------------------- cadencias
type Bar = [string, string, string][];
export interface CadenceDef {
  id: string;
  name: string;
  short: string;
  level: 1 | 2 | 3;
  minor?: boolean;
  blues?: boolean;
  /** la cadencia se repite: el último acorde resuelve en el primero */
  loops?: boolean;
  defaultKey: string;
  bars: Bar[];
  why: string;
  /** «modo fácil»: escala (sobre la tónica de la tonalidad o del acorde) para cada acorde */
  easy: { label: string; why: string; pick: (i: number) => { from: 'key' | 'chord'; scale: string } };
}
const B = (g: string, q: string, r: string): [string, string, string] => [g, q, r];
const all = (scale: string, from: 'key' | 'chord' = 'key') => () => ({ from, scale });

export const CADENCES: CadenceDef[] = [
  {
    id: 'V-I', name: 'V7 → I', short: 'Tensión y reposo: el movimiento más básico de la armonía.', level: 1, defaultKey: 'C',
    bars: [[B('5', '7', 'V7')], [B('5', '7', 'V7')], [B('1', 'maj7', 'Imaj7')], [B('1', 'maj7', 'Imaj7')]],
    why: 'El dominante (V7) tiene un tritono (3ª y 7ª) que «pide» resolver: la 7ª baja a la 3ª del I y la 3ª sube a la fundamental.',
    easy: { label: 'la escala mayor de la tonalidad', why: 'Las notas de la tonalidad mayor sirven para los dos acordes: sobre el V7 suenan como su mixolidio.', pick: all('major') },
  },
  {
    id: 'iiVI', name: 'ii – V – I mayor', short: 'La célula del jazz: aparece en casi todos los standards.', level: 1, defaultKey: 'C',
    bars: [[B('2', 'm7', 'ii m7')], [B('5', '7', 'V7')], [B('1', 'maj7', 'Imaj7')], [B('1', 'maj7', 'Imaj7')]],
    why: 'Subdominante → dominante → tónica, con las fundamentales moviéndose por cuartas. Si dominas esta cadencia en las 12 tonalidades, puedes tocar sobre cientos de temas.',
    easy: { label: 'la escala mayor de la tonalidad', why: 'Los tres acordes salen de la misma escala mayor: es la forma más fácil de empezar («pensar en la tonalidad»).', pick: all('major') },
  },
  {
    id: 'blues', name: 'Blues de 12 compases', short: 'La forma más tocada: tres acordes dominantes.', level: 1, blues: true, loops: true, defaultKey: 'F',
    bars: [
      [B('1', '7', 'I7')], [B('4', '7', 'IV7')], [B('1', '7', 'I7')], [B('1', '7', 'I7')],
      [B('4', '7', 'IV7')], [B('4', '7', 'IV7')], [B('1', '7', 'I7')], [B('1', '7', 'I7')],
      [B('5', '7', 'V7')], [B('4', '7', 'IV7')], [B('1', '7', 'I7')], [B('5', '7', 'V7')],
    ],
    why: 'Tres acordes dominantes que no «resuelven» como en la música clásica: el color del blues sale de mezclar la 3ª menor de la escala con la 3ª mayor de los acordes.',
    easy: { label: 'la escala blues de la tonalidad', why: 'Una sola escala (pentatónica menor + b5) suena bien sobre los tres acordes: es el sonido del blues.', pick: all('blues') },
  },
  {
    id: 'turnaround', name: 'I – vi – ii – V (turnaround)', short: 'La vuelta que regresa al principio.', level: 2, loops: true, defaultKey: 'C',
    bars: [[B('1', 'maj7', 'Imaj7')], [B('6', 'm7', 'vi m7')], [B('2', 'm7', 'ii m7')], [B('5', '7', 'V7')]],
    why: 'Los cuatro acordes son de la misma tonalidad y las fundamentales bajan por quintas (vi → ii → V → I). Es el corazón de Rhythm Changes y de muchísimas canciones.',
    easy: { label: 'la escala mayor de la tonalidad', why: 'Los cuatro acordes son diatónicos: la misma escala mayor sirve para todo.', pick: all('major') },
  },
  {
    id: 'dorianVamp', name: 'Vamp dórico (i m7 – IV7)', short: 'Modal: dos acordes que se repiten, un solo color.', level: 1, minor: true, loops: true, defaultKey: 'D',
    bars: [[B('1', 'm7', 'i m7')], [B('4', '7', 'IV7')], [B('1', 'm7', 'i m7')], [B('4', '7', 'IV7')]],
    why: 'En la música modal no hay cadencia que resuelva: el centro se mantiene y lo que importa es el color del modo. La 6ª mayor del dórico es la 3ª del IV7.',
    easy: { label: 'el modo dórico de la tónica', why: 'Un solo modo para los dos acordes: el dórico. Sobre el IV7 esas mismas notas suenan como su mixolidio.', pick: all('dorian') },
  },
  {
    id: 'iiVImin', name: 'ii – V – i menor', short: 'La versión oscura: iiø, V7b9 e i menor.', level: 2, minor: true, defaultKey: 'C',
    bars: [[B('2', 'm7b5', 'iiø')], [B('5', '7b9', 'V7b9')], [B('1', 'm6', 'i m6')], [B('1', 'm6', 'i m6')]],
    why: 'En menor, el ii es semidisminuido y el V lleva b9 (que es la b6 de la tonalidad): por eso suena más dramático.',
    easy: { label: 'menor armónica y menor melódica de la tonalidad', why: 'La menor armónica cubre el iiø y el V7b9; en la tónica (m6) sube la 6ª: menor melódica. Cambia una sola nota.', pick: (i) => ({ from: 'key', scale: i < 2 ? 'harmonicMinor' : 'melodicMinor' }) },
  },
  {
    id: 'iiiVIiiV', name: 'iii – VI7 – ii – V', short: 'Con dominante secundario: el VI7 «empuja» al ii.', level: 2, loops: true, defaultKey: 'C',
    bars: [[B('3', 'm7', 'iii m7')], [B('6', '7', 'VI7 (V/ii)')], [B('2', 'm7', 'ii m7')], [B('5', '7', 'V7')]],
    why: 'El vi m7 se convierte en VI7 (el V7 del ii): una sola nota cambia (la 3ª) y aparece una nueva atracción hacia el ii. Es una cadena de dominantes por quintas.',
    easy: { label: 'la escala mayor, con una nota cambiada en el VI7', why: 'La escala mayor sirve para todo salvo en el VI7, donde su 3ª (una nota fuera de la tonalidad) reemplaza a la fundamental de la tonalidad: mixolidio b13.', pick: (i) => (i === 1 ? { from: 'chord', scale: 'mixolydianb13' } : { from: 'key', scale: 'major' }) },
  },
  {
    id: 'backdoor', name: 'Backdoor: iv m7 – bVII7 – I', short: 'Llegar al I «por la puerta de atrás».', level: 3, defaultKey: 'C',
    bars: [[B('4', 'm7', 'iv m7')], [B('b7', '7', 'bVII7')], [B('1', 'maj7', 'Imaj7')], [B('1', 'maj7', 'Imaj7')]],
    why: 'Los dos primeros acordes se toman prestados de la tonalidad menor paralela (préstamo modal). El bVII7 resuelve un tono arriba, sin el tritono clásico del V7.',
    easy: { label: 'menor natural de la tonalidad y luego la mayor', why: 'iv m7 y bVII7 vienen de la menor natural de la tónica; en el I vuelves a la escala mayor.', pick: (i) => ({ from: 'key', scale: i < 2 ? 'minor' : 'major' }) },
  },
  {
    id: 'tritone', name: 'ii – subV7 – I (sustitución tritonal)', short: 'El V7 se cambia por el dominante a un tritono.', level: 3, defaultKey: 'C',
    bars: [[B('2', 'm7', 'ii m7')], [B('b2', '7', 'bII7 (subV)')], [B('1', 'maj7', 'Imaj7')], [B('1', 'maj7', 'Imaj7')]],
    why: 'El bII7 comparte el tritono (3ª y 7ª intercambiadas) con el V7 original, y su fundamental baja medio tono hasta el I: un bajo cromático muy elegante.',
    easy: { label: 'la escala mayor, y lidio dominante en el subV', why: 'La escala mayor sirve en el ii y el I; sobre el bII7 usa lidio dominante (su #11 es la fundamental del V7 original).', pick: (i) => (i === 1 ? { from: 'chord', scale: 'lydianDominant' } : { from: 'key', scale: 'major' }) },
  },
];
export const cadenceById = (id: string) => CADENCES.find((c) => c.id === id) ?? CADENCES[1];
export const cadenceEvents = (c: CadenceDef, key: Note): ChordEvent[] => realize({ id: c.id, name: c.name, bars: c.bars, description: c.why, level: c.level, minor: c.minor }, key);

// ---------------------------------------------------------------- escalas por acorde
export type ScaleTag = 'recomendada' | 'segura' | 'color' | 'tensión' | 'bebop' | 'blues';
export interface ScalePick { root: Note; scale: string }
export interface ScaleOption extends ScalePick { tag: ScaleTag; why: string }

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const isDom = (c: Chord) => ['7', '9', '13', '7b9', '7#9'].includes(c.quality.id);
const isMin = (c: Chord) => ['m7', 'm6', 'm9', 'm', 'mMaj7'].includes(c.quality.id);
const isMaj = (c: Chord) => ['maj7', '6', 'maj9', 'maj'].includes(c.quality.id);
const fourthUp = (a: Chord, b: Chord) => mod12(pc(b.root) - pc(a.root)) === 5;

export function nextChord(evts: ChordEvent[], i: number, loops?: boolean): Chord | undefined {
  // salta repeticiones del mismo acorde (Imaj7 | Imaj7)
  for (let k = i + 1; k < evts.length; k++) if (chordSymbol(evts[k].chord) !== chordSymbol(evts[i].chord)) return evts[k].chord;
  if (loops) for (let k = 0; k < i; k++) if (chordSymbol(evts[k].chord) !== chordSymbol(evts[i].chord)) return evts[k].chord;
  return undefined;
}

/** Opciones de escala para el acorde i de la cadencia, la primera es la recomendada. */
export function scaleOptions(cad: CadenceDef, evts: ChordEvent[], i: number): ScaleOption[] {
  const c = evts[i].chord;
  const r = c.root;
  const roman = evts[i].roman ?? '';
  const nx = nextChord(evts, i, cad.loops);
  const o = (scale: string, tag: ScaleTag, why: string, root: Note = r): ScaleOption => ({ root, scale, tag, why });
  if (c.quality.id === 'm7b5') return [
    o('locrian', 'recomendada', 'El único modo de la escala mayor con b3, b5 y b7: encaja exacto con el acorde.'),
    o('locrian2', 'color', 'Con 9ª natural en vez de b9: suena más suave y moderno.'),
  ];
  if (isDom(c)) {
    const resolves = nx && fourthUp(c, nx);
    const toMinor = resolves && nx && (isMin(nx) || nx.quality.id === 'm7b5');
    const subV = nx && mod12(pc(nx.root) - pc(r)) === 11;
    if (cad.blues) return [
      o('mixolydian', 'recomendada', 'La escala «nativa» del acorde dominante: suena a jazz y marca cada cambio.'),
      o('blues', 'blues', 'La escala blues de la tonalidad funciona en todo el blues: la b3 contra la 3ª del acorde es el sonido del blues.', evts[0].chord.root),
      o('bluesMajor', 'segura', 'Pentatónica mayor + b3: el blues «dulce» (b3 → 3).'),
      o('bebopDominant', 'bebop', 'Mixolidio + 7ª mayor de paso, para líneas en corcheas.'),
      o('lydianDominant', 'color', 'Mixolidio con #11: un color más moderno.'),
    ];
    if (subV) return [
      o('lydianDominant', 'recomendada', 'El sustituto tritonal pide #11: esa nota es la fundamental del V7 original.'),
      o('mixolydian', 'segura', 'Funciona, pero su 4ª natural choca con la 3ª del acorde.'),
    ];
    if (roman.startsWith('bVII')) return [
      o('lydianDominant', 'recomendada', 'El bVII7 de la cadencia backdoor suena natural con #11 (es el sonido de la menor melódica).'),
      o('mixolydian', 'segura', 'Mixolidio: las notas de la menor natural de la tonalidad sobre este acorde.'),
    ];
    if (toMinor) return [
      o('phrygianDominant', 'recomendada', 'Quinto modo de la menor armónica: b9 y b13, las notas de la tonalidad menor a la que resuelve.'),
      o('altered', 'tensión', 'Todas las tensiones alteradas (b9, #9, #11, b13): máxima tensión antes de resolver.'),
      o('dimHW', 'tensión', 'Disminuida semitono-tono: b9, #9, #11 y 13. Simétrica, muy bebop/moderna.'),
      o('mixolydianb13', 'color', 'Con 9ª natural y b13: más suave.'),
    ];
    if (resolves) {
      const secondary = !roman.startsWith('V7');
      return [
        secondary
          ? o('mixolydianb13', 'recomendada', 'Dominante secundario que va a un acorde menor: mixolidio con b13 (la 3ª del acorde es la única nota fuera de la tonalidad).')
          : o('mixolydian', 'recomendada', 'La escala «nativa» del dominante: contiene el tritono 3–b7 que resuelve.'),
        ...(secondary ? [o('mixolydian', 'segura', 'Mixolidio: funciona, aunque su 13 natural suena menos «dirigida» al acorde menor.')] : []),
        o('pentMajor', 'segura', 'Pentatónica mayor del acorde: sin notas que choquen.'),
        o('bebopDominant', 'bebop', 'Mixolidio + 7ª mayor de paso: en corcheas, las notas del acorde caen en los tiempos.'),
        o('altered', 'tensión', 'b9, #9, #11 y b13: mucha tensión que se libera al resolver.'),
        o('dimHW', 'tensión', 'Disminuida semitono-tono: b9, #9, #11 y 13.'),
      ];
    }
    return [
      o('mixolydian', 'recomendada', cad.minor ? 'Las notas del modo de la tónica sobre este acorde: mixolidio.' : 'La escala del dominante cuando no resuelve: mixolidio.'),
      o('pentMajor', 'segura', 'Pentatónica mayor del acorde: sin choques.'),
      o('lydianDominant', 'color', 'Mixolidio con #11: un color más abierto.'),
      o('bebopDominant', 'bebop', 'Para líneas en corcheas.'),
    ];
  }
  if (isMin(c)) {
    const isII = nx && isDom(nx) && fourthUp(c, nx);
    if (c.quality.id === 'm6') return [
      o('melodicMinor', 'recomendada', 'Tónica menor con 6ª y 7ª mayores: el sonido de la tónica menor en el jazz.'),
      o('dorian', 'color', 'Dórico: 6ª mayor pero 7ª menor.'),
      o('pentMinor', 'segura', 'Pentatónica menor: lo esencial, nada choca.'),
      o('harmonicMinor', 'color', 'Menor armónica: su b6 choca con la 6ª del acorde; úsala de paso.'),
    ];
    if (roman.startsWith('i ') || roman === 'i m7') return [
      o('dorian', 'recomendada', 'Menor con 6ª mayor: el modo del jazz modal.'),
      o('pentMinor', 'segura', 'Pentatónica menor: lo esencial, nada choca.'),
      o('aeolian', 'color', 'Eólico: la b6 lo hace más oscuro.'),
      o('blues', 'blues', 'Escala blues: sabor de blues menor.'),
      o('bebopDorian', 'bebop', 'Dórico + 7ª mayor de paso, para corcheas.'),
    ];
    if (roman.startsWith('iii')) return [
      o('phrygian', 'recomendada', 'El iii de la tonalidad mayor: frigio (misma colección que la tonalidad).'),
      o('aeolian', 'color', 'Eólico: con 9ª natural, más cantable.'),
      o('pentMinor', 'segura', 'Pentatónica menor: nada choca.'),
    ];
    if (roman.startsWith('iv')) return [
      o('dorian', 'recomendada', 'Dórico sobre el iv m7: es el color de la menor melódica de la tónica (muy usado en la backdoor).'),
      o('aeolian', 'color', 'Eólico: las notas de la menor natural de la tónica.'),
      o('pentMinor', 'segura', 'Pentatónica menor: nada choca.'),
    ];
    if (isII) return [
      o('dorian', 'recomendada', 'El ii m7 pertenece a la tonalidad del I: eso es el dórico (misma colección de notas).'),
      o('pentMinor', 'segura', 'Pentatónica menor: lo esencial, nada choca.'),
      o('bebopDorian', 'bebop', 'Dórico + 7ª mayor de paso: en corcheas, las notas del acorde caen en los tiempos.'),
      o('aeolian', 'color', 'Eólico: su b6 oscurece el ii (suena a otra tonalidad).'),
    ];
    return [
      o('aeolian', 'recomendada', 'El vi de la tonalidad mayor: eólico (misma colección que la tonalidad).'),
      o('dorian', 'color', 'Dórico: con 6ª mayor, más luminoso.'),
      o('pentMinor', 'segura', 'Pentatónica menor: nada choca.'),
    ];
  }
  if (isMaj(c)) {
    if (roman.startsWith('IV')) return [
      o('lydian', 'recomendada', 'Sobre el IV, la #4 es una nota de la tonalidad: lidio.'),
      o('pentMajor', 'segura', 'Pentatónica mayor: nada choca.'),
    ];
    return [
      o('ionian', 'recomendada', 'El I de la tonalidad: jónico (la escala mayor). Cuidado con sostener la 4ª.'),
      o('pentMajor', 'segura', 'Pentatónica mayor: no tiene la 4ª ni la 7ª, nada choca.'),
      o('lydian', 'color', 'Lidio: #4 en lugar de la 4ª, sonido flotante y moderno.'),
      o('bebopMajor', 'bebop', 'Mayor + #5 de paso: en corcheas, 1-3-5-6 caen en los tiempos.'),
    ];
  }
  const fb = c.quality.scales.map((s) => o(s.id, 'recomendada', s.why));
  return fb.length ? fb : [o('major', 'segura', 'Escala mayor del acorde.')];
}

/** Escala del «modo fácil» para cada acorde. */
export function easyPicks(cad: CadenceDef, evts: ChordEvent[], key: Note): ScalePick[] {
  return evts.map((e, i) => {
    const p = cad.easy.pick(i);
    return { root: p.from === 'key' ? key : e.chord.root, scale: p.scale };
  });
}

export const pickPcs = (p: ScalePick) => scaleNotes(p.root, scaleById(p.scale)).map(pc);
export const pickNotes = (p: ScalePick) => scaleNotes(p.root, scaleById(p.scale));

/** Si la escala es la mayor (o un modo) con otra tónica, el modo que forma sobre el acorde (C mayor sobre G7 → G mixolidio). */
export function modeOver(p: ScalePick, chordRoot: Note): string | null {
  if (pc(p.root) === pc(chordRoot)) return null;
  const base = p.scale === 'major' ? 'ionian' : p.scale === 'minor' ? 'aeolian' : p.scale;
  const idx = MODE_ORDER.indexOf(base);
  if (idx < 0) return null;
  const notes = scaleNotes(p.root, scaleById(base)).map(pc);
  const at = notes.indexOf(pc(chordRoot));
  if (at < 0) return null;
  return scaleById(MODE_ORDER[(idx + at) % 7]).name;
}

/** Acorde formado por varias notas apiladas (3-5-7-9 de Dm7 = Fmaj7). */
export function stackChord(ns: Note[]): Chord | null {
  if (ns.length < 4) return null;
  const rel = ns.map((n) => mod12(pc(n) - pc(ns[0])));
  for (const q of QUALITIES) {
    if (q.degrees.length !== ns.length) continue;
    const qs = q.degrees.map((d) => IV[d].semitones % 12);
    if (qs.every((x, k) => x === rel[k])) return { root: ns[0], quality: q };
  }
  return null;
}

// ---------------------------------------------------------------- la escalera de ejercicios
export type StepId = 'escala' | 'arpegios' | 'ideas' | 'bebop' | 'frases';
export const STEPS: { id: StepId; name: string; icon: string; goal: string }[] = [
  { id: 'escala', name: 'Recorre la escala', icon: '🪜', goal: 'Escucha cómo suena cada escala sobre su acorde y aprende a conectarlas sin cortar.' },
  { id: 'arpegios', name: 'Tríadas y arpegios', icon: '🔺', goal: 'Toca el acorde nota por nota: es el esqueleto de toda buena línea.' },
  { id: 'ideas', name: 'Ideas compuestas', icon: '🧩', goal: 'Patrones, notas guía y motivos: escalas y arpegios combinados con intención.' },
  { id: 'bebop', name: 'Bebop', icon: '🎷', goal: 'Cromatismos que apuntan a las notas del acorde y corcheas que caen en su sitio.' },
  { id: 'frases', name: 'Frases clave', icon: '⭐', goal: 'Recursos con historia: así resolvían las cadencias los grandes. Frases originales construidas con esos recursos, no transcripciones.' },
];

export interface ExNamer { note: (n: Note) => string; chord: (c: Chord) => string }
export interface ExCtx {
  events: ChordEvent[];
  picks: ScalePick[];
  range: { lo: number; hi: number };
  keyRoot: Note;
  minor: boolean;
  blues: boolean;
  loops: boolean;
  seed: number;
  names: ExNamer;
  scaleName: (p: ScalePick) => string;
}
export interface ExPhrase { start: number; end: number; title: string; text: string }
export interface ExResult { notes: LineNote[]; phrases: ExPhrase[] }
export interface ExerciseDef {
  id: string;
  step: StepId;
  name: string;
  how: string;
  challenge: string;
  origin?: string;
  /** por qué no aplica a una cadencia (si `build` devuelve null) */
  needs?: string;
  build: (ctx: ExCtx) => ExResult | null;
}

interface Seg { i: number; start: number; end: number; beats: number; chord: Chord; pick: ScalePick; pcs: number[]; same: boolean; last: boolean }
function segsOf(ctx: ExCtx): Seg[] {
  const st = chordStarts(ctx.events);
  return ctx.events.map((e, i) => ({
    i, start: st[i], end: st[i] + e.beats, beats: e.beats, chord: e.chord, pick: ctx.picks[i], pcs: pickPcs(ctx.picks[i]),
    same: i > 0 && chordSymbol(ctx.events[i - 1].chord) === chordSymbol(e.chord), last: i === ctx.events.length - 1,
  }));
}
const total = (ctx: ExCtx) => ctx.events.reduce((s, e) => s + e.beats, 0);

/** Clase de altura de un grado del acorde: '1','3','5','7' son las notas reales del acorde; el resto, tensiones. */
function degPc(c: Chord, d: string): number {
  const degs = c.quality.degrees;
  const ns = chordNotes(c);
  const find = (cands: string[]) => { const i = degs.findIndex((x) => cands.includes(x)); return i >= 0 ? pc(ns[i]) : null; };
  if (d === '1') return pc(c.root);
  if (d === '3') return find(['3', 'b3', '4', '2']) ?? pc(c.root);
  if (d === '5') return find(['5', 'b5', '#5']) ?? mod12(pc(c.root) + 7);
  if (d === '7') return find(['7', 'b7', 'bb7', '6']) ?? mod12(pc(c.root) + (isMaj(c) ? 11 : 10));
  return mod12(pc(c.root) + (IV[d]?.semitones ?? 0));
}
const degNote = (c: Chord, d: string): Note => {
  const degs = c.quality.degrees;
  const ns = chordNotes(c);
  const map: Record<string, string[]> = { '3': ['3', 'b3', '4', '2'], '5': ['5', 'b5', '#5'], '7': ['7', 'b7', 'bb7', '6'] };
  if (d === '1') return c.root;
  if (map[d]) { const i = degs.findIndex((x) => map[d].includes(x)); if (i >= 0) return ns[i]; }
  return transposeNote(c.root, IV[d] ?? IV['1']);
};
/** Las 4 notas del acorde (si es tríada, la octava como 4ª). */
const tones = (c: Chord) => ['1', '3', '5', '7'].map((d) => degPc(c, d));
const center = (ctx: ExCtx) => Math.round((ctx.range.lo + ctx.range.hi) / 2);
/** Fundamental del acorde colocada para que quepa una octava hacia arriba, cerca de `ref`. */
function rootPlace(c: Chord, ctx: ExCtx, ref = center(ctx) - 5, pcOf = pc(c.root)): number {
  let best = 0; let bd = Infinity;
  for (let m = ctx.range.lo; m + 12 <= ctx.range.hi + 1; m++) if (mod12(m) === pcOf && Math.abs(m - ref) < bd) { bd = Math.abs(m - ref); best = m; }
  return bd === Infinity ? nearestPc([pcOf], ref, ctx.range.lo, ctx.range.hi) : best;
}
/** Notas de la escala (ascendentes) desde `from` (incluida si está en la escala). */
function scaleRun(from: number, pcs: number[], n: number, dir: 1 | -1): number[] {
  const out: number[] = [];
  let m = from;
  if (!pcs.includes(mod12(m))) m = step(m, pcs, dir, -24, 160);
  for (let k = 0; k < n; k++) { out.push(m); m = step(m, pcs, dir, -24, 160); }
  return out;
}
const nm = (ctx: ExCtx, m: number, c: Chord, pick?: ScalePick) => {
  const cands = [...chordNotes(c), ...(pick ? pickNotes(pick) : []), ...['9', 'b9', '#9', '11', '#11', 'b13', '13'].map((d) => transposeNote(c.root, IV[d]))];
  const hit = cands.find((x) => pc(x) === mod12(m));
  return ctx.names.note(hit ?? { letter: 0, acc: 0 });
};
const sym = (ctx: ExCtx, c: Chord) => ctx.names.chord(c);
function eighths(ms: number[], at: number, tech: string, dur = 0.5): LineNote[] {
  return ms.map((m, k) => ({ midi: m, start: at + k * dur, dur, tech }));
}
function fold(m: number, r: { lo: number; hi: number }) { while (m < r.lo) m += 12; while (m > r.hi) m -= 12; return m; }
function finalize(notes: LineNote[], ctx: ExCtx): LineNote[] {
  const T = total(ctx);
  const s = notes.filter((n) => n.start >= -1e-9 && n.start < T - 1e-9).map((n) => ({ ...n, midi: fold(n.midi, ctx.range) })).sort((a, b) => a.start - b.start);
  for (let i = 0; i < s.length; i++) {
    const nx = s[i + 1];
    if (nx && s[i].start + s[i].dur > nx.start) s[i].dur = Math.max(0.25, nx.start - s[i].start);
    if (s[i].start + s[i].dur > T) s[i].dur = T - s[i].start;
  }
  return s.filter((n, i) => i === 0 || Math.abs(n.start - s[i - 1].start) > 1e-6);
}
/** Una frase por acorde (cadencias cortas) o por bloque de 4 compases (blues). */
const FILL_TEXT = 'Notas guía (3ª y 7ª) que enmarcan el recurso.';
function phrasesFrom(ctx: ExCtx, segs: Seg[], texts: string[], fill = ''): ExPhrase[] {
  if (segs.length <= 6) {
    const out: ExPhrase[] = [];
    segs.forEach((s, k) => {
      const prev = out[out.length - 1];
      if (s.same && prev) { prev.end = s.end; if (texts[k]) prev.text += ` ${texts[k]}`; return; }
      out.push({ start: s.start, end: s.end, title: `Compás ${s.start / 4 + 1} · ${sym(ctx, s.chord)}`, text: texts[k] ?? '' });
    });
    return out.map((p) => ({ ...p, text: p.text.trim() || fill }));
  }
  const out: ExPhrase[] = [];
  for (let b = 0; b < total(ctx); b += 16) {
    const ks = segs.filter((s) => s.start >= b && s.start < b + 16);
    const txt = [...new Set(ks.map((s) => texts[s.i]).filter(Boolean))].join(' ');
    out.push({ start: b, end: Math.min(total(ctx), b + 16), title: `Compases ${b / 4 + 1}–${Math.min(total(ctx), b + 16) / 4}`, text: txt ? (fill && ks.some((s) => !texts[s.i]) ? `${txt} En los demás compases: ${fill.toLowerCase()}` : txt) : fill });
  }
  return out;
}
const scaleText = (ctx: ExCtx, s: Seg) => {
  const mode = modeOver(s.pick, s.chord.root);
  return `${ctx.scaleName(s.pick)}${mode ? ` (sobre ${sym(ctx, s.chord)} suena como ${ctx.names.note(s.chord.root)} ${mode.toLowerCase()})` : ''}`;
};

// ---- 1 · escala
function exScaleFrom(ctx: ExCtx, startDeg: '1' | '3'): ExResult {
  const segs = segsOf(ctx);
  const notes: LineNote[] = [];
  const texts: string[] = [];
  let dir: 1 | -1 = 1;
  segs.forEach((s) => {
    dir = s.same ? (dir === 1 ? -1 : 1) : 1;
    const slots = s.beats * 2;
    const base = rootPlace(s.chord, ctx, center(ctx) - 5, degPc(s.chord, startDeg));
    let run: number[];
    if (dir === 1) {
      const up = scaleRun(base, s.pcs, s.pcs.length + 1, 1);
      run = [...up, ...up.slice(0, -1).reverse()].slice(0, slots);
    } else {
      const top = base + 12;
      run = scaleRun(top, s.pcs, s.pcs.length + 1, -1).slice(0, slots);
    }
    if (s.last) {
      // termina reposando en la nota de partida
      const down = scaleRun(base + 12, s.pcs, s.pcs.length + 1, -1).filter((m) => m > base);
      run = [...down.slice(-Math.max(1, slots - 2)), base];
      notes.push(...eighths(run.slice(0, -1), s.start, 'escala'), { midi: base, start: s.start + (run.length - 1) * 0.5, dur: s.beats - (run.length - 1) * 0.5, tech: 'escala' });
    } else notes.push(...eighths(run, s.start, 'escala'));
    texts.push(`${scaleText(ctx, s)}: ${run.slice(0, 8).map((m) => nm(ctx, m, s.chord, s.pick)).join(' ')}${dir === 1 ? ' ↑' : ' ↓'}.`);
  });
  return { notes: finalize(notes, ctx), phrases: phrasesFrom(ctx, segs, texts) };
}

function exScaleConnected(ctx: ExCtx): ExResult {
  const segs = segsOf(ctx);
  const { lo, hi } = ctx.range;
  const notes: LineNote[] = [];
  const texts: string[] = [];
  let dir: 1 | -1 = 1;
  let cur = rootPlace(segs[0].chord, ctx, center(ctx) - 4);
  segs.forEach((s, k) => {
    const slots = s.beats * 2;
    const run: number[] = [];
    const startNote = k === 0 ? cur : step(cur, s.pcs, dir, lo - 12, hi + 12);
    let m = startNote;
    const holdLast = s.last;
    const n = holdLast ? slots - 3 : slots;
    for (let j = 0; j < n; j++) {
      run.push(m);
      let nx = step(m, s.pcs, dir, lo - 12, hi + 12);
      if (nx > hi - 1 || nx < lo + 1) { dir = dir === 1 ? -1 : 1; nx = step(m, s.pcs, dir, lo - 12, hi + 12); }
      m = nx;
    }
    notes.push(...eighths(run, s.start, 'escala'));
    cur = run[run.length - 1];
    if (holdLast) {
      const land = nearestPc([degPc(s.chord, '3'), degPc(s.chord, '1')], step(cur, s.pcs, dir, lo, hi), lo, hi);
      notes.push({ midi: land, start: s.start + n * 0.5, dur: s.beats - n * 0.5, tech: 'escala' });
    }
    texts.push(k === 0
      ? `Empieza en ${nm(ctx, run[0], s.chord, s.pick)} con ${scaleText(ctx, s)} y sigue ${dir === 1 ? 'subiendo' : 'bajando'}.`
      : s.same ? '' : `Al llegar ${sym(ctx, s.chord)} no vuelves a la fundamental: desde ${nm(ctx, run[0], s.chord, s.pick)} sigues con ${ctx.scaleName(s.pick)}.`);
  });
  return { notes: finalize(notes, ctx), phrases: phrasesFrom(ctx, segs, texts) };
}

// ---- 2 · tríadas y arpegios
function exArp(ctx: ExCtx, kind: 'triada' | 'septima' | 'superior'): ExResult {
  const segs = segsOf(ctx);
  const notes: LineNote[] = [];
  const texts: string[] = [];
  let dir: 1 | -1 = 1;
  segs.forEach((s) => {
    dir = s.same ? (dir === 1 ? -1 : 1) : 1;
    const c = s.chord;
    const hasSeventh = c.quality.degrees.length >= 4;
    const second = s.pcs[1] ?? degPc(c, '9');
    let pcs: number[];
    let degs: string[];
    if (kind === 'triada') { pcs = [degPc(c, '1'), degPc(c, '3'), degPc(c, '5'), degPc(c, '1')]; degs = ['1', '3', '5', '8']; }
    else if (kind === 'septima') { pcs = hasSeventh ? tones(c) : [degPc(c, '1'), degPc(c, '3'), degPc(c, '5'), degPc(c, '1')]; degs = hasSeventh ? ['1', '3', '5', '7'] : ['1', '3', '5', '8']; }
    else { pcs = [degPc(c, '3'), degPc(c, '5'), hasSeventh ? degPc(c, '7') : degPc(c, '1'), second]; degs = ['3', '5', hasSeventh ? '7' : '8', '9']; }
    const base = rootPlace(c, ctx, center(ctx) - (kind === 'superior' ? 8 : 6), pcs[0]);
    const up: number[] = [base];
    for (let j = 1; j < 4; j++) up.push(nearestPc([pcs[j]], up[j - 1] + 1, up[j - 1] + 1, up[j - 1] + 12, 1));
    const top = kind === 'septima' && hasSeventh ? up[0] + 12 : null;
    const upFull = top ? [...up, top] : up;
    const quarters = kind === 'triada' && s.beats >= 4;
    let line: number[];
    if (quarters) line = dir === 1 ? up : [...up].reverse();
    else line = cycle(upFull, s.beats * 2, dir);
    if (s.last) {
      line = quarters ? [...up].reverse() : [...[...upFull].reverse()];
      const d = quarters ? 1 : 0.5;
      line.forEach((m, k) => notes.push({ midi: m, start: s.start + k * d, dur: k === line.length - 1 ? s.beats - k * d : d, tech: 'arpegio' }));
    } else notes.push(...eighths(line, s.start, 'arpegio', quarters ? 1 : 0.5));
    const names = up.map((m) => nm(ctx, m, c, s.pick));
    let extra = '';
    if (kind === 'superior') {
      const st = stackChord(degs.map((d) => (d === '9' ? pickNotes(s.pick).find((x) => pc(x) === second) ?? degNote(c, '9') : d === '8' ? c.root : degNote(c, d))));
      if (st) extra = ` = arpegio de ${ctx.names.chord(st)}: un acorde «dentro» de ${sym(ctx, c)}.`;
    }
    texts.push(`${sym(ctx, c)}: ${degs.join('-')} (${names.join(' ')})${dir === 1 ? ' ↑' : ' ↓'}${extra ? extra : '.'}`);
  });
  return { notes: finalize(notes, ctx), phrases: phrasesFrom(ctx, segs, texts) };
}
/** n notas recorriendo la figura de ida y vuelta sin repetir los extremos (1 3 5 7 8 7 5 3 | 1 …). */
function cycle(up: number[], n: number, dir: 1 | -1): number[] {
  const a = dir === 1 ? up : [...up].reverse();
  const loop = [...a, ...a.slice(1, -1).reverse()];
  return Array.from({ length: n }, (_, k) => loop[k % loop.length]);
}

function exArpConnected(ctx: ExCtx): ExResult {
  const segs = segsOf(ctx);
  const { lo, hi } = ctx.range;
  const notes: LineNote[] = [];
  const texts: string[] = [];
  let cur = center(ctx);
  let dir: 1 | -1 = 1;
  segs.forEach((s, k) => {
    const ts = tones(s.chord);
    const first = nearestPc(ts, cur, lo + 3, hi - 3, 0, k > 0);
    const line = [first];
    const n = s.last ? 5 : s.beats * 2;
    for (let j = 1; j < n; j++) {
      let nx = step(line[j - 1], ts, dir, lo, hi);
      if (nx > hi - 1 || nx < lo + 1) { dir = dir === 1 ? -1 : 1; nx = step(line[j - 1], ts, dir, lo, hi); }
      if (j === 4 && !s.last) dir = dir === 1 ? -1 : 1;
      line.push(nx);
    }
    if (s.last) line.forEach((m, j) => notes.push({ midi: m, start: s.start + j * 0.5, dur: j === line.length - 1 ? s.beats - j * 0.5 : 0.5, tech: 'arpegio' }));
    else notes.push(...eighths(line, s.start, 'arpegio'));
    texts.push(`${sym(ctx, s.chord)}: empieza en ${nm(ctx, first, s.chord)} (la nota del acorde más cercana a la anterior) y recorre ${s.chord.quality.degrees.length >= 4 ? '1-3-5-7' : '1-3-5'} sin saltar.`);
    cur = line[line.length - 1];
  });
  return { notes: finalize(notes, ctx), phrases: phrasesFrom(ctx, segs, texts) };
}

// ---- 3 · ideas compuestas
function exDigital(ctx: ExCtx): ExResult {
  const segs = segsOf(ctx);
  const notes: LineNote[] = [];
  const texts: string[] = [];
  let unit = 0;
  segs.forEach((s) => {
    const c = s.chord;
    const second = [1, 2].map((x) => mod12(pc(c.root) + x)).find((p) => s.pcs.includes(p)) ?? degPc(c, '9');
    const base = rootPlace(c, ctx, center(ctx) - 4);
    const up = [base, nearestPc([second], base + 1, base + 1, base + 4, 1), nearestPc([degPc(c, '3')], base + 2, base + 2, base + 5, 1), nearestPc([degPc(c, '5')], base + 6, base + 6, base + 8, 1)];
    const down = [...up].reverse();
    const units = Math.max(1, Math.round(s.beats / 2));
    const line: number[] = [];
    for (let u = 0; u < units; u++, unit++) line.push(...(unit % 2 === 0 ? up : down));
    if (s.last) {
      line.slice(0, 4).forEach((m, j) => notes.push({ midi: m, start: s.start + j * 0.5, dur: 0.5, tech: 'patrón' }));
      notes.push({ midi: base, start: s.start + 2, dur: s.beats - 2, tech: 'patrón' });
    } else notes.push(...eighths(line, s.start, 'patrón'));
    texts.push(`${sym(ctx, c)}: 1-2-3-5 = ${up.map((m) => nm(ctx, m, c, s.pick)).join(' ')} (y de vuelta 5-3-2-1).`);
  });
  return { notes: finalize(notes, ctx), phrases: phrasesFrom(ctx, segs, texts) };
}

function exThirds(ctx: ExCtx): ExResult {
  const segs = segsOf(ctx);
  const notes: LineNote[] = [];
  const texts: string[] = [];
  let dir: 1 | -1 = 1;
  segs.forEach((s) => {
    dir = s.same ? (dir === 1 ? -1 : 1) : 1;
    const base = rootPlace(s.chord, ctx, center(ctx) - 6);
    const lad = scaleRun(dir === 1 ? base : base + 12, s.pcs, s.pcs.length * 2 + 3, dir);
    const pairs = Math.max(1, s.beats);
    const line: number[] = [];
    for (let p = 0; p < pairs; p++) line.push(lad[p], lad[p + 2]);
    if (s.last) {
      line.forEach((m, j) => notes.push({ midi: m, start: s.start + j * 0.5, dur: 0.5, tech: 'terceras' }));
      const end = line.length * 0.5;
      if (end < s.beats) notes.push({ midi: base, start: s.start + end, dur: s.beats - end, tech: 'terceras' });
    } else notes.push(...eighths(line, s.start, 'terceras'));
    texts.push(`${sym(ctx, s.chord)}: ${ctx.scaleName(s.pick)} en terceras ${dir === 1 ? 'subiendo' : 'bajando'} (${line.slice(0, 6).map((m) => nm(ctx, m, s.chord, s.pick)).join(' ')}…).`);
  });
  return { notes: finalize(notes, ctx), phrases: phrasesFrom(ctx, segs, texts) };
}

function fromSolo(ctx: ExCtx, idea: 'guide' | 'motif' | 'bebop', level: 1 | 2 | 3): ExResult {
  const solo = generateSolo({ events: ctx.events, keyRoot: ctx.keyRoot, minor: ctx.minor, blues: ctx.blues, range: ctx.range, level, seed: ctx.seed, idea, names: ctx.names });
  return { notes: solo.notes, phrases: solo.phrases };
}

// ---- 4 · bebop
function exTargets(ctx: ExCtx, kind: 'below' | 'enclosure'): ExResult {
  const r = rng(ctx.seed * 7 + (kind === 'below' ? 1 : 2));
  const segs = segsOf(ctx);
  const { lo, hi } = ctx.range;
  const notes: LineNote[] = [];
  const texts: string[] = [];
  let cur = nearestPc([degPc(segs[0].chord, '3')], center(ctx), lo + 3, hi - 3);
  notes.push({ midi: cur, start: 0, dur: 0.5, tech: 'objetivo' });
  segs.forEach((s, k) => {
    const nx = segs[k + 1];
    if (!nx) {
      const n0 = notes[notes.length - 1];
      if (n0.start === s.start) n0.dur = s.beats;
      texts.push(`Final: reposa en ${nm(ctx, cur, s.chord)}.`);
      return;
    }
    // objetivo: 3ª (o 7ª si el acorde se repite) del acorde siguiente, cerca de donde estás
    const goals = nx.same ? [degPc(nx.chord, '7'), degPc(nx.chord, '5')] : [degPc(nx.chord, '3')];
    const target = nearestPc(goals, cur + (r() < 0.5 ? -3 : 3), lo + 3, hi - 3, 0, true);
    const above = step(target, s.pcs, 1, lo - 12, hi + 12);
    const appr = kind === 'below' ? [target - 1] : [above, target - 1];
    const k2 = s.beats * 2 - 1 - appr.length;
    const path = fillPath(cur, appr[0], k2, s.pcs, tones(s.chord), r, lo, hi);
    notes.push(...eighths(path, s.start + 0.5, 'línea'));
    appr.forEach((m, j) => notes.push({ midi: m, start: s.end - (appr.length - j) * 0.5, dur: 0.5, tech: kind === 'below' ? 'below' : 'enclosure' }));
    notes.push({ midi: target, start: nx.start, dur: 0.5, tech: 'objetivo' });
    const what = mod12(target) === degPc(nx.chord, '3') ? '3ª' : mod12(target) === degPc(nx.chord, '7') ? '7ª' : '5ª';
    texts.push(kind === 'below'
      ? `Sobre ${sym(ctx, s.chord)} corcheas de ${ctx.scaleName(s.pick)}; la última es ${nm(ctx, target - 1, nx.chord)}, medio tono bajo ${nm(ctx, target, nx.chord)} (${what} de ${sym(ctx, nx.chord)}), que cae en el tiempo 1.`
      : `Sobre ${sym(ctx, s.chord)} la línea termina rodeando ${nm(ctx, target, nx.chord)} (${what} de ${sym(ctx, nx.chord)}): primero la nota de arriba (${nm(ctx, above, s.chord, s.pick)}), luego medio tono abajo, y cae en el tiempo 1.`);
    cur = target;
  });
  return { notes: finalize(notes, ctx), phrases: phrasesFrom(ctx, segs, texts) };
}

function bebopScaleFor(c: Chord): string | null {
  if (isDom(c) && c.quality.id !== '7b9') return 'bebopDominant';
  if (['m7', 'm9'].includes(c.quality.id)) return 'bebopDorian';
  if (isMaj(c)) return 'bebopMajor';
  return null;
}
function exBebopScale(ctx: ExCtx): ExResult {
  const segs = segsOf(ctx);
  const { lo, hi } = ctx.range;
  const notes: LineNote[] = [];
  const texts: string[] = [];
  let cur = hi - 4;
  segs.forEach((s) => {
    const bs = bebopScaleFor(s.chord);
    const pcs = bs ? scaleNotes(s.chord.root, scaleById(bs)).map(pc) : s.pcs;
    // la bebop mayor trata el acorde como sexta: 1-3-5-6 caen en los tiempos (no la 7ª)
    const ts = bs === 'bebopMajor' ? [degPc(s.chord, '1'), degPc(s.chord, '3'), degPc(s.chord, '5'), mod12(pc(s.chord.root) + 9)] : tones(s.chord);
    let start = nearestPc(ts, cur - 1, lo + 8, hi - 1, -1);
    if (start - lo < 8) start = nearestPc(ts, start + 12, lo + 8, hi - 1);
    const n = s.last ? 4 : s.beats * 2;
    const line = scaleRun(start, bs ? pcs : s.pcs, n, -1);
    const added = bs ? mod12(pc(s.chord.root) + (bs === 'bebopMajor' ? 8 : 11)) : -1;
    line.forEach((m, j) => notes.push({ midi: m, start: s.start + j * 0.5, dur: 0.5, tech: mod12(m) === added ? 'bebop' : 'línea' }));
    if (s.last) {
      const land = nearestPc(ts, line[line.length - 1] - 1, lo, hi, -1);
      notes.push({ midi: land, start: s.start + n * 0.5, dur: s.beats - n * 0.5, tech: 'línea' });
    }
    cur = line[line.length - 1];
    const onBeats = line.filter((_, j) => j % 2 === 0).map((m) => nm(ctx, m, s.chord));
    texts.push(bs
      ? `${sym(ctx, s.chord)}: ${ctx.names.note(s.chord.root)} ${scaleById(bs).name.toLowerCase()} bajando desde ${nm(ctx, start, s.chord)}. En los tiempos caen ${onBeats.join(', ')}: notas del acorde.`
      : `${sym(ctx, s.chord)}: no tiene una escala bebop habitual; baja por ${ctx.scaleName(s.pick)}.`);
  });
  return { notes: finalize(notes, ctx), phrases: phrasesFrom(ctx, segs, texts) };
}

// ---- 5 · frases clave
/** Relleno con notas guía (blancas) en los acordes donde el recurso no aplica, para que el recurso destaque. */
function guideFill(ctx: ExCtx, s: Seg, cur: number, from: number, to: number, notes: LineNote[]): number {
  const g = [degPc(s.chord, '3'), degPc(s.chord, '7')];
  let m = cur;
  for (let t = from; t < to - 1e-9; t += 2) {
    m = nearestPc(g, m, ctx.range.lo + 2, ctx.range.hi - 2, 0, t > from);
    notes.push({ midi: m, start: t, dur: Math.min(2, to - t), tech: 'guía' });
  }
  return m;
}
const nextSeg = (segs: Seg[], k: number, loops: boolean) => segs[k + 1] ?? (loops ? segs[0] : undefined);
/** V7 que resuelven una cuarta arriba en el compás siguiente. */
const resolvingDoms = (segs: Seg[], loops: boolean) => segs.filter((s, k) => {
  if (!isDom(s.chord)) return false;
  const nx = nextSeg(segs, k, loops);
  return !!nx && chordSymbol(nx.chord) !== chordSymbol(s.chord) && fourthUp(s.chord, nx.chord);
});

function exB9(ctx: ExCtx): ExResult | null {
  const segs = segsOf(ctx);
  const doms = resolvingDoms(segs, ctx.loops);
  if (!doms.length) return null;
  const { lo, hi } = ctx.range;
  const notes: LineNote[] = [];
  const texts: string[] = [];
  let cur = center(ctx);
  let resolveTo: number | null = null;
  segs.forEach((s, k) => {
    let from = s.start;
    if (resolveTo !== null) {
      notes.push({ midi: resolveTo, start: s.start, dur: 2, tech: 'resolución' });
      cur = resolveTo; from = s.start + 2;
      texts[k] = `La b9 baja medio tono: ${nm(ctx, resolveTo, s.chord)} es la 5ª de ${sym(ctx, s.chord)}.`;
      resolveTo = null;
    }
    if (doms.includes(s)) {
      const arpAt = s.end - 2;
      cur = guideFill(ctx, s, cur, from, arpAt, notes);
      const b9 = mod12(pc(s.chord.root) + 1);
      let third = nearestPc([degPc(s.chord, '3')], cur, lo + 1, hi - 9);
      if (third + 9 > hi) third -= 12;
      const arp = [third];
      for (const p of [degPc(s.chord, '5'), degPc(s.chord, '7'), b9]) arp.push(nearestPc([p], arp[arp.length - 1] + 1, arp[arp.length - 1] + 1, arp[arp.length - 1] + 6, 1));
      notes.push(...eighths(arp, arpAt, 'b9'));
      const nx = nextSeg(segs, k, true)!;
      const five = degPc(nx.chord, '5');
      const land = mod12(arp[3] - 1) === five ? arp[3] - 1 : nearestPc([five], arp[3] - 1, lo, hi);
      if (k + 1 < segs.length) resolveTo = land;
      texts[k] = (texts[k] ? texts[k] + ' ' : '') + `En ${sym(ctx, s.chord)}: arpegio 3-5-b7-b9 (${arp.map((m) => nm(ctx, m, s.chord)).join(' ')}) = un acorde disminuido. La b9 (${nm(ctx, arp[3], s.chord)}) pide resolver.`;
      cur = arp[3];
    } else if (from < s.end) {
      cur = guideFill(ctx, s, cur, from, s.end, notes);
      texts[k] = texts[k] ?? '';
    }
  });
  return { notes: finalize(notes, ctx), phrases: phrasesFrom(ctx, segs, Array.from(segs, (_, k) => texts[k] ?? ''), FILL_TEXT) };
}

function exTritone(ctx: ExCtx): ExResult | null {
  const segs = segsOf(ctx);
  const doms = resolvingDoms(segs, ctx.loops);
  if (!doms.length) return null;
  const { lo, hi } = ctx.range;
  const notes: LineNote[] = [];
  const texts: string[] = [];
  let cur = center(ctx);
  let resolveFrom: number | null = null;
  segs.forEach((s, k) => {
    let from = s.start;
    if (resolveFrom !== null) {
      const land = nearestPc([degPc(s.chord, '1'), degPc(s.chord, '3')], resolveFrom + 1, lo, hi);
      notes.push({ midi: land, start: s.start, dur: 2, tech: 'resolución' });
      texts[k] = `Resuelve por medio tono a ${nm(ctx, land, s.chord)}.`;
      cur = land; from = s.start + 2; resolveFrom = null;
    }
    if (doms.includes(s)) {
      const arpAt = s.end - 2;
      cur = guideFill(ctx, s, cur, from, arpAt, notes);
      const sub: Chord = { root: transposeNote(s.chord.root, IV.b5), quality: s.chord.quality.id === '7b9' ? QUALITIES.find((q) => q.id === '7')! : s.chord.quality };
      const subPcs = [degPc(sub, '1'), degPc(sub, '3'), degPc(sub, '5'), degPc(sub, '7')];
      let first = nearestPc([subPcs[0]], cur, lo + 1, hi - 10);
      if (first + 10 > hi) first -= 12;
      const arp = [first];
      for (const p of subPcs.slice(1)) arp.push(nearestPc([p], arp[arp.length - 1] + 1, arp[arp.length - 1] + 1, arp[arp.length - 1] + 6, 1));
      notes.push(...eighths(arp, arpAt, 'tritono'));
      if (k + 1 < segs.length) resolveFrom = arp[3];
      const subNames = [sub.root, ...['3', '5', '7'].map((d) => degNote(sub, d))].map((n) => ctx.names.note(n));
      texts[k] = (texts[k] ? texts[k] + ' ' : '') + `Sobre ${sym(ctx, s.chord)} tocas el arpegio de ${ctx.names.chord(sub)} (${subNames.join(' ')}), su sustituto tritonal: comparten el tritono (3ª y 7ª).`;
      cur = arp[3];
    } else if (from < s.end) {
      cur = guideFill(ctx, s, cur, from, s.end, notes);
      texts[k] = texts[k] ?? '';
    }
  });
  return { notes: finalize(notes, ctx), phrases: phrasesFrom(ctx, segs, Array.from(segs, (_, k) => texts[k] ?? ''), FILL_TEXT) };
}

/** Pentatónica superpuesta: qué pentatónica tocar sobre cada acorde y qué grados forma. */
export function pentaFor(c: Chord, pick: ScalePick): { root: Note; scale: 'pentMinor' | 'pentMajor'; degs: string } {
  const at = (d: string) => transposeNote(c.root, IV[d]);
  if (c.quality.id === 'm7b5') return { root: at('b3'), scale: 'pentMinor', degs: 'b3-b5-b13-b7-b9' };
  if (isMin(c)) return c.quality.id === 'm6' ? { root: at('2'), scale: 'pentMinor', degs: '9-11-5-6-1' } : { root: at('2'), scale: 'pentMinor', degs: '9-11-5-13-1' };
  if (isDom(c)) {
    if (['altered', 'dimHW', 'phrygianDominant'].includes(pick.scale) || c.quality.id === '7b9') return { root: at('b3'), scale: 'pentMinor', degs: '#9-#11-b13-b7-b9' };
    return { root: at('5'), scale: 'pentMinor', degs: '5-b7-1-9-11' };
  }
  if (isMaj(c)) return pick.scale === 'lydian' ? { root: at('2'), scale: 'pentMajor', degs: '9-3-#11-13-7' } : { root: at('5'), scale: 'pentMajor', degs: '5-13-7-9-3' };
  return { root: c.root, scale: 'pentMajor', degs: '1-2-3-5-6' };
}
function exPenta(ctx: ExCtx): ExResult {
  const segs = segsOf(ctx);
  const { lo, hi } = ctx.range;
  const notes: LineNote[] = [];
  const texts: string[] = [];
  let cur = center(ctx);
  let dir: 1 | -1 = 1;
  segs.forEach((s) => {
    const pt = pentaFor(s.chord, s.pick);
    const pcs = scaleNotes(pt.root, scaleById(pt.scale)).map(pc);
    dir = cur > hi - 7 ? -1 : cur < lo + 7 ? 1 : dir;
    let a = nearestPc(pcs, cur, lo + 2, hi - 2);
    const line: number[] = [];
    const groups = s.last ? 1 : Math.max(1, s.beats / 2);
    for (let g = 0; g < groups; g++) {
      // grupos de 4: (1 2 3 4) (2 3 4 5)… en la dirección actual, siempre empezando un grado más allá
      const run = scaleRun(a, pcs, 4, dir);
      line.push(...run);
      a = step(a, pcs, dir, lo - 12, hi + 12);
      if (a > hi - 6 || a < lo + 3) dir = dir === 1 ? -1 : 1;
    }
    notes.push(...eighths(line, s.start, 'pentatónica'));
    if (s.last) {
      const land = nearestPc([degPc(s.chord, '3'), degPc(s.chord, '5')], line[line.length - 1], lo, hi);
      notes.push({ midi: land, start: s.start + line.length * 0.5, dur: s.beats - line.length * 0.5, tech: 'pentatónica' });
    }
    cur = line[line.length - 1];
    texts.push(`${sym(ctx, s.chord)}: ${ctx.names.note(pt.root)} ${scaleById(pt.scale).name.toLowerCase()} = ${pt.degs} del acorde.`);
  });
  return { notes: finalize(notes, ctx), phrases: phrasesFrom(ctx, segs, texts) };
}

function exBlues(ctx: ExCtx): ExResult | null {
  const segs = segsOf(ctx);
  const okSeg = (s: Seg) => isDom(s.chord) || isMaj(s.chord) || isMin(s.chord);
  if (!segs.some((s) => isDom(s.chord) || isMaj(s.chord))) return null;
  const notes: LineNote[] = [];
  const texts: string[] = [];
  let cur = center(ctx);
  segs.forEach((s) => {
    if (!okSeg(s) || s.same) { cur = guideFill(ctx, s, cur, s.start, s.end, notes); texts.push(''); return; }
    const c = s.chord;
    const r0 = rootPlace(c, ctx, cur - 4);
    if (isMin(c)) {
      // 1 b3 4 b5 4 b3 1: la b5 de paso
      const cell = [0, 3, 5, 6, 5, 3, 0];
      cell.forEach((iv, j) => notes.push({ midi: r0 + iv, start: s.start + j * 0.5, dur: j === cell.length - 1 ? 1.5 : 0.5, tech: iv === 6 ? 'blue' : 'blues' }));
      texts.push(`${sym(ctx, c)}: 1-b3-4-b5-4-b3-1 (${cell.map((iv) => ctx.names.note(transposeNote(c.root, IV[['1', 'b2', '2', 'b3', '3', '4', 'b5', '5'][iv]]))).join(' ')}): la b5 de paso es la blue note.`);
      cur = r0;
      return;
    }
    // b3 → 3 (la 3ª que se dobla), 5, 6 y vuelta a la 5ª
    const sixth = isDom(c) ? 10 : 9;
    const cell: [number, number, number][] = [[3, 0, 0.5], [4, 0.5, 0.5], [7, 1, 0.5], [sixth, 1.5, 0.5], [7, 2, 1.5]];
    cell.forEach(([iv, t, d]) => notes.push({ midi: r0 + iv, start: s.start + t, dur: d, tech: iv === 3 ? 'blue' : 'blues' }));
    texts.push(`${sym(ctx, c)}: b3 → 3 (${ctx.names.note(transposeNote(c.root, IV.b3))} → ${ctx.names.note(transposeNote(c.root, IV['3']))}), luego 5 y ${isDom(c) ? 'b7' : '6'}: la 3ª «entre» menor y mayor es el sonido del blues.`);
    cur = r0 + 7;
  });
  return { notes: finalize(notes, ctx), phrases: phrasesFrom(ctx, segs, texts, FILL_TEXT) };
}

export const EXERCISES: ExerciseDef[] = [
  { id: 'esc-fund', step: 'escala', name: 'Sube desde la fundamental',
    how: 'Cada acorde con su escala, desde la fundamental en corcheas. Escucha cómo cambia el color en cada cambio.',
    challenge: 'Toca lo mismo sin mirar la partitura. Luego bájala desde la octava.', build: (c) => exScaleFrom(c, '1') },
  { id: 'esc-3', step: 'escala', name: 'Empieza en la 3ª',
    how: 'La misma escala, pero desde la 3ª del acorde: la nota que define si es mayor o menor. Suena más a melodía y menos a ejercicio.',
    challenge: 'Empieza cada acorde en su 3ª y sube 8 notas. Después prueba desde la 5ª y la 7ª.', build: (c) => exScaleFrom(c, '3') },
  { id: 'esc-cont', step: 'escala', name: 'Sin cortar: conecta las escalas',
    how: 'La línea no vuelve a la fundamental en cada acorde: sigue en la misma dirección y solo cambian las notas que cambian de escala. Así se toca de verdad.',
    challenge: 'Corcheas continuas toda la cadencia. Al cambiar de acorde, sigue desde la nota en la que estás.', build: exScaleConnected },
  { id: 'arp-triada', step: 'arpegios', name: 'Tríadas 1-3-5-8',
    how: 'Solo las tres notas del acorde (y la octava), en negras. Es lo primero que hay que tener en los dedos.',
    challenge: 'Toca la tríada de cada acorde subiendo y bajando, a tempo lento, sin pararte en los cambios.', build: (c) => exArp(c, 'triada') },
  { id: 'arp-7', step: 'arpegios', name: 'Arpegios de séptima 1-3-5-7',
    how: 'Las cuatro notas del acorde: la 7ª es la que da el color de jazz.',
    challenge: 'Arpegio de cada acorde subiendo y bajando. Luego empieza desde la 7ª hacia abajo.', build: (c) => exArp(c, 'septima') },
  { id: 'arp-cerca', step: 'arpegios', name: 'Arpegios que se conectan',
    how: 'Cada arpegio empieza en la nota del acorde más cercana a la última que tocaste: menos saltos, más línea.',
    challenge: 'En cada cambio, busca la nota del acorde nuevo que esté a un paso de donde quedaste.', build: exArpConnected },
  { id: 'arp-sup', step: 'arpegios', name: 'Desde la 3ª: 3-5-7-9',
    how: 'Empezar el arpegio en la 3ª evita la fundamental (la toca el bajo) y añade la 9ª: es otro acorde completo «dentro» del acorde.',
    challenge: 'Toca 3-5-7-9 de cada acorde y descubre qué acorde superior forma.', origin: 'Recurso habitual del lenguaje jazzístico desde el bebop: pensar en «acordes superiores» para sonar moderno sin salir de la armonía.', build: (c) => exArp(c, 'superior') },
  { id: 'ide-1235', step: 'ideas', name: 'Patrón 1-2-3-5',
    how: 'Un patrón de cuatro notas (fundamental, 2ª, 3ª y 5ª) que se traslada a cada acorde, de ida y de vuelta.',
    challenge: 'Toca 1-2-3-5 en cada acorde de memoria. Luego inviértelo (5-3-2-1) y empieza en otro tiempo.',
    origin: 'Los «patrones digitales» como 1-2-3-5 se asocian sobre todo a John Coltrane (son muy audibles en «Giant Steps»); métodos como los de Jerry Coker y Jerry Bergonzi los sistematizaron.', build: exDigital },
  { id: 'ide-terceras', step: 'ideas', name: 'La escala en terceras',
    how: 'Recorre la escala saltando de a terceras (1-3, 2-4, 3-5…): suena a línea y entrena los arpegios a la vez.',
    challenge: 'Escala en terceras subiendo en un acorde y bajando en el siguiente.', build: exThirds },
  { id: 'ide-guia', step: 'ideas', name: 'Notas guía (3ª y 7ª)',
    how: 'Solo 3ªs y 7ªs, unidas por el movimiento más corto: la 7ª de un acorde suele bajar medio tono a la 3ª del siguiente. Es el esqueleto de la cadencia.',
    challenge: 'Toca solo notas guía en blancas. Después adórnalas con una nota de paso.', origin: 'Las líneas de notas guía son la base de casi todos los métodos de improvisación jazz.', build: (c) => fromSolo(c, 'guide', 2) },
  { id: 'ide-motivo', step: 'ideas', name: 'Un motivo que viaja',
    how: 'Una idea corta de 3–4 notas que se repite adaptada a cada acorde, se desplaza y se extiende: así un solo «cuenta una historia».',
    challenge: 'Inventa tu propio motivo de 3 notas y llévalo por toda la cadencia sin cambiar el ritmo.', build: (c) => fromSolo(c, 'motif', 2) },
  { id: 'beb-aprox', step: 'bebop', name: 'Llegar a la 3ª desde medio tono abajo',
    how: 'Corcheas de la escala y, justo antes de cada cambio, la nota a medio tono bajo la 3ª del acorde nuevo. La 3ª cae en el tiempo 1.',
    challenge: 'Elige la 3ª de cada acorde como meta y llega a ella desde medio tono abajo, siempre en el tiempo 1.', origin: 'Las aproximaciones cromáticas a notas del acorde son la base del bebop (Charlie Parker, Dizzy Gillespie).', build: (c) => exTargets(c, 'below') },
  { id: 'beb-encl', step: 'bebop', name: 'Enclosure: rodea la nota',
    how: 'Antes de la nota objetivo, una nota de la escala por arriba y otra medio tono por abajo: la «encierras». Es el sonido bebop por excelencia.',
    challenge: 'Rodea la 3ª de cada acorde (arriba-abajo-objetivo). Después prueba abajo-arriba-objetivo.', origin: 'Los enclosures (o «rodeos») son un sello del vocabulario de Charlie Parker y del bebop en general.', build: (c) => exTargets(c, 'enclosure') },
  { id: 'beb-escala', step: 'bebop', name: 'Escala bebop',
    how: 'Escala con una nota de paso cromática añadida: bajando en corcheas desde una nota del acorde, las notas del acorde caen en los tiempos.',
    challenge: 'Baja la escala bebop desde la 3ª, la 5ª y la 7ª de cada acorde. Fíjate en qué cae en cada tiempo.', origin: 'La «escala bebop» sistematiza lo que hacían los músicos del bebop; la enseñaron sobre todo David Baker y Barry Harris.', build: exBebopScale },
  { id: 'beb-linea', step: 'bebop', name: 'Línea bebop completa',
    how: 'Todo junto: corcheas continuas, notas del acorde en tiempo fuerte, enclosures y aproximaciones en cada cambio.',
    challenge: 'Toca la línea con la base y luego improvisa una tuya con las mismas reglas.', build: (c) => fromSolo(c, 'bebop', 3) },
  { id: 'fra-b9', step: 'frases', name: 'La b9 que resuelve',
    how: 'Sobre el V7, arpegio 3-5-b7-b9 (un acorde disminuido). La b9 baja medio tono a la 5ª del acorde de llegada.',
    challenge: 'Toca el arpegio b9 en cada V7 y resuelve. Después cambia el ritmo: empieza a contratiempo.',
    origin: 'Recurso típico del bebop (Charlie Parker, Dizzy Gillespie y, después, casi todos los músicos de jazz). Frase original construida con ese recurso.',
    needs: 'Necesita un V7 que resuelva una cuarta arriba (no hay en esta cadencia).', build: exB9 },
  { id: 'fra-tritono', step: 'frases', name: 'Arpegio del sustituto tritonal',
    how: 'Sobre el V7, el arpegio del dominante que está a un tritono (sobre G7, Db7). Comparten la 3ª y la 7ª; las demás notas son tensiones (b9, #11).',
    challenge: 'Usa el arpegio del sustituto en el V7 y resuelve por medio tono.', origin: 'La sustitución tritonal se volvió habitual en el bebop y el jazz moderno. Frase original con ese recurso.',
    needs: 'Necesita un V7 que resuelva una cuarta arriba (no hay en esta cadencia).', build: exTritone },
  { id: 'fra-penta', step: 'frases', name: 'Pentatónicas superpuestas',
    how: 'Una pentatónica que no empieza en la fundamental del acorde: sobre Dm7, E pentatónica menor (9-11-5-13-1). Suena moderna y abierta.',
    challenge: 'Toca grupos de 4 notas de la pentatónica indicada en cada acorde. Después mezcla dos pentatónicas.', origin: 'Superponer pentatónicas fue un sello del jazz modal y posbop (McCoy Tyner, John Coltrane).', build: exPenta },
  { id: 'fra-blues', step: 'frases', name: 'La 3ª del blues (b3 → 3)',
    how: 'La 3ª menor que «se dobla» hacia la 3ª mayor, y la b5 de paso en los acordes menores: el sabor del blues dentro del jazz.',
    challenge: 'Mete un b3 → 3 al inicio de cada acorde mayor o dominante. Respóndelo con una frase tuya.', origin: 'Lenguaje de la tradición del blues, presente en los grandes del jazz de todas las épocas.',
    needs: 'Necesita acordes mayores o dominantes.', build: exBlues },
];
export const exercisesOf = (step: StepId) => EXERCISES.filter((e) => e.step === step);
export const exerciseById = (id: string) => EXERCISES.find((e) => e.id === id) ?? EXERCISES[0];

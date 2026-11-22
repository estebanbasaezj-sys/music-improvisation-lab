// Generador de solos por «formas de tocar» y niveles 1–5. La misma progresión (o un pasaje, p. ej. el
// ii–V–I) se puede tocar de muchas maneras: con la escala de la tonalidad, por modos, con pentatónicas,
// con la escala blues, por terceras, por acordes, con notas guía, motivos, bebop… Cada forma reutiliza los
// generadores del explorador de cadencias y del taller; el nivel cambia el ritmo (blancas → negras →
// corcheas), el espacio entre frases y los recursos (aproximaciones y enclosures en los niveles altos).
import { rng } from '../audio/rng';
import { Chord, chordNotes, chordSymbol, seventhOf, thirdOf } from './chords';
import { ChordEvent } from './progressions';
import { IV, Note, pc, transposeNote } from './notes';
import { LineNote, availableTensions, chordStarts } from './line';
import { IdeaId, generateSolo, step } from './improv';
import { ExCtx, ExNamer, ExPhrase, ExResult, ExerciseDef, Figure, ScalePick, exerciseById, pickPcs, scaleOptions } from './cadence';
import { Great, greatById } from '../content/greats';

export type Level = 1 | 2 | 3 | 4 | 5;
export const LEVELS: { n: Level; name: string; rhythm: string; bpm: number; text: string }[] = [
  { n: 1, name: 'Primeros pasos', rhythm: 'blancas', bpm: 70, text: 'Pocas notas, largas y seguras (notas del acorde) y mucho espacio entre frases.' },
  { n: 2, name: 'Negras', rhythm: 'negras', bpm: 80, text: 'Una nota por tiempo y frases cortas con una respiración entre ellas.' },
  { n: 3, name: 'Corcheas', rhythm: 'corcheas', bpm: 100, text: 'Corcheas en swing, frases de 2–3 compases y silencios para respirar.' },
  { n: 4, name: 'Fluido', rhythm: 'corcheas + aproximaciones', bpm: 120, text: 'Líneas más largas que llegan a cada acorde nuevo con una aproximación cromática.' },
  { n: 5, name: 'Avanzado', rhythm: 'líneas largas + enclosures', bpm: 140, text: 'Líneas largas que rodean la nota de llegada en cada cambio (enclosures) y recursos de jazz moderno.' },
];

export type WayId = 'tonalidad' | 'modos' | 'pentatonicas' | 'blues' | 'terceras' | 'arpegios' | 'patron' | 'triesc' | 'grupos' | 'desplazar' | 'guia' | 'motivo' | 'pregunta' | 'espacio' | 'aproximacion' | 'enclosure' | 'bebop' | 'tritono' | 'b9' | 'mezcla' | Great['id'];
export type WayGroup = 'Escalas' | 'Acordes' | 'Frases' | 'Jazz' | 'Estilos' | 'Mezcla';
export interface WayDef {
  id: WayId;
  name: string;
  icon: string;
  group: WayGroup;
  short: string;
  how: string;
  challenge: string;
  minLevel: Level;
  /** qué cambia en cada nivel (1 a 5) */
  perLevel?: string[];
  needsResolve?: boolean;
  /** forma «al estilo de» un músico (frases originales con sus recursos, no transcripciones) */
  great?: Great['id'];
}

export const WAYS: WayDef[] = [
  { id: 'tonalidad', name: 'Una escala para todo', icon: '📏', group: 'Escalas', minLevel: 1,
    short: 'La escala de la tonalidad en una línea continua: lo más fácil para empezar.',
    how: 'Piensas en la tonalidad y no acorde por acorde: la misma colección de notas sirve para casi todos los acordes. Si un acorde trae una nota de fuera de la tonalidad, en ese acorde la línea usa su escala (lo verás en la lista de escalas).',
    challenge: 'Recorre la escala de la tonalidad en toda la progresión sin detenerte en los cambios: sube y baja como si fuera una sola frase.' },
  { id: 'modos', name: 'Modos (una escala por acorde)', icon: '🎨', group: 'Escalas', minLevel: 1,
    short: 'Cada acorde con su modo: dórico, mixolidio, jónico…',
    how: 'Cambias de escala en cada acorde para que se oiga la armonía: las notas que cambian de un modo al siguiente son las que dibujan la progresión.',
    perLevel: ['cada modo desde la fundamental, en blancas', 'cada modo desde la fundamental, en negras', 'modos conectados sin volver a la fundamental', 'modos conectados + aproximación a cada acorde', 'modos conectados + enclosures en los cambios'],
    challenge: 'Toca cada acorde con su modo desde la fundamental; después conéctalos sin volver a la fundamental.' },
  { id: 'pentatonicas', name: 'Pentatónicas', icon: '🖐️', group: 'Escalas', minLevel: 1,
    short: 'Cinco notas sin choques. En niveles 4–5, pentatónicas superpuestas (sonido moderno).',
    how: 'La pentatónica de cada acorde (mayor en acordes mayores y dominantes, menor en los menores) no tiene notas que choquen: suena bien desde el primer día. En los niveles altos se superponen pentatónicas que empiezan en otra nota del acorde (sobre Dm7, Mi menor = 9-11-5-13-1).',
    perLevel: ['pentatónica de cada acorde, en blancas', 'pentatónica de cada acorde, en negras', 'pentatónica de cada acorde, en corcheas', 'pentatónicas superpuestas en grupos de 4', 'pentatónicas superpuestas + enclosures'],
    challenge: 'Improvisa solo con la pentatónica de cada acorde. Luego toca grupos de 4 notas (1-2-3-4, 2-3-4-5…).' },
  { id: 'blues', name: 'Escala blues', icon: '🎸', group: 'Escalas', minLevel: 1,
    short: 'Una escala con «notas azules» para toda la progresión: frases con sabor.',
    how: 'La escala blues de la tonalidad (pentatónica menor + b5) sirve para toda la progresión; en tonalidad mayor se usa la blues mayor, con el movimiento b3 → 3. En los niveles bajos, frases de pregunta y respuesta; en los altos, líneas largas con la escala blues.',
    perLevel: ['pregunta y respuesta con notas largas', 'pregunta y respuesta', 'pregunta y respuesta con rellenos', 'líneas con la escala blues + aproximaciones', 'líneas con la escala blues + enclosures'],
    challenge: 'Inventa una frase con la escala blues, repítela una vez y respóndela con otra que termine en la tónica.' },
  { id: 'terceras', name: 'Por terceras', icon: '🪜', group: 'Escalas', minLevel: 2,
    short: 'La escala saltando de a terceras: suena a línea y entrena los arpegios a la vez.',
    how: 'Recorres la escala de cada acorde por saltos de tercera (1-3, 2-4, 3-5…). Es un ejercicio clásico que convierte la escala en melodía.',
    challenge: 'Toca la escala en terceras subiendo en un acorde y bajando en el siguiente.' },
  { id: 'arpegios', name: 'Por acordes (arpegios)', icon: '🔺', group: 'Acordes', minLevel: 1,
    short: 'Las notas de cada acorde: el esqueleto de la armonía.',
    how: 'Tocas las notas del acorde que suena. Según el nivel: tríadas, arpegios de séptima, arpegios que se conectan por la nota más cercana y, al final, 3-5-7-9 (un «acorde superior» dentro de cada acorde).',
    perLevel: ['tríadas (1 y 3) en blancas', 'tríadas 1-3-5-8 en negras', 'arpegios de séptima 1-3-5-7', 'arpegios conectados por la nota más cercana', 'acordes superiores 3-5-7-9'],
    challenge: 'Toca el arpegio de cada acorde sin pararte en los cambios. Después empieza cada arpegio en la nota más cercana a la anterior.' },
  { id: 'patron', name: 'Patrón 1-2-3-5', icon: '🔢', group: 'Acordes', minLevel: 2,
    short: 'Un patrón de 4 notas que viaja por todos los acordes.',
    how: 'Fundamental, 2ª, 3ª y 5ª de cada acorde, de ida y de vuelta. Los patrones digitales se asocian sobre todo a John Coltrane; métodos como los de Jerry Coker y Jerry Bergonzi los sistematizaron.',
    challenge: 'Toca 1-2-3-5 en cada acorde de memoria; luego 5-3-2-1, y después empieza el patrón en otro tiempo.' },
  { id: 'triesc', name: 'Tríadas + escalas', icon: '🔀', group: 'Acordes', minLevel: 2,
    short: 'Sube por la tríada y baja por la escala (o al revés): arpegio y escala combinados.',
    how: 'Combina las notas del acorde con la escala: tríada arriba y escala abajo, o escala arriba y tríada abajo hasta la 7ª de abajo, que empuja al acorde siguiente. Suena a melodía y no a ejercicio.',
    challenge: 'Un acorde con tríada-escala y el siguiente con escala-tríada, sin detenerte.' },
  { id: 'grupos', name: 'Grupos de 3 y 5 (sin cuadratura)', icon: '🧮', group: 'Frases', minLevel: 3,
    short: 'Celdas de 3 o 5 notas sobre un compás de 4: el acento cae cada vez en otro lugar.',
    how: 'Tríadas de la escala en grupos de 3 (nivel 3) o celdas de 5 notas que combinan tríada y escala (niveles 4–5), tocadas sin parar sobre el compás de 4: las celdas cruzan los tiempos y la barra de compás.',
    perLevel: ['', '', 'grupos de 3: tríadas de la escala en secuencia', 'grupos de 5: tríada + escala', 'grupos de 5 + enclosures en los cambios'],
    challenge: 'Acentúa la primera nota de cada grupo y siente cómo se desplaza respecto del pulso.' },
  { id: 'desplazar', name: 'Desplazamiento rítmico', icon: '↪️', group: 'Frases', minLevel: 3,
    short: 'La misma idea empezando en el «y» del 1 o en el tiempo 2: otro acento.',
    how: 'Una frase de tríada + escala que no empieza en el tiempo 1: en un acorde arranca en el «y» del 1 y en el siguiente en el tiempo 2. Mismas notas, otra sensación.',
    challenge: 'Toca una idea tuya empezando en el «y» del 1, luego en el 2 y luego en el «y» del 2.' },
  { id: 'guia', name: 'Notas guía (3ª y 7ª)', icon: '🧭', group: 'Acordes', minLevel: 1,
    short: '3ªs y 7ªs unidas por el camino más corto. En los niveles altos, líneas que llegan a ellas.',
    how: 'Las notas guía definen cada acorde con solo dos notas; la 7ª de un acorde suele bajar medio tono a la 3ª del siguiente. En los niveles altos, la línea en corcheas «apunta» a esas notas en cada cambio.',
    perLevel: ['una nota guía por acorde', 'dos notas guía por acorde', 'líneas que llegan a las notas guía', 'líneas a notas guía con más cromatismo', 'líneas a notas guía con enclosures'],
    challenge: 'Toca solo 3ªs y 7ªs en blancas; después adórnalas con una nota de paso.' },
  { id: 'motivo', name: 'Motivo y desarrollo', icon: '💡', group: 'Frases', minLevel: 1,
    short: 'Una idea corta que se repite, se adapta y se transforma.',
    how: 'Un motivo de 3–4 notas que se repite adaptado a cada acorde, se desplaza en el tiempo y se extiende: así un solo «cuenta una historia» en lugar de encadenar notas.',
    challenge: 'Inventa un motivo de 3 notas y llévalo por toda la progresión sin cambiarle el ritmo.' },
  { id: 'pregunta', name: 'Pregunta y respuesta', icon: '💬', group: 'Frases', minLevel: 1,
    short: 'Una frase que pregunta y otra que responde, como en el blues cantado.',
    how: 'Una pregunta de 2 compases, silencio, la misma pregunta sobre el acorde siguiente y una respuesta que resuelve en la tónica (estructura AAB del blues).',
    challenge: 'Pregunta de 2 compases, 2 de silencio. Repite la pregunta y luego respóndela.' },
  { id: 'espacio', name: 'Ritmo y espacio', icon: '⏸️', group: 'Frases', minLevel: 1,
    short: 'Pocas notas, en contratiempos y anticipaciones: el swing está en la colocación.',
    how: 'Notas del acorde, muy pocas, en lugares inesperados: contratiempos y anticipaciones (la nota del acorde siguiente llega medio tiempo antes).',
    challenge: 'Máximo 4 notas cada 2 compases. Empieza cada frase en un contratiempo distinto.' },
  { id: 'aproximacion', name: 'Aproximaciones cromáticas', icon: '↗️', group: 'Jazz', minLevel: 3,
    short: 'Llegar a la 3ª de cada acorde desde medio tono abajo, en el tiempo 1.',
    how: 'Corcheas de la escala y, justo antes de cada cambio, la nota a medio tono de la nota de llegada. Es la base del lenguaje bebop (Charlie Parker, Dizzy Gillespie).',
    challenge: 'Elige la 3ª de cada acorde como meta y llega a ella desde medio tono abajo, siempre en el tiempo 1.' },
  { id: 'enclosure', name: 'Enclosures (rodear la nota)', icon: '🎯', group: 'Jazz', minLevel: 3,
    short: 'Antes de la nota de llegada, una nota por arriba y otra por abajo.',
    how: 'La nota objetivo se «encierra»: una nota de la escala por arriba, otra medio tono por abajo, y llega en el tiempo 1. Es un sello del vocabulario de Charlie Parker.',
    challenge: 'Rodea la 3ª de cada acorde (arriba-abajo-objetivo). Después prueba abajo-arriba-objetivo.' },
  { id: 'bebop', name: 'Bebop', icon: '🎷', group: 'Jazz', minLevel: 3,
    short: 'Escala bebop y líneas largas: notas del acorde en tiempo fuerte, cromatismos en los débiles.',
    how: 'En nivel 3, la escala bebop (una nota de paso añadida para que las notas del acorde caigan en los tiempos). En niveles 4–5, líneas completas con enclosures y aproximaciones en cada cambio.',
    perLevel: ['', '', 'escala bebop bajando desde notas del acorde', 'línea bebop completa', 'línea bebop completa (más densa)'],
    challenge: 'Toca una línea de corcheas de 2 compases que caiga en una nota del acorde en cada tiempo 1 y 3.' },
  { id: 'tritono', name: 'Sustituto tritonal', icon: '🔀', group: 'Jazz', minLevel: 4, needsResolve: true,
    short: 'Sobre el V7, el arpegio del dominante a un tritono (sobre G7, Db7).',
    how: 'El sustituto tritonal comparte la 3ª y la 7ª con el V7; sus otras notas son tensiones (b9, #11). Se volvió habitual en el bebop y el jazz moderno.',
    challenge: 'Usa el arpegio del sustituto en cada V7 y resuelve por medio tono.' },
  { id: 'b9', name: 'La b9 que resuelve', icon: '⚡', group: 'Jazz', minLevel: 4, needsResolve: true,
    short: 'Arpegio 3-5-b7-b9 en el V7; la b9 baja medio tono a la 5ª del acorde siguiente.',
    how: 'El arpegio desde la 3ª del V7 con la b9 forma un acorde disminuido. Recurso típico del bebop (Charlie Parker, Dizzy Gillespie). Frase original construida con ese recurso.',
    challenge: 'Toca el arpegio b9 en cada V7 y resuelve; luego empieza a contratiempo.' },
  { id: 'parker', great: 'parker', name: 'Charlie Parker', icon: '🐦', group: 'Estilos', minLevel: 3,
    short: 'Bebop: corcheas largas, enclosures y el arpegio b9 que resuelve.',
    how: 'Líneas bebop con las notas del acorde en los tiempos fuertes, enclosures y aproximaciones en cada cambio y, sobre cada V7 que resuelve, el arpegio 3-5-b7-b9.',
    challenge: 'Toca una línea de corcheas que llegue a cada acorde con un enclosure y usa el arpegio b9 en el V7.' },
  { id: 'coltrane', great: 'coltrane', name: 'John Coltrane', icon: '🌀', group: 'Estilos', minLevel: 3,
    short: 'Patrones 1-2-3-5 y pentatónicas superpuestas, notas cercanas entre sí.',
    how: 'Alterna patrones digitales 1-2-3-5 en un acorde con pentatónicas superpuestas en el siguiente: líneas densas, con notas cercanas, que recorren la armonía.',
    challenge: 'Toca 1-2-3-5 en un acorde y una pentatónica superpuesta en el siguiente, sin cortar.' },
  { id: 'miles', great: 'miles', name: 'Miles Davis', icon: '🎺', group: 'Estilos', minLevel: 1,
    short: 'Pocas notas, registro medio, tensiones (9ª y 13ª) y mucho silencio.',
    how: 'Pocas notas colocadas con intención, en el registro medio, eligiendo tensiones cantables (9ª y 13ª) además de 3ª y 5ª. El silencio es parte de la frase.',
    challenge: 'Máximo 3 notas por compás, en el registro medio, terminando las frases en una 9ª o una 13ª.' },
  { id: 'lester', great: 'lester', name: 'Lester Young', icon: '🎩', group: 'Estilos', minLevel: 2,
    short: 'Línea «horizontal» con la escala de la tonalidad, relajada y con notas repetidas.',
    how: 'Piensa en la tonalidad y no acorde por acorde: una línea melódica y relajada, que entra después del tiempo y repite algunas notas, en el registro medio.',
    challenge: 'Toca una línea con la escala de la tonalidad que empiece en el «y» del 1 y repita alguna nota.' },
  { id: 'rollins', great: 'rollins', name: 'Sonny Rollins', icon: '🌉', group: 'Estilos', minLevel: 1,
    short: 'Improvisación temática: un motivo que se repite, se varía y se desarrolla.',
    how: 'Una idea corta se convierte en el tema del solo: se repite, se adapta a cada acorde, se desplaza y se extiende.',
    challenge: 'Elige un motivo de 3 notas y no lo abandones durante toda la vuelta: cámbiale solo el final o el ritmo.' },
  { id: 'cannonball', great: 'cannonball', name: 'Cannonball Adderley', icon: '🔥', group: 'Estilos', minLevel: 3,
    short: 'Bebop con mucho blues: líneas rápidas que terminan en frases de blues.',
    how: 'Alterna líneas bebop (aproximaciones cromáticas) con frases de blues (b3 → 3, escala blues): el «soul jazz».',
    challenge: 'Toca una línea bebop de 2 compases y respóndela con una frase de blues.' },
  { id: 'bbking', great: 'bbking', name: 'B.B. King (blues)', icon: '🎸', group: 'Estilos', minLevel: 1,
    short: 'Economía, pregunta y respuesta y la 3ª que se dobla de menor a mayor.',
    how: 'Frases cortas de blues que preguntan y responden, con la b3 que sube a la 3ª y mucho espacio entre frases.',
    challenge: 'Haz una pregunta corta, deja espacio y respóndela con un b3 → 3.' },
  { id: 'mezcla', name: 'Mezcla: combina formas', icon: '🎲', group: 'Mezcla', minLevel: 1,
    short: 'Cada tramo con una forma distinta, para comparar y aprender a combinarlas.',
    how: 'Un solo hecho con varias formas: un tramo con pentatónica, otro con arpegios, otro con la escala blues… Así escuchas cómo cambia el carácter y practicas pasar de una idea a otra.',
    challenge: 'Toca un tramo con una forma y el siguiente con otra distinta, sin detenerte.' },
];
export const wayById = (id: WayId) => WAYS.find((w) => w.id === id) ?? WAYS[0];
export const WAY_GROUPS: WayGroup[] = ['Escalas', 'Acordes', 'Frases', 'Jazz', 'Estilos', 'Mezcla'];
/** Equivalencias con las ideas antiguas del taller (para lecciones y canciones que piden una idea). */
export const WAY_FROM_IDEA: Record<IdeaId, WayId> = { guide: 'guia', targets: 'aproximacion', arpeggios: 'arpegios', motif: 'motivo', blues: 'pregunta', space: 'espacio', bebop: 'bebop' };

export interface WayRequest {
  events: ChordEvent[];
  keyRoot: Note;
  minor: boolean;
  blues: boolean;
  range: { lo: number; hi: number };
  level: Level;
  seed: number;
  names: ExNamer;
  scaleName: (p: ScalePick) => string;
  /** figura elegida (negras, corcheas, semicorcheas); sin elegir, la del nivel */
  figure?: Figure;
}
export interface WayResult { title: string; summary: string; notes: LineNote[]; phrases: ExPhrase[]; picks?: ScalePick[]; parts?: { start: number; end: number; way: WayId }[]; figureApplied?: boolean }

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const isDom = (c: Chord) => ['7', '9', '13', '7b9', '7#9'].includes(c.quality.id);
const isMin = (c: Chord) => ['m7', 'm6', 'm9', 'm', 'mMaj7'].includes(c.quality.id);
const totalOf = (evts: ChordEvent[]) => evts.reduce((s, e) => s + e.beats, 0);

/** ¿Hay algún V7 que resuelva una cuarta arriba (contando la vuelta al principio)? */
export function hasResolvingDominant(evts: ChordEvent[]): boolean {
  return evts.some((e, i) => {
    if (!isDom(e.chord)) return false;
    let k = (i + 1) % evts.length;
    while (k !== i && chordSymbol(evts[k].chord) === chordSymbol(e.chord)) k = (k + 1) % evts.length;
    return k !== i && mod12(pc(evts[k].chord.root) - pc(e.chord.root)) === 5;
  });
}
export function wayAvailable(id: WayId, req: Pick<WayRequest, 'events' | 'level'>): { ok: boolean; reason?: string } {
  const w = wayById(id);
  if (req.level < w.minLevel) return { ok: false, reason: `Desde el nivel ${w.minLevel}` };
  if (w.needsResolve && !hasResolvingDominant(req.events)) return { ok: false, reason: 'Necesita un V7 que resuelva' };
  return { ok: true };
}

// ---------------------------------------------------------------- escalas por acorde según la forma
const ctxLike = (req: WayRequest) => ({ blues: req.blues, minor: req.minor, loops: true });
const modePicks = (req: WayRequest): ScalePick[] => req.events.map((_, i) => scaleOptions(ctxLike(req), req.events, i)[0]);
function keyPicks(req: WayRequest): ScalePick[] {
  const base: ScalePick = { root: req.keyRoot, scale: req.blues ? 'mixolydian' : req.minor ? 'dorian' : 'major' };
  const pcs = pickPcs(base);
  return req.events.map((e, i) => ([thirdOf(e.chord), seventhOf(e.chord)].every((n) => !n || pcs.includes(pc(n))) ? base : scaleOptions(ctxLike(req), req.events, i)[0]));
}
function pentPicks(req: WayRequest): ScalePick[] {
  return req.events.map((e, i) => {
    const c = e.chord;
    if (c.quality.id === 'm7b5') return { root: transposeNote(c.root, IV.b3), scale: 'pentMinor' };
    if (isMin(c)) return { root: c.root, scale: 'pentMinor' };
    if (c.quality.id === 'dim7') return scaleOptions(ctxLike(req), req.events, i)[0];
    return { root: c.root, scale: 'pentMajor' };
  });
}
const bluesPicks = (req: WayRequest): ScalePick[] => req.events.map(() => ({ root: req.keyRoot, scale: req.minor || req.blues ? 'blues' : 'bluesMajor' }));

// ---------------------------------------------------------------- forma rítmica según el nivel
function exCtx(req: WayRequest, picks: ScalePick[], events = req.events): ExCtx {
  return { events, picks, range: req.range, keyRoot: req.keyRoot, minor: req.minor, blues: req.blues, loops: true, seed: req.seed, names: req.names, scaleName: req.scaleName };
}
/** Genera con la progresión «comprimida» k veces y luego la estira: corcheas → negras (k=2) → blancas (k=4). */
function timeScaled(req: WayRequest, k: number, exId: string, picks: ScalePick[]): ExResult | null {
  const ev = req.events.map((e) => ({ ...e, beats: e.beats / k }));
  const r = exerciseById(exId).build(exCtx(req, picks, ev));
  if (!r) return null;
  return {
    notes: r.notes.map((n) => ({ ...n, start: n.start * k, dur: n.dur * k })).filter((n) => n.dur > 1e-6),
    phrases: r.phrases.map((p) => ({ ...p, start: p.start * k, end: p.end * k })),
  };
}
function retitle(ph: ExPhrase[]): ExPhrase[] {
  return ph.map((p) => {
    const a = Math.floor(p.start / 4 + 1e-9) + 1;
    const b = Math.max(a, Math.ceil(p.end / 4 - 1e-9));
    const label = a === b ? `Compás ${a}` : `Compases ${a}–${b}`;
    const title = p.title.replace(/^Compases [\d.]+–[\d.]+/, label).replace(/^Compás [\d.]+/, label);
    return { ...p, title };
  });
}
function chordAt(evts: ChordEvent[], t: number): { chord: Chord; i: number; start: number } {
  const st = chordStarts(evts);
  let i = 0;
  while (i + 1 < st.length && st[i + 1] <= t + 1e-9) i++;
  return { chord: evts[i].chord, i, start: st[i] };
}
const SEMI_TENSION: Record<number, string> = { 1: 'b9', 2: '9', 3: '#9', 5: '11', 6: '#11', 8: 'b13', 9: '13' };
/** Nivel 1: notas largas seguras. Las notas que chocan (no son del acorde ni tensiones disponibles, como la
 * 4ª sobre un acorde mayor) se mueven a la nota del acorde más cercana; las tensiones (9, 13…) se respetan. */
function snapChordTones(notes: LineNote[], evts: ChordEvent[]): LineNote[] {
  return notes.map((n) => {
    const c = chordAt(evts, n.start).chord;
    const ct = chordNotes(c).slice(0, 4).map(pc);
    if (ct.includes(mod12(n.midi))) return n;
    const tension = SEMI_TENSION[mod12(n.midi - pc(c.root))];
    if (tension && availableTensions(c).includes(tension)) return n;
    let best = n.midi; let bd = 99;
    for (let d = -3; d <= 3; d++) if (ct.includes(mod12(n.midi + d)) && Math.abs(d) < bd) { bd = Math.abs(d); best = n.midi + d; }
    return { ...n, midi: best };
  });
}
/** Silencios entre frases según el nivel (en pasajes largos) y una respiración al final de la vuelta. */
function restPlan(notes: LineNote[], level: Level, total: number): LineNote[] {
  const rests: [number, number][] = [];
  const bars = total / 4;
  const breathEnd = level <= 3 ? 2 : level === 4 ? 1 : 0.5;
  if (bars >= 8) {
    const plan: Record<Level, [number, number]> = { 1: [2, 2], 2: [3, 1], 3: [3, 1], 4: [4, 0], 5: [8, 0] };
    const [play, rest] = plan[level];
    for (let b = 0; b < bars; b += play + rest) {
      if (rest) rests.push([(b + play) * 4, Math.min(total, (b + play + rest) * 4)]);
      else rests.push([Math.min(total, (b + play) * 4) - (level === 4 ? 1.5 : 2), Math.min(total, (b + play) * 4)]);
    }
  }
  rests.push([total - breathEnd, total]);
  const inRest = (t: number) => rests.some(([a, b]) => t >= a - 1e-9 && t < b - 1e-9);
  const kept = notes.filter((n) => !inRest(n.start));
  // la última nota antes de cada silencio se alarga (fin de frase)
  return kept.map((n, i) => {
    const nx = kept[i + 1];
    const until = nx ? nx.start : total;
    const restStart = rests.find(([a]) => a > n.start - 1e-9 && a < until + 1e-9)?.[0];
    if (restStart !== undefined && restStart - n.start > n.dur) return { ...n, dur: Math.min(1.5, restStart - n.start) };
    return { ...n, dur: Math.min(n.dur, until - n.start) };
  });
}
/** Niveles 4–5: en cada cambio de acorde, aproximación cromática (4) o enclosure (5) a la nota de llegada. */
function addApproaches(notes: LineNote[], req: WayRequest, picks: ScalePick[], level: Level): LineNote[] {
  const out = notes.map((n) => ({ ...n }));
  const st = chordStarts(req.events);
  const at = (t: number) => out.findIndex((n) => Math.abs(n.start - t) < 1e-6);
  for (let i = 1; i < st.length; i++) {
    const T = st[i];
    const li = at(T);
    if (li < 0) continue;
    const land = out[li].midi;
    const p1 = at(T - 0.5);
    if (p1 < 0 || Math.abs(out[p1].dur - 0.5) > 1e-6) continue;
    if (['below', 'above', 'enclosure', 'double'].includes(out[p1].tech ?? '')) continue;
    if (level >= 5) {
      const p2 = at(T - 1);
      if (p2 >= 0 && Math.abs(out[p2].dur - 0.5) < 1e-6) {
        const above = step(land, pickPcs(picks[i - 1]), 1, req.range.lo - 12, req.range.hi + 12);
        if (above - land <= 2) { out[p2] = { ...out[p2], midi: above, tech: 'enclosure' }; out[p1] = { ...out[p1], midi: land - 1, tech: 'enclosure' }; continue; }
      }
    }
    if (Math.abs(out[p1].midi - (land - 1)) <= 5) out[p1] = { ...out[p1], midi: land - 1, tech: 'below' };
  }
  return out;
}
function fit(notes: LineNote[], r: { lo: number; hi: number }) {
  return notes.map((n) => { let m = n.midi; while (m < r.lo) m += 12; while (m > r.hi) m -= 12; return { ...n, midi: m }; });
}

/** Forma «de escala o de arpegio»: generador en corcheas, ritmo y recursos según el nivel. */
let figureUsed = false;
function shaped(req: WayRequest, exId: string, picks: ScalePick[], opts: { approaches?: boolean } = {}): ExResult | null {
  const k = req.figure ? { q: 2, e: 1, s: 0.5 }[req.figure] : req.level === 1 ? 4 : req.level === 2 ? 2 : 1;
  if (req.figure) figureUsed = true;
  const r = timeScaled(req, k, exId, picks);
  if (!r) return null;
  const total = totalOf(req.events);
  let notes = r.notes;
  if (req.level === 1) notes = snapChordTones(notes, req.events);
  notes = restPlan(notes, req.level, total);
  if (req.level >= 4 && opts.approaches !== false) notes = addApproaches(notes, req, picks, req.level);
  return { notes: fit(notes, req.range), phrases: retitle(r.phrases) };
}
function fromIdea(req: WayRequest, idea: IdeaId, levelMap: (1 | 2 | 3)[]): ExResult {
  const s = generateSolo({ events: req.events, keyRoot: req.keyRoot, minor: req.minor, blues: req.blues, range: req.range, level: levelMap[req.level - 1], seed: req.seed, idea, names: req.names });
  return { notes: s.notes, phrases: s.phrases };
}

function buildWay(id: WayId, req: WayRequest): (ExResult & { picks?: ScalePick[] }) | null {
  const L = req.level;
  switch (id) {
    case 'tonalidad': { const p = keyPicks(req); const r = shaped(req, 'esc-cont', p); return r && { ...r, picks: p }; }
    case 'modos': { const p = modePicks(req); const r = shaped(req, L <= 2 ? 'esc-fund' : 'esc-cont', p); return r && { ...r, picks: p }; }
    case 'pentatonicas': {
      if (L <= 3) { const p = pentPicks(req); const r = shaped(req, 'esc-cont', p); return r && { ...r, picks: p }; }
      const p = modePicks(req); const r = shaped(req, 'fra-penta', p); return r && { ...r, picks: p };
    }
    case 'blues': {
      if (L <= 3) return fromIdea(req, 'blues', [1, 2, 3, 3, 3]);
      const p = bluesPicks(req); const r = shaped(req, 'esc-cont', p); return r && { ...r, picks: p };
    }
    case 'terceras': { const p = modePicks(req); const r = shaped(req, 'ide-terceras', p); return r && { ...r, picks: p }; }
    case 'arpegios': { const p = modePicks(req); return shaped(req, ['arp-triada', 'arp-triada', 'arp-7', 'arp-cerca', 'arp-sup'][L - 1], p); }
    case 'patron': { const p = modePicks(req); return shaped(req, 'ide-1235', p); }
    case 'triesc': { const p = modePicks(req); const r = shaped(req, req.seed % 2 ? 'com-tri-esc' : 'com-esc-tri', p); return r && { ...r, picks: p }; }
    case 'grupos': { const p = modePicks(req); const r = shaped(req, L <= 3 ? 'com-3' : 'com-5', p); return r && { ...r, picks: p }; }
    case 'desplazar': { const p = modePicks(req); return shaped(req, 'com-desp', p, { approaches: false }); }
    case 'guia':
      if (L <= 2) return fromIdea(req, 'guide', [1, 2, 2, 2, 2]);
      if (L === 3) return fromIdea(req, 'targets', [2, 2, 2, 3, 3]);
      return shaped(req, L === 4 ? 'beb-aprox' : 'beb-encl', modePicks(req), { approaches: false });
    case 'motivo': return fromIdea(req, 'motif', [1, 1, 2, 3, 3]);
    case 'pregunta': return fromIdea(req, 'blues', [1, 1, 2, 3, 3]);
    case 'espacio': return fromIdea(req, 'space', [1, 1, 2, 3, 3]);
    case 'aproximacion': return shaped(req, 'beb-aprox', modePicks(req), { approaches: false });
    case 'enclosure': return shaped(req, 'beb-encl', modePicks(req), { approaches: false });
    case 'bebop': return L <= 3 ? shaped(req, 'beb-escala', modePicks(req)) : fromIdea(req, 'bebop', [3, 3, 3, 3, 3]);
    case 'tritono': return shaped(req, 'fra-tritono', modePicks(req), { approaches: false });
    case 'b9': return shaped(req, 'fra-b9', modePicks(req), { approaches: false });
    case 'parker': return styleParker(req);
    case 'coltrane': return styleColtrane(req);
    case 'miles': return styleMiles(req);
    case 'lester': return styleLester(req);
    case 'rollins': return fromIdea(req, 'motif', [1, 1, 2, 3, 3]);
    case 'cannonball': return styleCannonball(req);
    case 'bbking': return styleBBKing(req);
    case 'mezcla': return null;
  }
}

// ---------------------------------------------------------------- estilos de los grandes
/** Reemplaza la base por `top` dentro de las ventanas de tiempo [a, b). */
function overlay(base: LineNote[], top: LineNote[], windows: [number, number][]): LineNote[] {
  const inW = (t: number) => windows.some(([a, b]) => t >= a - 1e-9 && t < b - 1e-9);
  const all = [...base.filter((n) => !inW(n.start)), ...top.filter((n) => inW(n.start))].sort((a, b) => a.start - b.start);
  return all.map((n, i) => ({ ...n, dur: all[i + 1] ? Math.min(n.dur, all[i + 1].start - n.start) : n.dur })).filter((n) => n.dur > 1e-6);
}
/** Frases de la base, con el texto de `top` donde la ventana se superpone. */
function mergePhrases(base: ExPhrase[], top: ExPhrase[], windows: [number, number][]): ExPhrase[] {
  return base.map((p) => {
    const w = windows.some(([a, b]) => a < p.end && b > p.start);
    const t = w ? top.filter((q) => q.start < p.end && q.end > p.start).map((q) => q.text).filter(Boolean) : [];
    return t.length ? { ...p, text: `${p.text} ${[...new Set(t)].join(' ')}`.trim() } : p;
  });
}
const segWindows = (req: WayRequest, keep: (i: number, c: Chord) => boolean): [number, number][] => {
  const st = chordStarts(req.events);
  return req.events.map((e, i) => [st[i], st[i] + e.beats, i, e.chord] as const).filter(([, , i, c]) => keep(i, c)).map(([a, b]) => [a, b] as [number, number]);
};
const REL_LABEL = ['fundamental', 'b9', '9ª', 'b3', '3ª', '11ª', '#11', '5ª', 'b13', '13ª', 'b7', '7ª'];

function styleParker(req: WayRequest): ExResult | null {
  const base = req.level >= 4 ? fromIdea(req, 'bebop', [3, 3, 3, 3, 3]) : shaped(req, 'beb-encl', modePicks(req), { approaches: false });
  if (!base) return null;
  if (!hasResolvingDominant(req.events)) return base;
  const top = shaped({ ...req, level: Math.max(4, req.level) as Level }, 'fra-b9', modePicks(req), { approaches: false });
  if (!top) return base;
  // ventanas: los dos últimos tiempos de cada V7 que resuelve y la llegada al acorde siguiente
  const st = chordStarts(req.events);
  const wins: [number, number][] = [];
  req.events.forEach((e, i) => {
    const nx = req.events[i + 1];
    if (!nx || !isDom(e.chord) || chordSymbol(nx.chord) === chordSymbol(e.chord) || mod12(pc(nx.chord.root) - pc(e.chord.root)) !== 5) return;
    const end = st[i] + e.beats;
    wins.push([Math.max(st[i], end - 2), Math.min(totalOf(req.events), end + 2)]);
  });
  return { notes: overlay(base.notes, top.notes, wins), phrases: mergePhrases(base.phrases, top.phrases.map((p) => ({ ...p, text: p.text.split('. ').filter((x) => /b9/.test(x)).join('. ') })), wins) };
}
function styleColtrane(req: WayRequest): ExResult | null {
  const p = modePicks(req);
  const base = shaped(req, 'ide-1235', p);
  const top = shaped(req, 'fra-penta', p);
  if (!base || !top) return base ?? top;
  const wins = segWindows(req, (i) => i % 2 === 1);
  return { notes: overlay(base.notes, top.notes, wins), phrases: mergePhrases(base.phrases, top.phrases, wins) };
}
function styleMiles(req: WayRequest): ExResult {
  const r = fromIdea(req, 'space', [1, 1, 2, 2, 3]);
  const c0 = Math.round((req.range.lo + req.range.hi) / 2);
  let prev = c0;
  const notes = r.notes.map((n) => {
    const c = chordAt(req.events, n.start).chord;
    const degs = c.quality.id === 'm7b5' ? [3, 5, 10, 7] : c.quality.id === 'dim7' ? [0, 3, 6, 9] : isDom(c) ? [2, 9, 4, 7] : isMin(c) ? [2, 9, 3, 7] : [2, 9, 4, 7];
    const pcs = degs.map((d) => mod12(pc(c.root) + d));
    let best = n.midi; let bd = 99;
    for (let m = c0 - 6; m <= c0 + 7; m++) {
      if (!pcs.includes(mod12(m)) || m < req.range.lo || m > req.range.hi) continue;
      const d = Math.abs(m - prev) + (m === prev ? 3 : 0);
      if (d < bd) { bd = d; best = m; }
    }
    prev = best;
    return { ...n, midi: best, tech: 'miles' };
  });
  const phrases = r.phrases.map((p) => {
    const ns = notes.filter((n) => n.start >= p.start - 1e-9 && n.start < p.end - 1e-9);
    const txt = ns.map((n) => { const c = chordAt(req.events, n.start).chord; return `${REL_LABEL[mod12(n.midi - pc(c.root))]} de ${req.names.chord(c)}`; }).join(', ');
    return { ...p, text: `${txt || 'Silencio'}. Pocas notas en el registro medio: el silencio también es música.` };
  });
  return { notes, phrases };
}
function styleLester(req: WayRequest): ExResult | null {
  const lv = Math.min(req.level, 3) as Level;
  const base = shaped({ ...req, level: lv }, 'esc-cont', keyPicks(req), { approaches: false });
  if (!base) return null;
  const T = totalOf(req.events);
  // entra después del tiempo (en el «y») y repite la nota del tiempo 3
  const shift = lv >= 3 ? 0.5 : 0;
  let notes = base.notes.map((n) => ({ ...n, start: n.start + shift })).filter((n) => n.start < T - 1e-9).map((n) => ({ ...n, dur: Math.min(n.dur, T - n.start) }));
  notes = notes.map((n, i) => (i > 0 && Math.abs((n.start % 4) - (2 + shift)) < 1e-6 ? { ...n, midi: notes[i - 1].midi, tech: 'repetida' } : n));
  return { notes, phrases: base.phrases.map((p) => ({ ...p, text: `${p.text} Frase relajada: entra después del tiempo y repite notas.` })) };
}
function styleCannonball(req: WayRequest): ExResult | null {
  const T = totalOf(req.events);
  const bebop = shaped(req, 'beb-aprox', modePicks(req), { approaches: false });
  const blues = T >= 32 ? fromIdea(req, 'blues', [3, 3, 3, 3, 3]) : shaped({ ...req, level: 3 }, 'fra-blues', modePicks(req), { approaches: false });
  if (!bebop || !blues) return bebop ?? blues;
  const wins: [number, number][] = [];
  if (T >= 32) for (let a = 16; a < T; a += 32) wins.push([a, Math.min(T, a + 16)]);
  else wins.push(...segWindows(req, (i) => i % 2 === 1));
  return { notes: overlay(bebop.notes, blues.notes, wins), phrases: mergePhrases(bebop.phrases, blues.phrases, wins) };
}
function styleBBKing(req: WayRequest): ExResult {
  const base = fromIdea(req, 'blues', [1, 2, 3, 3, 3]);
  if (req.level < 2) return base;
  const cells = shaped({ ...req, level: 3 }, 'fra-blues', modePicks(req), { approaches: false });
  if (!cells) return base;
  // respuestas b3 → 3 en algunos compases que la frase deja en silencio
  const T = totalOf(req.events);
  const empty: [number, number][] = [];
  for (let b = 0, k = 0; b < T; b += 4) {
    if (!base.notes.some((n) => n.start < b + 4 && n.start + n.dur > b)) { if (k++ % 2 === 1) empty.push([b, b + 4]); }
  }
  return { notes: overlay(base.notes, cells.notes, empty), phrases: mergePhrases(base.phrases, cells.phrases, empty) };
}

/** Ejercicios «estilo de…» para el explorador de cadencias. */
export const STYLE_EXERCISES: ExerciseDef[] = WAYS.filter((w) => w.great).map((w) => ({
  id: `estilo-${w.id}`, step: 'estilos', name: w.name, how: w.how, challenge: w.challenge,
  origin: `${greatById(w.great!).era}. Frases originales construidas con sus recursos característicos, no transcripciones.`,
  build: (ctx: ExCtx) => {
    const level = (['miles', 'lester', 'rollins', 'bbking'].includes(w.id) ? 3 : 4) as Level;
    const r = generateWay(w.id, { events: ctx.events, keyRoot: ctx.keyRoot, minor: ctx.minor, blues: ctx.blues, range: ctx.range, level, seed: ctx.seed, names: ctx.names, scaleName: ctx.scaleName });
    return r ? { notes: r.notes, phrases: r.phrases } : null;
  },
}));

function mix(req: WayRequest): WayResult {
  const total = totalOf(req.events);
  const block = total >= 32 ? 16 : 4;
  const r = rng(req.seed * 31 + req.level);
  const cands = WAYS.filter((w) => w.id !== 'mezcla' && wayAvailable(w.id, req).ok).map((w) => w.id);
  const cache = new Map<WayId, ReturnType<typeof buildWay>>();
  const get = (id: WayId) => { if (!cache.has(id)) cache.set(id, buildWay(id, req)); return cache.get(id)!; };
  const notes: LineNote[] = [];
  const phrases: ExPhrase[] = [];
  const parts: { start: number; end: number; way: WayId }[] = [];
  let prev: WayId | null = null;
  const order = [...cands].sort(() => r() - 0.5);
  let oi = 0;
  for (let a = 0; a < total; a += block) {
    const b = Math.min(total, a + block);
    let id = order[oi++ % order.length];
    if (id === prev && order.length > 1) id = order[oi++ % order.length];
    const res = get(id);
    if (!res) continue;
    prev = id;
    for (const n of res.notes) if (n.start >= a - 1e-9 && n.start < b - 1e-9) notes.push({ ...n, dur: Math.min(n.dur, b - n.start) });
    const w = wayById(id);
    const txt = res.phrases.find((p) => p.start < b && p.end > a)?.text ?? w.short;
    const ca = Math.floor(a / 4) + 1; const cb = Math.ceil(b / 4);
    phrases.push({ start: a, end: b, title: `${ca === cb ? `Compás ${ca}` : `Compases ${ca}–${cb}`} · ${w.icon} ${w.name}`, text: `${w.short} ${txt}` });
    parts.push({ start: a, end: b, way: id });
  }
  return { title: 'Mezcla de formas', summary: wayById('mezcla').how, notes: notes.sort((x, y) => x.start - y.start), phrases, parts };
}

/** Genera un solo con la forma y el nivel pedidos sobre la progresión (o pasaje) dada. */
export function generateWay(id: WayId, req: WayRequest): WayResult | null {
  if (!wayAvailable(id, req).ok) return null;
  const w = wayById(id);
  const lv = LEVELS[req.level - 1];
  const detail = w.perLevel?.[req.level - 1];
  if (id === 'mezcla') {
    const m = mix(req);
    return { ...m, title: `${w.icon} ${w.name} · nivel ${req.level}`, summary: `${w.how} Nivel ${req.level} (${lv.name.toLowerCase()}): ${lv.text}` };
  }
  figureUsed = false;
  const r = buildWay(id, req);
  if (!r || !r.notes.length) return null;
  return {
    figureApplied: figureUsed,
    title: `${w.icon} ${w.name} · nivel ${req.level}`,
    summary: `${w.how} Nivel ${req.level} (${lv.name.toLowerCase()}): ${detail ? `${detail}. ` : ''}${lv.text}`,
    notes: r.notes, phrases: r.phrases, picks: r.picks,
  };
}

// ---------------------------------------------------------------- pasajes de la progresión
export interface Passage { id: string; label: string; from: number; to: number }
/** Pasajes para practicar por partes: todo, bloques de 4 compases y los ii–V(–I) que aparecen. */
export function passageOptions(evts: ChordEvent[], names: ExNamer): Passage[] {
  const total = totalOf(evts);
  const bars = Math.ceil(total / 4);
  const out: Passage[] = [{ id: 'all', label: `Todo (${bars} compases)`, from: 0, to: total }];
  if (bars > 4) for (let b = 0; b < bars; b += 4) out.push({ id: `b${b}`, label: `Compases ${b + 1}–${Math.min(bars, b + 4)}`, from: b * 4, to: Math.min(total, (b + 4) * 4) });
  const st = chordStarts(evts);
  const seen = new Set(out.map((p) => `${p.from}-${p.to}`));
  evts.forEach((e, i) => {
    const nx = evts[i + 1];
    if (!nx || !isDom(nx.chord) || !(isMin(e.chord) || e.chord.quality.id === 'm7b5') || mod12(pc(nx.chord.root) - pc(e.chord.root)) !== 5) return;
    const third = evts[i + 2];
    const resolves = third && mod12(pc(third.chord.root) - pc(nx.chord.root)) === 5;
    const endIdx = resolves ? i + 2 : i + 1;
    const from = Math.floor(st[i] / 4) * 4;
    const to = Math.min(total, Math.ceil((st[endIdx] + evts[endIdx].beats) / 4 - 1e-9) * 4);
    const key = `${from}-${to}`;
    if (seen.has(key) || to - from >= total) return;
    seen.add(key);
    const a = from / 4 + 1; const b = to / 4;
    const chords = evts.slice(i, endIdx + 1).map((x) => names.chord(x.chord)).join(' ');
    out.push({ id: `ii${i}`, label: `${resolves ? 'ii–V–I' : 'ii–V'}: ${chords} (c. ${a === b ? a : `${a}–${b}`})`, from, to });
  });
  return out;
}

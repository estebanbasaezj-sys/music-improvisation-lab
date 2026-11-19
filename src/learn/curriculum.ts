// Camino de aprendizaje por niveles (0 = desde cero … 5 = maestría), estilo Duolingo:
// unidades cortas con nodos «Aprende», «Practica», «Toca» y un «Desafío» final.
// Las unidades compartidas (oído, ritmo, teoría) aparecen en los tres instrumentos; los ejercicios
// se adaptan solos al instrumento elegido.
import { BackingStyle } from '../audio/backing';
import { IdeaId } from '../theory/improv';
import { InstrumentId } from '../theory/instruments';
import { ItemSpec } from './items';

export interface Tip { title: string; text: string }
export type PlaySpec =
  | { k: 'workshop'; progression: string; key: string; style: BackingStyle; bpm: number; ideas?: IdeaId[]; prompts?: string[]; text: string }
  | { k: 'backing'; progression: string; key: string; style: BackingStyle; bpm: number; prompts: string[]; text: string }
  | { k: 'song'; song: string; text: string }
  | { k: 'chords'; symbols: string[]; voiceLead?: boolean; text: string }
  | { k: 'phrase'; phrase: string; key?: string; text: string }
  | { k: 'studio'; text: string }
  | { k: 'record'; prompt: string; criteria: string[]; text: string };

export interface Unit {
  id: string;
  level: 0 | 1 | 2 | 3 | 4 | 5;
  track: InstrumentId | 'shared';
  title: string;
  goal: string;
  tips: Tip[];
  items: ItemSpec[];
  play?: PlaySpec;
  guide?: string[]; // lecciones completas relacionadas
}

export const LEVELS = [
  { n: 0, name: 'Primeros pasos', desc: 'Desde cero: el pulso, tus primeras notas y escuchar con atención.', color: '#5bd08a' },
  { n: 1, name: 'Fundamentos', desc: 'Leer notas, escalas mayores, tríadas, corcheas y el blues de 12 compases.', color: '#5ec2b7' },
  { n: 2, name: 'Blues e improvisación', desc: 'Pentatónicas, escala blues, acordes de séptima y pregunta-respuesta.', color: '#6aa7ff' },
  { n: 3, name: 'Lenguaje del jazz', desc: 'ii-V-I, notas guía, aproximaciones cromáticas, modos y swing.', color: '#b58cff' },
  { n: 4, name: 'Standards y bebop', desc: 'ii-V-i menor, dominantes secundarios, bebop y temas completos.', color: '#f2b544' },
  { n: 5, name: 'Maestría', desc: 'Rhythm changes, las 12 tonalidades, solos completos y transcripción.', color: '#ff6b6b' },
] as const;

const R0 = ['q q q q', 'h h', 'q q h', 'w', 'h q q', 'q qr q qr'];
const R1 = ['e e q q q', 'q e e q q', 'e e e e h', 'q. e q q', 'h. q', 'q q e e q'];
const R2 = ['e e e e e e e e', 'q e e qr e e', 'er e q q q', 'e e qr e e q'];
const R3 = ['q e q e q', 'er e er e er e er e', 'q. q. q', 'e q e q q'];
const s = (name: string, notes: string) => ({ name, notes: notes.split(' ') });

export const UNITS: Unit[] = [
  // ======================================================= NIVEL 0
  {
    id: 's0-pulse', level: 0, track: 'shared', title: 'El pulso', goal: 'Sentir y tocar el pulso: la base de todo.',
    tips: [
      { title: 'El pulso', text: 'Es el latido regular de la música: lo que marcas con el pie. Contamos 1-2-3-4 en cada compás.' },
      { title: 'Figuras', text: 'Redonda = 4 tiempos · Blanca = 2 · Negra = 1. Un silencio dura lo mismo que su figura, pero no suena.' },
    ],
    items: [{ t: 'tap-rhythm', patterns: R0, bpm: 72 }, { t: 'ear-rhythm', patterns: R0 }, { t: 'tap-rhythm', patterns: R0.slice(0, 3), bpm: 80 }],
  },
  {
    id: 's0-ear', level: 0, track: 'shared', title: 'Abre el oído', goal: 'Distinguir agudo/grave, igual/distinto y mayor/menor.',
    tips: [
      { title: 'Escuchar es tocar', text: 'Los músicos de jazz y blues aprenden primero de oído. Cada ejercicio de escucha entrena lo que luego tocarás.' },
      { title: 'Mayor y menor', text: 'Un acorde mayor suena brillante; uno menor, más oscuro. Solo cambia una nota: la del medio (la 3ª).' },
    ],
    items: [{ t: 'ear-highlow' }, { t: 'ear-same' }, { t: 'ear-majmin' }],
  },
  {
    id: 'x0-first', level: 0, track: 'sax', title: 'Tus primeras notas: Si, La, Sol', goal: 'Sacar sonido y tocar Si, La y Sol con la mano izquierda.',
    tips: [
      { title: 'Embocadura', text: 'Labio inferior ligeramente sobre los dientes, dientes superiores apoyados en la boquilla, comisuras firmes como al decir «u». Sopla con aire caliente y constante.' },
      { title: 'Respiración', text: 'Inspira llenando la parte baja del abdomen y sopla de forma continua, como si empañaras un vidrio lejano.' },
      { title: 'Mano izquierda', text: 'Dedo 1 (índice) = Si. 1+2 = La. 1+2+3 = Sol. El pulgar izquierdo descansa bajo la llave de octava (sin apretarla).' },
    ],
    items: [
      { t: 'read-inst', notes: ['B4', 'A4', 'G4'] }, { t: 'find-note', notes: ['B4', 'A4', 'G4'] }, { t: 'read-note', notes: ['B4', 'A4', 'G4'] },
      { t: 'play-note', notes: ['B4', 'A4', 'G4'] }, { t: 'play-seq', seqs: [s('Si – La – Sol', 'B4 A4 G4'), s('Sol – La – Si', 'G4 A4 B4'), s('Si – Sol – La – Si', 'B4 G4 A4 B4')] },
    ],
    play: { k: 'backing', progression: 'blues12', key: 'written:G', style: 'blues', bpm: 80, prompts: ['Toca solo Si, La y Sol.', 'Una nota larga por compás.', 'Luego prueba ritmos: negras, blancas, silencios.'], text: 'Tu primer blues: con solo 3 notas ya puedes tocar sobre un blues.' },
  },
  {
    id: 'x0-cdef', level: 0, track: 'sax', title: 'Do, Fa, Mi y Re', goal: 'Completar la escala de Sol escrita con la mano derecha.',
    tips: [
      { title: 'Do medio', text: 'Solo el dedo 2 de la mano izquierda (el medio). Es una digitación «rara» pero muy usada.' },
      { title: 'Mano derecha', text: 'Fa = 1-2-3 + dedo 4 (índice der.). Mi = + 4-5. Re = + 4-5-6. Cubre bien los agujeros/platos.' },
    ],
    items: [
      { t: 'read-inst', notes: ['C5', 'F4', 'E4', 'D4', 'G4'] }, { t: 'find-note', notes: ['C5', 'F4', 'E4', 'D4'] }, { t: 'read-note', notes: ['C5', 'F4', 'E4', 'D4', 'B4'] },
      { t: 'play-note', notes: ['C5', 'F4', 'E4', 'D4'] }, { t: 'play-seq', seqs: [s('Re – Mi – Fa – Sol', 'D4 E4 F4 G4'), s('Sol – Fa – Mi – Re', 'G4 F4 E4 D4'), s('Do – Si – La – Sol', 'C5 B4 A4 G4')] },
    ],
    guide: ['sx-blues-call'],
  },
  {
    id: 'g0-tune', level: 0, track: 'guitar', title: 'Tu guitarra y la afinación', goal: 'Afinar y conocer las cuerdas al aire.',
    tips: [
      { title: 'Cuerdas al aire', text: 'De la más grave (6ª) a la más aguda (1ª): Mi – La – Re – Sol – Si – Mi. Truco: «Mi Abuela Dice Gracias Bastante Educada».' },
      { title: 'Afinar', text: 'Toca cada cuerda al aire: el micrófono te dirá la nota. Gira la clavija despacio hasta que coincida.' },
    ],
    items: [{ t: 'play-note', notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] }, { t: 'read-inst', notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] }, { t: 'match', mode: 'note-solfeo' }],
  },
  {
    id: 'g0-chords', level: 0, track: 'guitar', title: 'Primeros acordes', goal: 'Mi menor, La menor, Mi, La y Re.',
    tips: [
      { title: 'Diagramas', text: 'Las líneas verticales son las cuerdas; las horizontales, los trastes. Los puntos dicen dónde poner los dedos.' },
      { title: 'Sonido limpio', text: 'Dedos arqueados, yemas justo detrás del traste. Toca cuerda por cuerda para ver cuál no suena.' },
    ],
    items: [{ t: 'play-chord', chords: ['Em', 'Am', 'E', 'A', 'D'] }, { t: 'build-chord', chords: ['Em', 'Am', 'E', 'A'] }, { t: 'ear-majmin' }, { t: 'tap-rhythm', patterns: R0.slice(0, 4), bpm: 70 }],
    play: { k: 'chords', symbols: ['Em', 'Am', 'E', 'A', 'D'], text: 'Practica los cambios: dos compases por acorde, sin parar el ritmo.' },
  },
  {
    id: 'p0-keys', level: 0, track: 'piano', title: 'El teclado', goal: 'Encontrar cualquier nota blanca.',
    tips: [
      { title: 'Grupos de negras', text: 'Las teclas negras van en grupos de 2 y de 3. Do está justo a la izquierda del grupo de dos.' },
      { title: 'Do central', text: 'El Do más cercano al centro del piano (C4). Es tu punto de referencia para todo.' },
    ],
    items: [{ t: 'find-note', notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'] }, { t: 'read-inst', notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'] }, { t: 'match', mode: 'note-solfeo' }, { t: 'find-note', notes: ['C4'], exact: true }],
  },
  {
    id: 'p0-five', level: 0, track: 'piano', title: 'Posición de Do: primeras melodías', goal: 'Cinco dedos sobre Do-Re-Mi-Fa-Sol y tu primer acorde.',
    tips: [
      { title: 'Posición de cinco dedos', text: 'Pulgar (1) en Do, índice (2) en Re… meñique (5) en Sol. Mano redonda, como sujetando una pelota.' },
      { title: 'Tu primer acorde', text: 'Do-Mi-Sol (dedos 1-3-5) es el acorde de Do mayor.' },
    ],
    items: [{ t: 'read-note', notes: ['C4', 'D4', 'E4', 'F4', 'G4'] }, { t: 'play-note', notes: ['C4', 'D4', 'E4', 'F4', 'G4'] }, { t: 'play-seq', seqs: [s('Do-Re-Mi-Fa-Sol', 'C4 D4 E4 F4 G4'), s('Sol-Fa-Mi-Re-Do', 'G4 F4 E4 D4 C4'), s('Do-Mi-Sol-Mi-Do', 'C4 E4 G4 E4 C4')] }, { t: 'build-chord', chords: ['C'] }],
    play: { k: 'backing', progression: 'I-IV-V', key: 'C', style: 'ballad', bpm: 70, prompts: ['Mano derecha: melodías con Do-Re-Mi-Fa-Sol.', 'Termina en Do cuando suene el último acorde.'], text: 'Tu primera improvisación con 5 notas.' },
  },
  // ======================================================= NIVEL 1
  {
    id: 's1-staff', level: 1, track: 'shared', title: 'Leer el pentagrama', goal: 'Leer notas en clave de sol con fluidez.',
    tips: [
      { title: 'Líneas y espacios', text: 'Líneas (de abajo arriba): Mi-Sol-Si-Re-Fa. Espacios: Fa-La-Do-Mi. Las notas fuera del pentagrama usan líneas adicionales.' },
      { title: 'Cifrado americano', text: 'C=Do, D=Re, E=Mi, F=Fa, G=Sol, A=La, B=Si. El jazz usa siempre letras.' },
    ],
    items: [{ t: 'read-note', notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'] }, { t: 'match', mode: 'note-solfeo' }],
  },
  {
    id: 's1-intervals', level: 1, track: 'shared', title: 'Tonos, semitonos e intervalos', goal: 'Medir distancias entre notas de oído.',
    tips: [{ title: 'Semitono', text: 'La distancia más pequeña: una tecla al lado en el piano, un traste en la guitarra. Un tono = 2 semitonos.' }, { title: 'Intervalos', text: 'Las 3ªs dan el color (mayor/menor); la 5ª es estable; la 8ª es la misma nota más aguda.' }],
    items: [{ t: 'ear-interval', set: ['2', 'b3', '3', '5', '8'] }, { t: 'match', mode: 'interval-semis' }, { t: 'quiz', kind: 'interval-ear' }],
    guide: ['th-intervals'],
  },
  {
    id: 's1-major', level: 1, track: 'shared', title: 'La escala mayor', goal: 'Construir y reconocer la escala mayor.',
    tips: [{ title: 'Fórmula', text: 'Tono-Tono-Semitono-Tono-Tono-Tono-Semitono. En Do: sin alteraciones. Cada nota tiene un número (grado) del 1 al 7.' }],
    items: [{ t: 'order-scale', scales: ['major'], keys: ['C', 'G', 'F', 'D', 'Bb'] }, { t: 'quiz', kind: 'scale-notes' }, { t: 'quiz', kind: 'degree' }, { t: 'ear-scale', scales: ['major', 'minor'] }],
    guide: ['th-major'],
  },
  {
    id: 's1-triads', level: 1, track: 'shared', title: 'Tríadas mayores y menores', goal: 'Construir y oír acordes de tres notas.',
    tips: [{ title: 'Tríada', text: 'Tres notas por terceras: 1-3-5. Mayor: 3ª mayor (4 semitonos). Menor: 3ª menor (3 semitonos).' }],
    items: [{ t: 'ear-majmin' }, { t: 'build-chord', chords: ['C', 'F', 'G', 'Am', 'Dm', 'Em', 'D', 'A'] }, { t: 'match', mode: 'chord-notes' }, { t: 'ear-chord', qualities: ['maj', 'm', 'dim', 'aug'] }],
    guide: ['th-triads'],
  },
  {
    id: 's1-eighths', level: 1, track: 'shared', title: 'Corcheas y swing', goal: 'Dividir el pulso en dos y sentir el swing.',
    tips: [{ title: 'Corcheas', text: 'Dos por cada negra: cuenta «1 y 2 y 3 y 4 y».' }, { title: 'Swing', text: 'En jazz y blues las corcheas son desiguales: larga-corta (como un tresillo 2+1). Se escriben iguales, se tocan con swing.' }],
    items: [{ t: 'tap-rhythm', patterns: R1, bpm: 80 }, { t: 'ear-rhythm', patterns: R1 }, { t: 'tap-rhythm', patterns: ['e e e e e e e e', 'q e e q e e'], bpm: 90, swing: true }],
    guide: ['th-rhythm'],
  },
  {
    id: 's1-blues', level: 1, track: 'shared', title: 'El blues de 12 compases', goal: 'Reconocer I-IV-V y la forma del blues.',
    tips: [{ title: 'I – IV – V', text: 'Tres acordes: casa (I), alejarse (IV) y tensión que vuelve (V). El blues los ordena en 12 compases.' }, { title: 'La forma', text: 'I I I I | IV IV I I | V IV I V. Cuenta los compases mientras suena.' }],
    items: [{ t: 'ear-prog', progs: ['I-IV-V', 'iiVI', 'I-vi-ii-V'] }, { t: 'quiz', kind: 'progression-ear' }],
    play: { k: 'workshop', progression: 'blues12', key: 'F', style: 'blues', bpm: 85, ideas: ['blues', 'guide'], text: 'Escucha un solo sencillo sobre el blues y repítelo.' },
    guide: ['th-blues-form'],
  },
  {
    id: 'x1-octave', level: 1, track: 'sax', title: 'Llave de octava y registro medio', goal: 'Tocar de Re grave a Do agudo.',
    tips: [{ title: 'Llave de octava', text: 'El pulgar izquierdo la pulsa: misma digitación, una octava más aguda (de Re medio a Do♯ agudo).' }, { title: 'Fa♯, Si♭ y Sol♯', text: 'Fa♯: 1-2-3 + dedo 5. Si♭: dedo 1 + llave bis. Sol♯: 1-2-3 + meñique izquierdo.' }],
    items: [{ t: 'read-inst', notes: ['D5', 'E5', 'F5', 'G5', 'A5', 'F#4', 'Bb4', 'G#4'] }, { t: 'find-note', notes: ['D5', 'E5', 'G5', 'F#4', 'Bb4'] }, { t: 'play-note', notes: ['D5', 'E5', 'G5', 'A5', 'F#4', 'Bb4'] }, { t: 'play-seq', seqs: [s('Sol grave → Sol agudo', 'G4 G5'), s('Re – Re octava', 'D4 D5'), s('Escala de Sol', 'G4 A4 B4 C5 D5 E5 F#5 G5')] }],
  },
  {
    id: 'x1-scales', level: 1, track: 'sax', title: 'Escalas mayores en tu saxo', goal: 'Do, Sol y Fa mayor escritas, y la transposición.',
    tips: [{ title: 'Transposición', text: 'Tu saxo no suena lo que lees: el tenor suena una 9ª mayor más grave; el alto, una 6ª mayor más grave. La app te muestra siempre tus notas escritas.' }],
    items: [{ t: 'play-seq', seqs: [s('Do mayor', 'C5 D5 E5 F5 G5 A5 B5 C6'), s('Sol mayor', 'G4 A4 B4 C5 D5 E5 F#5 G5'), s('Fa mayor', 'F4 G4 A4 Bb4 C5 D5 E5 F5')] }, { t: 'quiz', kind: 'sax-transpose' }, { t: 'order-scale', scales: ['major'], keys: ['C', 'G', 'F'] }],
  },
  {
    id: 'g1-notes', level: 1, track: 'guitar', title: 'Notas en las cuerdas 6 y 5', goal: 'Ubicar las fundamentales de los acordes.',
    tips: [{ title: 'Referencias', text: 'Cuerda 6: traste 3 = Sol, 5 = La, 7 = Si, 8 = Do. Cuerda 5: 3 = Do, 5 = Re, 7 = Mi, 8 = Fa. Traste 12 = la cuerda al aire una octava arriba.' }],
    items: [{ t: 'read-inst', notes: ['G2', 'A2', 'B2', 'C3', 'D3', 'C3', 'E3', 'F3'] }, { t: 'find-note', notes: ['G2', 'A2', 'C3', 'D3', 'E3', 'F3'], exact: true }, { t: 'quiz', kind: 'fret-note' }],
    guide: ['gt-notes'],
  },
  {
    id: 'g1-blues', level: 1, track: 'guitar', title: 'Shuffle de blues con quintas', goal: 'Tocar el acompañamiento clásico del blues.',
    tips: [{ title: 'Quinta (power chord)', text: 'Fundamental + 5ª con dos dedos. El riff de shuffle alterna 5ª y 6ª: 1-5, 1-6.' }, { title: 'Shuffle', text: 'Ritmo de tresillos largo-corto: «da-ba da-ba».' }],
    items: [{ t: 'tap-rhythm', patterns: ['e e e e e e e e'], bpm: 85, swing: true }, { t: 'ear-prog', progs: ['I-IV-V', 'iiVI'] }, { t: 'find-note', notes: ['A2', 'D3', 'E2'], exact: true }],
    play: { k: 'backing', progression: 'blues12', key: 'A', style: 'blues', bpm: 85, prompts: ['Riff de quintas en A, D y E.', 'Cambia de acorde exactamente con la base.'], text: 'Acompaña el blues en La: tú eres la guitarra rítmica.' },
  },
  {
    id: 'p1-triads', level: 1, track: 'piano', title: 'Tríadas en el teclado', goal: 'Acordes de I-IV-V en varias tonalidades.',
    tips: [{ title: 'Forma de la mano', text: 'Dedos 1-3-5 de la mano derecha (o 5-3-1 de la izquierda). Misma forma, otra tecla de partida.' }],
    items: [{ t: 'build-chord', chords: ['C', 'F', 'G', 'D', 'A', 'Am', 'Dm', 'Em'] }, { t: 'play-chord', chords: ['C', 'F', 'G', 'Am'] }, { t: 'ear-majmin' }],
    guide: ['pn-triads'],
  },
  {
    id: 'p1-hands', level: 1, track: 'piano', title: 'Dos manos: acompañar y tocar melodía', goal: 'Izquierda con acordes, derecha con melodía.',
    tips: [{ title: 'Primero separadas', text: 'Toca la izquierda sola hasta que sea automática. Luego añade notas largas con la derecha.' }],
    items: [{ t: 'tap-rhythm', patterns: ['h h', 'q q q q', 'q q h'], bpm: 70 }, { t: 'build-chord', chords: ['C', 'F', 'G'] }],
    play: { k: 'backing', progression: 'I-IV-V', key: 'C', style: 'ballad', bpm: 70, prompts: ['Izquierda: un acorde por compás.', 'Derecha: Do-Re-Mi-Fa-Sol, notas largas.'], text: 'Silencia el piano del acompañamiento y toca tú los acordes.' },
  },
  // ======================================================= NIVEL 2
  {
    id: 's2-pent', level: 2, track: 'shared', title: 'Pentatónicas', goal: 'Las escalas de 5 notas del blues y el rock.',
    tips: [{ title: 'Pentatónica menor', text: '1 – b3 – 4 – 5 – b7. En La: La-Do-Re-Mi-Sol. Sin semitonos: casi imposible equivocarse.' }, { title: 'Relativas', text: 'La pentatónica menor de La tiene las mismas notas que la mayor de Do.' }],
    items: [{ t: 'order-scale', scales: ['pentMinor', 'pentMajor'], keys: ['A', 'E', 'C', 'G', 'D'] }, { t: 'quiz', kind: 'scale-notes' }, { t: 'ear-scale', scales: ['pentMinor', 'pentMajor', 'major'] }],
    guide: ['th-pentatonic'],
  },
  {
    id: 's2-blues', level: 2, track: 'shared', title: 'Escala blues y blue notes', goal: 'Usar la b5 y la b3 con intención.',
    tips: [{ title: 'Escala blues', text: 'Pentatónica menor + b5. La b5 es de paso: ve al 4 o al 5.' }, { title: 'Sobre el IV7', text: 'La b3 de la tonalidad es la b7 del IV7: por eso la pentatónica menor suena bien en todo el blues.' }],
    items: [{ t: 'order-scale', scales: ['blues'], keys: ['A', 'F', 'C', 'G'] }, { t: 'ear-scale', scales: ['blues', 'pentMinor', 'major'] }, { t: 'call-response', phrases: ['blues-bluenote', 'blues-call', 'blues-descent'], keys: ['F', 'Bb', 'A'] }],
    play: { k: 'workshop', progression: 'blues12', key: 'F', style: 'swing', bpm: 100, ideas: ['blues'], text: 'Pregunta y respuesta con la escala blues.' },
    guide: ['th-blues-scale'],
  },
  {
    id: 's2-sevenths', level: 2, track: 'shared', title: 'Acordes de séptima', goal: 'maj7, m7 y 7: el idioma del jazz.',
    tips: [{ title: 'Tres sabores', text: 'maj7 = 1-3-5-7 (suave). m7 = 1-b3-5-b7 (cálido). 7 = 1-3-5-b7 (tenso, pide resolver).' }],
    items: [{ t: 'ear-chord', qualities: ['maj7', 'm7', '7'] }, { t: 'build-chord', chords: ['Cmaj7', 'Dm7', 'G7', 'Fmaj7', 'Am7', 'D7', 'Bb7'] }, { t: 'match', mode: 'chord-notes' }, { t: 'quiz', kind: 'chord-notes' }],
    guide: ['th-sevenths'],
  },
  {
    id: 's2-callresp', level: 2, track: 'shared', title: 'Pregunta y respuesta', goal: 'Imitar frases de blues de oído.',
    tips: [{ title: 'La conversación', text: 'Una frase pregunta, otra responde. Deja silencios: el espacio también es música.' }],
    items: [{ t: 'call-response', phrases: ['blues-call', 'blues-motif', 'minor-blues-call', 'blues-major-minor'] }, { t: 'ear-same' }],
    play: { k: 'workshop', progression: 'minorBlues', key: 'C', style: 'swing', bpm: 100, ideas: ['blues', 'motif'], text: 'Blues menor: escucha, repite y responde.' },
  },
  {
    id: 'x2-arps', level: 2, track: 'sax', title: 'Arpegios de séptima en tu saxo', goal: 'Tocar los acordes nota a nota.',
    tips: [{ title: 'Arpegio', text: 'Las notas de un acorde una tras otra: 1-3-5-7 subiendo y 7-5-3-1 bajando, en corcheas.' }],
    items: [{ t: 'play-seq', seqs: [s('Cmaj7 (escrito)', 'C5 E5 G5 B5'), s('Dm7 (escrito)', 'D5 F5 A5 C6'), s('G7 (escrito)', 'G4 B4 D5 F5'), s('Fmaj7 (escrito)', 'F4 A4 C5 E5')] }, { t: 'quiz', kind: 'sax-transpose' }, { t: 'call-response', phrases: ['iiVI-arp'], keys: ['C', 'F', 'Bb'] }],
    guide: ['sx-arpeggios'],
  },
  {
    id: 'g2-pent', level: 2, track: 'guitar', title: 'Pentatónica menor: posición 1', goal: 'La forma de caja y tus primeras frases.',
    tips: [{ title: 'Posición 1 en La', text: 'Traste 5: dedos 1 y 4 en cada cuerda (1 y 3 en las cuerdas 3 y 2). Fundamental La en la 6ª cuerda, traste 5.' }, { title: 'Bends', text: 'Empuja la cuerda con 2-3 dedos hasta que suene la nota de arriba (4→5).' }],
    items: [{ t: 'play-seq', seqs: [s('La pentatónica menor', 'A2 C3 D3 E3 G3 A3'), s('Bajando', 'A3 G3 E3 D3 C3 A2')] }, { t: 'find-note', notes: ['A2', 'C3', 'D3', 'E3', 'G3'], exact: true }, { t: 'call-response', phrases: ['blues-call', 'blues-descent'], keys: ['A'] }],
    play: { k: 'workshop', progression: 'blues12', key: 'A', style: 'blues', bpm: 90, ideas: ['blues', 'space'], text: 'Solo de blues en La con la pentatónica.' },
    guide: ['gt-pent-pos1'],
  },
  {
    id: 'g2-sevenths', level: 2, track: 'guitar', title: 'Acordes de séptima', goal: 'Dominantes, menores y maj7 con cejilla.',
    tips: [{ title: 'Formas movibles', text: 'Forma de Mi (fundamental en la 6ª) y forma de La (en la 5ª): mueve la misma forma para cambiar de acorde.' }],
    items: [{ t: 'play-chord', chords: ['A7', 'D7', 'E7', 'Am7', 'Dm7', 'Cmaj7'] }, { t: 'build-chord', chords: ['A7', 'D7', 'Am7', 'Gmaj7'] }, { t: 'ear-chord', qualities: ['maj7', 'm7', '7'] }],
    play: { k: 'chords', symbols: ['A7', 'D7', 'E7', 'Dm7', 'G7', 'Cmaj7'], text: 'Mira las digitaciones y tócalas hasta que suenen limpias.' },
  },
  {
    id: 'p2-sevenths', level: 2, track: 'piano', title: 'Séptimas e inversiones', goal: 'Acordes de cuatro notas en distintas posiciones.',
    tips: [{ title: 'Inversiones', text: 'La misma nota no tiene por qué ir abajo: pasa la de abajo arriba y obtienes otra inversión. Sirve para mover poco las manos.' }],
    items: [{ t: 'build-chord', chords: ['Cmaj7', 'Dm7', 'G7', 'Fmaj7', 'Am7', 'Bb7', 'Ebmaj7'] }, { t: 'play-chord', chords: ['Cmaj7', 'Dm7', 'G7'] }, { t: 'ear-chord', qualities: ['maj7', 'm7', '7'] }],
    play: { k: 'chords', symbols: ['Dm7', 'G7', 'Cmaj7'], voiceLead: true, text: 'ii-V-I moviendo lo mínimo: compara las posiciones.' },
    guide: ['pn-inversions'],
  },
  {
    id: 'p2-blues', level: 2, track: 'piano', title: 'Blues a dos manos', goal: 'Shells en la izquierda, escala blues en la derecha.',
    tips: [{ title: 'Shells', text: 'Izquierda: fundamental + 7ª (o + 3ª). Dejan espacio a la derecha.' }],
    items: [{ t: 'build-chord', chords: ['F7', 'Bb7', 'C7'] }, { t: 'call-response', phrases: ['blues-call', 'blues-bluenote'], keys: ['F', 'C'] }],
    play: { k: 'workshop', progression: 'blues12', key: 'F', style: 'swing', bpm: 95, ideas: ['blues', 'guide'], text: 'Izquierda shells en el tiempo 1, derecha frases de blues.' },
    guide: ['pn-shells'],
  },
  // ======================================================= NIVEL 3
  {
    id: 's3-iivi', level: 3, track: 'shared', title: 'El ii-V-I', goal: 'La progresión más importante del jazz.',
    tips: [{ title: 'Función', text: 'ii m7 (preparación) → V7 (tensión) → Imaj7 (reposo). Las raíces se mueven por cuartas.' }],
    items: [{ t: 'ear-prog', progs: ['iiVI', 'I-IV-V', 'I-vi-ii-V'] }, { t: 'quiz', kind: 'scale-for-chord' }, { t: 'quiz', kind: 'chord-notes' }],
    play: { k: 'workshop', progression: 'iiVI', key: 'C', style: 'swing', bpm: 100, ideas: ['guide', 'arpeggios'], text: 'Escucha líneas sobre ii-V-I y repítelas.' },
    guide: ['th-iiVI'],
  },
  {
    id: 's3-guide', level: 3, track: 'shared', title: 'Notas guía', goal: '3ªs y 7ªs: el esqueleto de la armonía.',
    tips: [{ title: 'Resolución', text: 'La 7ª de un acorde baja medio tono a la 3ª del siguiente (C de Dm7 → B de G7). Con solo notas guía ya suenas a jazz.' }],
    items: [{ t: 'quiz', kind: 'guide-tone' }, { t: 'call-response', phrases: ['iiVI-arp'], keys: ['C', 'F', 'Bb', 'Eb'] }],
    play: { k: 'workshop', progression: 'jazzBlues', key: 'F', style: 'swing', bpm: 110, ideas: ['guide', 'targets'], text: 'Notas guía en el blues jazzístico.' },
    guide: ['sx-guide-tones'],
  },
  {
    id: 's3-modes', level: 3, track: 'shared', title: 'Dórico y mixolidio', goal: 'Dos modos esenciales, en contexto.',
    tips: [{ title: 'Dórico', text: 'Menor con 6ª mayor: sobre m7 (el ii del ii-V-I).' }, { title: 'Mixolidio', text: 'Mayor con b7: sobre los acordes dominantes (V7 y el blues).' }],
    items: [{ t: 'quiz', kind: 'mode-ear' }, { t: 'ear-scale', scales: ['dorian', 'aeolian', 'mixolydian', 'major'] }, { t: 'quiz', kind: 'scale-for-chord' }],
    play: { k: 'workshop', progression: 'dorianVamp', key: 'D', style: 'bossa', bpm: 100, ideas: ['motif', 'space'], text: 'Vamp dórico: escucha la 6ª mayor.' },
    guide: ['th-dorian', 'th-mixo-blues', 'th-tonal-vs-modal'],
  },
  {
    id: 's3-approach', level: 3, track: 'shared', title: 'Aproximaciones y enclosures', goal: 'Llegar a las notas guía con cromatismos.',
    tips: [{ title: 'Aproximación', text: 'Medio tono antes de la nota objetivo, en tiempo débil. Enclosure: nota de arriba + nota de abajo + objetivo.' }],
    items: [{ t: 'call-response', phrases: ['iiVI-chromatic', 'iiVI-enclosure'], keys: ['C', 'F', 'Bb'] }, { t: 'quiz', kind: 'guide-tone' }],
    play: { k: 'workshop', progression: 'iiVIshort', key: 'F', style: 'swing', bpm: 110, ideas: ['targets'], text: 'Líneas que apuntan a las notas guía.' },
    guide: ['sx-chromatic'],
  },
  {
    id: 's3-swing', level: 3, track: 'shared', title: 'Síncopas y fraseo', goal: 'Tocar a contratiempo con seguridad.',
    tips: [{ title: 'Empezar en cualquier parte', text: 'Las frases de jazz rara vez empiezan en el tiempo 1. Practica entradas en el «y» de cada tiempo.' }],
    items: [{ t: 'tap-rhythm', patterns: R3, bpm: 90 }, { t: 'ear-rhythm', patterns: [...R2, ...R3] }, { t: 'tap-rhythm', patterns: R2, bpm: 100, swing: true }],
  },
  {
    id: 'x3-language', level: 3, track: 'sax', title: 'Articulación y lenguaje swing', goal: 'Que tus corcheas suenen a jazz.',
    tips: [{ title: 'Du-ba', text: 'Lengua suave en la corchea del tiempo, acento en la del contratiempo: «du-BA du-BA».' }],
    items: [{ t: 'call-response', phrases: ['blues-descent', 'bebop-dominant', 'iiVI-chromatic'] }, { t: 'tap-rhythm', patterns: R2, bpm: 110, swing: true }],
    play: { k: 'workshop', progression: 'jazzBlues', key: 'Bb', style: 'swing', bpm: 120, ideas: ['targets', 'motif'], text: 'Blues jazzístico en Si♭.' },
  },
  {
    id: 'g3-shells', level: 3, track: 'guitar', title: 'Shells y comping', goal: 'Acompañar standards con acordes de 3 notas.',
    tips: [{ title: 'Shell', text: 'Fundamental + 3ª + 7ª. Desde la 6ª y la 5ª cuerda puedes tocar un ii-V-I sin mover la mano.' }],
    items: [{ t: 'play-chord', chords: ['Dm7', 'G7', 'Cmaj7', 'Am7', 'D7', 'Gmaj7'] }, { t: 'quiz', kind: 'guide-tone' }, { t: 'tap-rhythm', patterns: ['q. e hr', 'q q q q', 'er e hr q'], bpm: 100, swing: true }],
    play: { k: 'backing', progression: 'jazzBlues', key: 'F', style: 'swing', bpm: 100, prompts: ['Silencia el piano y acompaña con shells.', 'Ritmo Charleston: tiempo 1 y el «y» del 2.'], text: 'Tú eres el acompañante.' },
    guide: ['gt-shells', 'gt-comping'],
  },
  {
    id: 'p3-voicings', level: 3, track: 'piano', title: 'Voicings sin fundamental', goal: 'El sonido del piano de jazz.',
    tips: [{ title: 'A y B', text: 'A = 3-5-7-9; B = 7-9-3-5. En ii-V-I alterna A-B-A y solo se mueven 1-2 notas.' }],
    items: [{ t: 'quiz', kind: 'guide-tone' }, { t: 'build-chord', chords: ['Dm7', 'G7', 'Cmaj7', 'Gm7', 'C7', 'Fmaj7'] }],
    play: { k: 'chords', symbols: ['Dm7', 'G7', 'Cmaj7'], voiceLead: true, text: 'Elige «Sin fundamental A/B» y compara.' },
    guide: ['pn-rootless', 'pn-voiceleading'],
  },
  // ======================================================= NIVEL 4
  {
    id: 's4-minor', level: 4, track: 'shared', title: 'ii-V-i menor', goal: 'm7b5 → 7b9 → m: el ii-V-I oscuro.',
    tips: [{ title: 'La b9', text: 'Sobre el V7 de un tono menor suena la b9 (la b6 de la tonalidad). Escala: menor armónica desde la tónica.' }],
    items: [{ t: 'ear-chord', qualities: ['m7b5', '7', 'm7', 'maj7'] }, { t: 'call-response', phrases: ['iiVImin-line'], keys: ['C', 'G', 'D'] }, { t: 'quiz', kind: 'scale-for-chord' }],
    play: { k: 'workshop', progression: 'iiVImin', key: 'C', style: 'swing', bpm: 100, ideas: ['targets', 'arpeggios'], text: 'Líneas sobre el ii-V-i menor.' },
    guide: ['th-iiVImin'],
  },
  {
    id: 's4-secdom', level: 4, track: 'shared', title: 'Dominantes secundarios', goal: 'Acordes «de fuera» que empujan al siguiente.',
    tips: [{ title: 'V de…', text: 'A7 es el V7 de Dm7. Cambia una nota respecto a Am7 (C → C♯) y crea atracción.' }],
    items: [{ t: 'ear-prog', progs: ['secDom', 'I-vi-ii-V', 'iiVI'] }, { t: 'quiz', kind: 'chord-notes' }],
    play: { k: 'workshop', progression: 'secDom', key: 'C', style: 'swing', bpm: 110, ideas: ['guide', 'targets'], text: 'Notas guía en I-VI7-ii-V.' },
    guide: ['th-secondary'],
  },
  {
    id: 's4-bebop', level: 4, track: 'shared', title: 'Lenguaje bebop', goal: 'Líneas largas con escala bebop y enclosures.',
    tips: [{ title: 'Escala bebop', text: 'Mixolidio + 7ª mayor de paso: en corcheas desde una nota del acorde, las notas del acorde caen en los tiempos.' }],
    items: [{ t: 'call-response', phrases: ['bebop-dominant', 'iiVI-enclosure'], keys: ['F', 'Bb', 'C'] }, { t: 'ear-scale', scales: ['bebopDominant', 'mixolydian', 'dorian'] }],
    play: { k: 'workshop', progression: 'jazzBlues', key: 'F', style: 'swing', bpm: 140, ideas: ['bebop'], text: 'Líneas bebop sobre el blues.' },
    guide: ['sx-bebop'],
  },
  {
    id: 's4-standards', level: 4, track: 'shared', title: 'Tus primeros standards', goal: 'Autumn Leaves y Blue Bossa completos.',
    tips: [{ title: 'Aprender un tema', text: 'Escucha varias versiones, aprende la melodía de oído (de grabaciones), luego la armonía por secciones, y por último improvisa.' }],
    items: [{ t: 'quiz', kind: 'scale-for-chord' }, { t: 'quiz', kind: 'guide-tone' }],
    play: { k: 'song', song: 'autumn-leaves', text: 'Autumn Leaves: forma, análisis e ideas de improvisación.' },
  },
  {
    id: 's4-bossa', level: 4, track: 'shared', title: 'Blue Bossa', goal: 'Bossa en menor con modulación.',
    tips: [{ title: 'Modulación', text: 'Compases 9–12 suben a Re♭ mayor: cambia de «caja» de notas a tiempo.' }],
    items: [{ t: 'quiz', kind: 'scale-for-chord' }],
    play: { k: 'song', song: 'blue-bossa', text: 'Blue Bossa completa.' },
  },
  // ======================================================= NIVEL 5
  {
    id: 's5-rhythm', level: 5, track: 'shared', title: 'Rhythm changes', goal: 'Turnarounds rápidos al estilo bebop.',
    tips: [{ title: 'Dos acordes por compás', text: 'I-VI-ii-V cada dos compases: piensa en notas guía y frases cortas.' }],
    items: [{ t: 'ear-prog', progs: ['rhythmA', 'I-vi-ii-V', 'secDom'] }, { t: 'call-response', phrases: ['iiVI-enclosure', 'bebop-dominant'], keys: ['Bb'] }],
    play: { k: 'workshop', progression: 'rhythmA', key: 'Bb', style: 'swing', bpm: 150, ideas: ['bebop', 'guide'], text: 'Rhythm changes (A) en Si♭.' },
  },
  {
    id: 's5-keys', level: 5, track: 'shared', title: 'Las 12 tonalidades', goal: 'Tocar lo mismo en cualquier tonalidad.',
    tips: [{ title: 'Círculo de cuartas', text: 'C-F-B♭-E♭-A♭-D♭-G♭-B-E-A-D-G: el orden en que se mueve la música (y en el que practican los jazzistas).' }],
    items: [{ t: 'order-scale', scales: ['major', 'dorian', 'mixolydian'], keys: ['Db', 'Ab', 'E', 'B', 'F#', 'Eb'] }, { t: 'quiz', kind: 'scale-notes' }, { t: 'quiz', kind: 'chord-notes' }],
    play: { k: 'workshop', progression: 'iiVI', key: 'Db', style: 'swing', bpm: 120, ideas: ['targets', 'arpeggios'], text: 'Cambia la tonalidad cada 4 vueltas.' },
  },
  {
    id: 's5-solo', level: 5, track: 'shared', title: 'Construir un solo completo', goal: 'Tres choruses con arco de energía.',
    tips: [{ title: 'Una historia', text: 'Chorus 1: espacio y motivos. Chorus 2: más corcheas y notas guía. Chorus 3: clímax y resolución.' }],
    items: [{ t: 'quiz', kind: 'scale-for-chord' }],
    play: { k: 'workshop', progression: 'jazzBlues', key: 'F', style: 'swing', bpm: 130, ideas: ['motif', 'space', 'bebop'], prompts: ['Chorus 1: espacio y motivos.', 'Chorus 2: corcheas y notas guía.', 'Chorus 3: clímax y resolución.'], text: 'Grábate y escúchalo al día siguiente.' },
  },
  {
    id: 's5-transcribe', level: 5, track: 'shared', title: 'Transcribir de oído', goal: 'Aprender de las grabaciones, como los grandes.',
    tips: [{ title: 'Transcribir', text: 'Elige 4 compases de un solo que te guste, ralentízalos sin cambiar el tono, cántalos y tócalos. Luego analiza qué notas usa sobre cada acorde.' }],
    items: [{ t: 'ear-same' }, { t: 'call-response', phrases: ['iiVI-chromatic', 'blues-descent'] }],
    play: { k: 'studio', text: 'Abre el Estudio, carga una grabación tuya o con licencia, y transcribe 4 compases.' },
  },
];

export const unitsFor = (i: InstrumentId) => UNITS.filter((u) => u.track === 'shared' || u.track === i).sort((a, b) => a.level - b.level || (a.track === 'shared' ? 0 : 1) - (b.track === 'shared' ? 0 : 1));

export type NodeKind = 'learn' | 'practice' | 'play' | 'challenge';
export interface PathNode { id: string; unit: Unit; kind: NodeKind; title: string; index: number }

export function nodesFor(i: InstrumentId): PathNode[] {
  const out: PathNode[] = [];
  for (const u of unitsFor(i)) {
    out.push({ id: `${u.id}:learn`, unit: u, kind: 'learn', title: 'Aprende', index: out.length });
    out.push({ id: `${u.id}:practice`, unit: u, kind: 'practice', title: 'Practica', index: out.length });
    if (u.play) out.push({ id: `${u.id}:play`, unit: u, kind: 'play', title: 'Toca', index: out.length });
    out.push({ id: `${u.id}:challenge`, unit: u, kind: 'challenge', title: 'Desafío', index: out.length });
  }
  return out;
}
export const nodeById = (i: InstrumentId, id: string) => nodesFor(i).find((n) => n.id === id);

/** Resuelve claves "written:G" (tonalidad escrita para el saxo) a concierto. */
export function resolveKey(k: string, inst: InstrumentId, sax: 'tenor' | 'alto'): string {
  if (!k.startsWith('written:')) return k;
  const w = k.slice(8);
  if (inst !== 'sax') return w;
  const order = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const idx = order.indexOf(w);
  const shift = sax === 'tenor' ? 2 : 9; // escrito → concierto: tenor −2 (9ª mayor = 14), alto −9
  return order[(idx - shift + 12) % 12];
}

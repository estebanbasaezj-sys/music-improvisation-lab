import { Lesson, Module } from './types';

// ======================= MÓDULOS =======================
export const MODULES: Module[] = [
  // Ruta común de teoría aplicada
  { id: 'th1', track: 'shared', title: 'Nivel 1 · Intervalos, escalas y tonalidades', goal: 'Medir distancias y construir escalas que puedas tocar de inmediato.', phase: 1 },
  { id: 'th2', track: 'shared', title: 'Nivel 2 · Construcción de acordes', goal: 'Saber qué notas forman cualquier acorde y por qué.', phase: 1 },
  { id: 'th3', track: 'shared', title: 'Nivel 3 · Progresiones armónicas', goal: 'Reconocer y tocar blues, I-IV-V, ii-V-I y turnarounds.', phase: 1 },
  { id: 'th4', track: 'shared', title: 'Nivel 4 · Modos en contexto', goal: 'Usar modos para colorear, sabiendo cuándo no hacen falta.', phase: 2 },
  // Saxofón
  { id: 'sx1', track: 'sax', title: 'Módulo 1 · Improvisación sobre blues', goal: 'Frases con sentido, pregunta-respuesta y swing.', phase: 1 },
  { id: 'sx2', track: 'sax', title: 'Módulo 2 · Armonía aplicada al saxofón', goal: 'Arpegios, notas guía y resolución en ii-V-I.', phase: 1 },
  { id: 'sx3', track: 'sax', title: 'Módulo 3 · Vocabulario jazz', goal: 'Cromatismos, enclosures y lenguaje bebop.', phase: 2 },
  { id: 'sx4', track: 'sax', title: 'Módulo 4 · Standards', goal: 'Tocar e improvisar sobre temas completos.', phase: 2 },
  { id: 'sx5', track: 'sax', title: 'Módulo 5 · Improvisación avanzada', goal: 'Construcción de solos: motivo, contraste, tensión y resolución.', phase: 3 },
  // Guitarra
  { id: 'gt1', track: 'guitar', title: 'Módulo 1 · Conocimiento del diapasón', goal: 'Encontrar cualquier nota, octava y tríada.', phase: 1 },
  { id: 'gt2', track: 'guitar', title: 'Módulo 2 · Blues e improvisación', goal: 'De tocar la escala a construir frases de blues.', phase: 1 },
  { id: 'gt3', track: 'guitar', title: 'Módulo 3 · Improvisación sobre acordes', goal: 'Seguir los cambios con arpegios y notas objetivo.', phase: 2 },
  { id: 'gt4', track: 'guitar', title: 'Módulo 4 · Acordes de jazz y comping', goal: 'Voicings pequeños, cómodos y musicales.', phase: 1 },
  { id: 'gt5', track: 'guitar', title: 'Módulo 5 · Standards en guitarra', goal: 'Acompañar e improvisar temas completos.', phase: 2 },
  { id: 'gt6', track: 'guitar', title: 'Módulo 6 · Acompañamiento autónomo', goal: 'Walking bass con acordes, solos con sentido armónico.', phase: 3 },
  // Piano
  { id: 'pn1', track: 'piano', title: 'Módulo 1 · Acordes fundamentales', goal: 'Tríadas, séptimas e inversiones en todas las tonalidades.', phase: 1 },
  { id: 'pn2', track: 'piano', title: 'Módulo 2 · Conducción de voces', goal: 'Conectar acordes moviendo lo mínimo.', phase: 1 },
  { id: 'pn3', track: 'piano', title: 'Módulo 3 · Acompañamiento jazz y blues', goal: 'Comping, shells, voicings sin fundamental y coordinación.', phase: 1 },
  { id: 'pn4', track: 'piano', title: 'Módulo 4 · Improvisación', goal: 'Mano derecha melódica sobre mano izquierda estable.', phase: 2 },
  { id: 'pn5', track: 'piano', title: 'Módulo 5 · Standards en piano', goal: 'Temas completos con ambas manos.', phase: 2 },
  { id: 'pn6', track: 'piano', title: 'Módulo 6 · Interpretación independiente', goal: 'Introducciones, finales y armonización.', phase: 3 },
];

const REC_CRITERIA = ['Las notas encajan con los acordes', 'El tempo se mantiene estable', 'Las frases tienen principio y final', 'Hay espacio (silencios)', 'Suena con intención (dinámica, articulación)'];

// ======================= TEORÍA COMPARTIDA =======================
const SHARED: Lesson[] = [
  {
    id: 'th-intervals', track: 'shared', module: 'th1', title: 'Tonos, semitonos e intervalos', level: 1, skills: ['oido', 'armonia'], concept: 'intervalos',
    what: 'La distancia entre dos notas, medida en semitonos y en número de letras (2ª, 3ª, 5ª…).',
    why: 'Todo acorde y escala es una lista de intervalos. Si oyes intervalos, puedes tocar lo que imaginas.',
    sound: 'Las 3ªs (menor/mayor) dan el color triste/alegre; la 5ª justa es estable; el tritono es tenso.',
    how: { sax: 'Toca cada intervalo desde tu nota más cómoda y cántalo antes de tocarlo.', guitar: 'Un semitono = un traste. Una 3ª mayor = 4 trastes o una cuerda más arriba un traste atrás.', piano: 'Cuenta teclas (blancas y negras): 3ª mayor = 4 semitonos (Do–Mi).' },
    songs: ['Blues en Fa (jazz blues)', 'Autumn Leaves'],
    improv: 'Improvisa usando solo dos notas a distancia de 3ª menor (ej. Fa–La♭ sobre un blues en Fa).',
    exercises: [
      { kind: 'scale', step: 'escuchar', title: 'Escucha la escala cromática y la mayor', scale: 'major', key: 'C', text: 'Fíjate dónde están los semitonos: Mi–Fa y Si–Do.' },
      { kind: 'quiz', step: 'evaluar', title: 'Reconoce intervalos de oído', quiz: 'interval-ear', count: 8, concept: 'intervalos' },
      { kind: 'improv', step: 'crear', title: 'Dos notas, mucho ritmo', progression: 'blues12', key: 'F', style: 'swing', bpm: 100, minutes: 3, prompts: ['Solo Fa y La♭ (concierto).', 'Varía el ritmo, no las notas.', 'Después añade Do (5ª).'] },
    ],
  },
  {
    id: 'th-major', track: 'shared', module: 'th1', title: 'La escala mayor y los grados', level: 1, skills: ['escalas', 'armonia'], concept: 'escala-mayor',
    what: 'Fórmula T T S T T T S. Cada nota tiene un número (grado): 1 2 3 4 5 6 7.',
    why: 'Los cifrados, los acordes y los modos se describen con grados de la escala mayor.',
    sound: 'Estable y luminosa; el 7º grado (sensible) "pide" subir a la tónica.',
    how: { sax: 'Toca la escala en tu tonalidad escrita; luego en 3 tonalidades de concierto: C, F y B♭.', guitar: 'Patrón de una octava desde la 6ª cuerda; nombra cada grado mientras tocas.', piano: 'Mano derecha con digitación 1-2-3-1-2-3-4-5 (Do mayor).' },
    songs: ['Satin Doll', 'There Will Never Be Another You'],
    improv: 'Sobre Cmaj7, toca frases que terminen en 3 o en 5. Evita terminar en 4.',
    exercises: [
      { kind: 'scale', step: 'visualizar', title: 'Escala mayor en tu instrumento', scale: 'major', key: 'C', showArpeggio: 'Cmaj7' },
      { kind: 'quiz', step: 'evaluar', title: 'Grados de la escala', quiz: 'degree', count: 8, concept: 'escala-mayor' },
      { kind: 'quiz', step: 'consolidar', title: 'Notas de escalas mayores', quiz: 'scale-notes', count: 6, concept: 'escala-mayor' },
    ],
  },
  {
    id: 'th-minor', track: 'shared', module: 'th1', title: 'La escala menor natural y la relativa', level: 1, skills: ['escalas'], concept: 'escala-menor',
    what: 'Fórmula T S T T S T T. Comparte notas con la mayor que está una 3ª menor arriba (La menor = Do mayor).',
    why: 'Autumn Leaves está entera en Sol menor / Si♭ mayor: si lo ves así, todo se simplifica.',
    sound: 'Melancólica; la b3 y la b6 la definen.',
    how: { sax: 'Toca Sol menor y Si♭ mayor seguidas (concierto): son las mismas notas.', guitar: 'Mismo patrón que la mayor empezando desde el 6º grado.', piano: 'La menor: solo teclas blancas desde La.' },
    songs: ['Autumn Leaves', 'Blue Bossa'],
    improv: 'Improvisa en Sol menor sobre los primeros 8 compases de Autumn Leaves.',
    exercises: [
      { kind: 'scale', step: 'escuchar', title: 'Menor natural de Sol', scale: 'minor', key: 'G' },
      { kind: 'compare', step: 'comprender', title: 'Mayor vs. menor sobre su acorde', progression: 'I-IV-V', key: 'C', scales: ['major', 'minor'], style: 'ballad', bpm: 70, text: 'Escucha la misma progresión con las dos escalas.' },
      { kind: 'quiz', step: 'evaluar', title: 'Notas de escalas', quiz: 'scale-notes', count: 6, concept: 'escala-menor' },
    ],
  },
  {
    id: 'th-pentatonic', track: 'shared', module: 'th1', title: 'Pentatónicas mayor y menor', level: 1, skills: ['escalas', 'improvisacion'], concept: 'pentatonicas',
    what: 'Escalas de 5 notas sin semitonos. Menor: 1 b3 4 5 b7. Mayor: 1 2 3 5 6. Son relativas (La menor pent. = Do mayor pent.).',
    why: 'Es el primer vocabulario de improvisación: no tiene notas que choquen fuerte.',
    sound: 'Abierta, "segura". La menor suena a blues/rock; la mayor a country/blues dulce.',
    how: { sax: 'Memoriza la pentatónica menor de Fa, Si♭ y Do concierto (tus blues más comunes).', guitar: 'Posición 1 (forma de caja) desde la 6ª cuerda: el patrón más usado del blues.', piano: 'Mi♭ pentatónica menor ≈ teclas negras: un buen comienzo para la mano derecha.' },
    songs: ['Blues shuffle en La', 'Blues menor en Do'],
    improv: 'Sobre el blues: 2 compases de frase, 2 de silencio, durante 3 vueltas.',
    exercises: [
      { kind: 'scale', step: 'escuchar', title: 'Pentatónica menor de La', scale: 'pentMinor', key: 'A' },
      { kind: 'scale', step: 'visualizar', title: 'Pentatónica mayor de Do (relativa)', scale: 'pentMajor', key: 'C' },
      { kind: 'improv', step: 'aplicar', title: 'Pentatónica sobre blues en La', progression: 'blues12', key: 'A', style: 'blues', bpm: 90, minutes: 4, scale: 'pentMinor', prompts: ['Usa solo 3 notas de la escala la primera vuelta.', 'Pregunta (2 compases) – respuesta (2 compases).', 'Termina cada frase en la tónica o en la 5ª.'] },
    ],
  },
  {
    id: 'th-blues-scale', track: 'shared', module: 'th1', title: 'La escala blues y la blue note', level: 1, skills: ['escalas', 'improvisacion'], concept: 'escala-blues',
    what: 'Pentatónica menor + b5: 1 b3 4 b5 5 b7.',
    why: 'La b5 añade la tensión característica del blues. Bien usada, da autenticidad; mal usada, suena a error.',
    sound: 'Áspera, expresiva. La b5 funciona como nota de paso.',
    how: { sax: 'Desliza la b5 hacia el 4 o el 5; prueba un "growl" suave.', guitar: 'La b5 está un traste encima del 4: tócala con hammer-on o slide.', piano: 'Haz "crushed notes": b3 y 3 casi juntas (adorno típico de blues).' },
    songs: ['Blue Monk', 'Blues en Fa (jazz blues)'],
    improv: 'Usa la b5 solo como nota de paso, nunca como final de frase.',
    exercises: [
      { kind: 'phrase', step: 'imitar', title: 'Imita: blue note de paso', phrase: 'blues-bluenote' },
      { kind: 'compare', step: 'comprender', title: 'Pentatónica menor vs. blues vs. mixolidio sobre el blues', progression: 'blues12', key: 'F', scales: ['pentMinor', 'blues', 'mixolydian'], style: 'blues', bpm: 90 },
      { kind: 'improv', step: 'crear', title: 'Blues en Fa con escala blues', progression: 'blues12', key: 'F', style: 'swing', bpm: 110, minutes: 4, scale: 'blues', prompts: ['Una frase por cada 4 compases.', 'Repite tu mejor frase en el IV7.', 'Usa la b5 solo de paso.'] },
    ],
  },
  {
    id: 'th-diatonic', track: 'shared', module: 'th1', title: 'Acordes construidos desde la escala', level: 1, skills: ['armonia', 'acordes'], concept: 'diatonicos',
    what: 'Apilando 3ªs sobre cada grado de la escala mayor se obtienen: Imaj7, ii m7, iii m7, IVmaj7, V7, vi m7, viiø.',
    why: 'Explica por qué Dm7–G7–Cmaj7 "suena junto": todos salen de Do mayor.',
    sound: 'maj7 suave, m7 cálido, 7 tenso (pide resolver), m7b5 inestable.',
    how: { sax: 'Arpegia los 7 acordes diatónicos de Do subiendo por la escala.', guitar: 'Toca los 7 con shells en la 5ª y 6ª cuerda.', piano: 'Mano izquierda: los 7 acordes en posición fundamental, luego en inversiones.' },
    songs: ['Satin Doll', 'Autumn Leaves'],
    improv: 'Sobre la progresión I-vi-ii-V, arpegia cada acorde empezando por su 3ª.',
    exercises: [
      { kind: 'chords', step: 'visualizar', title: 'Acordes diatónicos de Do', symbols: ['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5'] },
      { kind: 'quiz', step: 'evaluar', title: 'Notas de los acordes', quiz: 'chord-notes', count: 8, concept: 'diatonicos' },
    ],
  },
  // ---------- Nivel 2 ----------
  {
    id: 'th-triads', track: 'shared', module: 'th2', title: 'Tríadas: mayor, menor, disminuida, aumentada', level: 1, skills: ['acordes', 'oido'], concept: 'triadas',
    what: 'Tres notas por terceras. Mayor: 1 3 5. Menor: 1 b3 5. Disminuida: 1 b3 b5. Aumentada: 1 3 #5.',
    why: 'Son los ladrillos de todos los acordes. Las tríadas superiores son una gran herramienta de improvisación.',
    sound: 'Mayor: brillante. Menor: oscura. Disminuida: tensa. Aumentada: suspendida, "de sueño".',
    how: { sax: 'Arpegia las 4 tríadas desde la misma nota.', guitar: 'Tríadas en las cuerdas 1-2-3 (formas pequeñas).', piano: 'Una mano, mismo dedo en la fundamental: 1-3-5.' },
    songs: ['Blues shuffle en La'], improv: 'Improvisa usando solo las notas de la tríada del acorde que suena.',
    exercises: [
      { kind: 'chords', step: 'visualizar', title: 'Las 4 tríadas de Do', symbols: ['C', 'Cm', 'Cdim', 'Caug'], voicings: ['root', 'inv1', 'inv2'] },
      { kind: 'quiz', step: 'evaluar', title: 'Reconoce tríadas de oído', quiz: 'triad-ear', count: 8, concept: 'triadas' },
    ],
  },
  {
    id: 'th-sevenths', track: 'shared', module: 'th2', title: 'Acordes de séptima: maj7, m7, 7, m7b5, dim7', level: 1, skills: ['acordes', 'oido', 'armonia'], concept: 'septimas',
    what: 'Tríada + 7ª. maj7 = 1 3 5 7; m7 = 1 b3 5 b7; 7 = 1 3 5 b7; m7b5 = 1 b3 b5 b7; dim7 = 1 b3 b5 bb7.',
    why: 'El jazz se escribe con acordes de séptima. Saber la 3ª y la 7ª de cada uno es la base de las notas guía.',
    sound: 'El dominante 7 tiene un tritono (3–b7) que pide resolver.',
    how: { sax: 'Arpegios de 4 notas subiendo y bajando, en corcheas swing.', guitar: 'Drop 3 desde la 6ª cuerda y drop 2 desde la 5ª.', piano: 'Posición fundamental y luego las 3 inversiones.' },
    songs: ['Autumn Leaves', 'Blue Bossa'], improv: 'Sobre cada acorde toca 1-3-5-7 y después 7-5-3-1, siguiendo los cambios.',
    exercises: [
      { kind: 'chords', step: 'escuchar', title: 'Cinco sabores de séptima sobre Do', symbols: ['Cmaj7', 'Cm7', 'C7', 'Cm7b5', 'Cdim7'] },
      { kind: 'quiz', step: 'evaluar', title: 'Reconoce la calidad del acorde de oído', quiz: 'chord-ear', count: 10, concept: 'septimas' },
      { kind: 'quiz', step: 'consolidar', title: '3ª y 7ª de cada acorde', quiz: 'guide-tone', count: 8, concept: 'notas-guia' },
    ],
  },
  {
    id: 'th-tensions', track: 'shared', module: 'th2', title: 'Tensiones 9, 11, 13 y acordes sus', level: 2, skills: ['acordes', 'armonia'], concept: 'tensiones',
    what: 'Notas por encima de la 7ª: 9 (=2), 11 (=4), 13 (=6). sus4: la 4ª reemplaza a la 3ª.',
    why: 'Las tensiones dan el color moderno del jazz y aparecen en voicings y en melodías.',
    sound: 'La 9 suaviza; la 13 en un dominante suena "a big band"; la b9 es oscura.',
    how: { sax: 'Termina frases en la 9 de un maj7 o en la 13 de un dominante.', guitar: 'C9 y G13: formas de 4 notas sin fundamental arriba.', piano: 'Voicings sin fundamental: 3-5-7-9.' },
    songs: ['Misty'], improv: 'Sobre Cmaj7, toca notas largas en 9 y 7.',
    exercises: [
      { kind: 'chords', step: 'escuchar', title: 'De 7 a 9 y 13', symbols: ['G7', 'G9', 'G13', 'G7b9', 'G7sus4'] },
    ],
  },
  {
    id: 'th-inversions', track: 'shared', module: 'th2', title: 'Inversiones y conducción de voces', level: 2, skills: ['acordes', 'armonia'], concept: 'inversiones',
    what: 'Cambiar qué nota del acorde está abajo. Conducción de voces: moverse a la inversión más cercana.',
    why: 'Permite acompañar sin saltos y oír la armonía como líneas melódicas.',
    sound: 'En un ii-V-I bien conducido, solo se mueven 1–2 notas por acorde, medio tono.',
    how: { sax: 'Toca las líneas de 3ª y 7ª (notas guía) que salen de la conducción.', guitar: 'Shells: la 7ª baja medio tono a la 3ª del siguiente.', piano: 'Dm7 (fundamental) → G7 (2ª inversión) → Cmaj7 (fundamental).' },
    songs: ['Autumn Leaves', 'Satin Doll'], improv: 'Canta la voz superior de los acordes conducidos mientras suena el acompañamiento.',
    exercises: [
      { kind: 'chords', step: 'visualizar', title: 'ii-V-I con conducción mínima', symbols: ['Dm7', 'G7', 'Cmaj7'], voiceLead: true },
      { kind: 'progression', step: 'aplicar', title: 'Notas guía del ii-V-I', progression: 'iiVI', key: 'C', style: 'swing', bpm: 90, display: 'guide' },
    ],
  },
  // ---------- Nivel 3 ----------
  {
    id: 'th-blues-form', track: 'shared', module: 'th3', title: 'I-IV-V y el blues de 12 compases', level: 1, skills: ['armonia', 'oido', 'repertorio'], concept: 'blues',
    what: 'Tónica (I), subdominante (IV) y dominante (V). El blues los ordena en 12 compases.',
    why: 'Es la forma con la que más se toca en jams; y prepara para el blues jazzístico.',
    sound: 'I = casa; IV = alejarse; V = tensión que vuelve a casa.',
    how: { sax: 'Cuenta los 12 compases en voz alta mientras suena la base.', guitar: 'Riff de quintas (power chords) con el patrón 5-6.', piano: 'Mano izquierda: fundamental y 5ª; derecha: tríadas en 2 y 4.' },
    songs: ['Blues shuffle en La', 'Blue Monk'], improv: 'Toca una nota por compás: la fundamental del acorde. Luego su 3ª.',
    exercises: [
      { kind: 'progression', step: 'escuchar', title: 'Blues de 12 compases en La', progression: 'blues12', key: 'A', style: 'blues', bpm: 90, display: 'chords' },
      { kind: 'quiz', step: 'evaluar', title: 'Reconoce progresiones de oído', quiz: 'progression-ear', count: 6, concept: 'progresiones' },
    ],
  },
  {
    id: 'th-iiVI', track: 'shared', module: 'th3', title: 'ii-V-I mayor', level: 1, skills: ['armonia', 'improvisacion'], concept: 'iiVI',
    what: 'ii m7 → V7 → Imaj7: subdominante → dominante → tónica, con raíces por 4ªs.',
    why: 'Es la frase armónica más frecuente del jazz. Autumn Leaves, Satin Doll, Misty… están hechas de ii-V-I.',
    sound: 'Tensión creciente que se relaja en el I.',
    how: { sax: 'Notas guía: 7ª del ii → 3ª del V → 7ª del V → 3ª del I.', guitar: 'Shells: ii desde la 5ª cuerda, V desde la 6ª, I desde la 5ª (zona de 3 trastes).', piano: 'Voicings A/B: Dm7 (F A C E) → G7 (F A B E) → Cmaj7 (E G B D).' },
    songs: ['Autumn Leaves', 'Satin Doll', 'There Will Never Be Another You'], improv: 'Arpegio del ii, notas guía en el V, termina en la 3ª o la 9ª del I.',
    exercises: [
      { kind: 'phrase', step: 'imitar', title: 'Imita: arpegio del ii y resolución', phrase: 'iiVI-arp' },
      { kind: 'progression', step: 'visualizar', title: 'ii-V-I: escalas por acorde', progression: 'iiVI', key: 'C', style: 'swing', bpm: 100, display: 'scales' },
      { kind: 'improv', step: 'crear', title: 'ii-V-I en 3 tonalidades', progression: 'iiVI', key: 'Bb', style: 'swing', bpm: 110, minutes: 4, prompts: ['Empieza cada acorde en su 3ª.', 'Cambia la tonalidad tras 4 vueltas (selector de tonalidad).'] },
    ],
  },
  {
    id: 'th-iiVImin', track: 'shared', module: 'th3', title: 'ii-V-i menor', level: 2, skills: ['armonia', 'improvisacion'], concept: 'iiVImin',
    what: 'iiø (m7b5) → V7b9 → i m6/m7. La b9 del dominante es la b6 de la tonalidad.',
    why: 'Autumn Leaves y Blue Bossa alternan ii-V-I mayores y menores.',
    sound: 'Más oscuro y dramático que el mayor.',
    how: { sax: 'Menor armónica desde la tónica menor sobre todo el ii-V-i como primera aproximación.', guitar: 'Dm7b5 (x5656x) → G7b9 (forma de 5ª cuerda que muestra la app) → Cm6.', piano: 'Dm7b5 (F Ab C D) → G7b9 (F Ab B D) → Cm6.' },
    songs: ['Autumn Leaves', 'Blue Bossa'], improv: 'Apunta a la b9 (La♭ en Do menor) sobre G7.',
    exercises: [
      { kind: 'phrase', step: 'imitar', title: 'Imita: ii-V-i menor con b9', phrase: 'iiVImin-line' },
      { kind: 'progression', step: 'aplicar', title: 'Notas guía del ii-V-i menor', progression: 'iiVImin', key: 'C', style: 'swing', bpm: 90, display: 'guide' },
    ],
  },
  {
    id: 'th-secondary', track: 'shared', module: 'th3', title: 'Turnarounds y dominantes secundarios', level: 2, skills: ['armonia'], concept: 'secundarios',
    what: 'Un dominante secundario es el V7 de un acorde que no es la tónica (A7 = V7 de Dm7). El turnaround I-vi-ii-V devuelve al principio.',
    why: 'Explica acordes "fuera de la tonalidad" que aparecen en casi todos los standards.',
    sound: 'Cambiar vi m7 por VI7 añade un empuje hacia el ii.',
    how: { sax: 'Sobre A7 toca C# (3ª): es la nota que cambia respecto a Am7.', guitar: 'Am7 → A7: solo cambia una nota (C → C#).', piano: 'Escucha la diferencia I–vi–ii–V vs. I–VI7–ii–V.' },
    songs: ['Blues en Fa (jazz blues)', 'Satin Doll'], improv: 'Destaca la 3ª de cada dominante secundario.',
    exercises: [
      { kind: 'compare', step: 'escuchar', title: 'vi m7 vs. VI7', progression: 'secDom', key: 'C', scales: ['major', 'mixolydian'], style: 'swing', bpm: 100, text: 'Escucha la progresión con dominante secundario y compara con el turnaround diatónico.' },
      { kind: 'progression', step: 'aplicar', title: 'I-VI7-ii-V con notas guía', progression: 'secDom', key: 'C', style: 'swing', bpm: 100, display: 'guide' },
    ],
  },
  {
    id: 'th-jazz-blues', track: 'shared', module: 'th3', title: 'Blues jazzístico', level: 2, skills: ['armonia', 'repertorio', 'improvisacion'], concept: 'jazz-blues',
    what: 'El blues con ii-V, VI7 y disminuidos de paso.',
    why: 'Es el puente entre el blues y los standards: los mismos 12 compases, con lenguaje de jazz.',
    sound: 'Más movimiento armónico; se oye el "hacia dónde va".',
    how: { sax: 'Escala blues en los compases 1–6, notas guía en 7–12.', guitar: 'Shells de dominante recorriendo la forma.', piano: 'Voicings sin fundamental con conducción.' },
    songs: ['Blues en Fa (jazz blues)', 'Blue Monk'], improv: 'Mezcla frases de blues con resoluciones de ii-V.',
    exercises: [
      { kind: 'progression', step: 'visualizar', title: 'Blues jazzístico en Fa', progression: 'jazzBlues', key: 'F', style: 'swing', bpm: 120, display: 'guide' },
      { kind: 'improv', step: 'crear', title: 'Improvisa sobre el blues jazzístico', progression: 'jazzBlues', key: 'F', style: 'swing', bpm: 120, minutes: 5, prompts: ['Compases 1–4: escala blues.', 'Compases 8–12: apunta a la 3ª de cada acorde.'] },
    ],
  },
  {
    id: 'th-rhythm', track: 'shared', module: 'th3', title: 'Ritmo, subdivisión y swing', level: 1, skills: ['ritmo'], concept: 'swing',
    what: 'En swing las corcheas se tocan desiguales (larga-corta, aprox. tresillo 2+1) y se acentúan los tiempos 2 y 4.',
    why: 'Un solo con notas correctas y mal ritmo suena peor que uno con notas simples y buen swing.',
    sound: 'Escucha el charles en 2 y 4 y el ride "ching, chicka-ching".',
    how: { sax: 'Articula "du-ba du-ba" con la lengua, acento en el "ba".', guitar: 'Púa abajo en tiempo, arriba en contratiempo; acentúa el contratiempo.', piano: 'Mano izquierda en 2 y 4 mientras la derecha toca corcheas swing.' },
    songs: ['Blue Monk'], improv: 'Toca una sola nota con distintos ritmos durante un chorus completo.',
    exercises: [
      { kind: 'phrase', step: 'imitar', title: 'Imita las corcheas swing', phrase: 'blues-descent' },
      { kind: 'improv', step: 'crear', title: 'Una nota, mil ritmos', progression: 'blues12', key: 'F', style: 'swing', bpm: 110, minutes: 3, prompts: ['Solo la nota Do (5ª de Fa).', 'Prueba anticipaciones (tocar en el "y" del 4).', 'Deja silencios de un compás.'] },
    ],
  },
  // ---------- Nivel 4: modos ----------
  {
    id: 'th-modes-intro', track: 'shared', module: 'th4', title: 'Modos: la misma colección, otro centro', level: 2, skills: ['escalas', 'oido'], concept: 'modos',
    what: 'Cada modo empieza en un grado distinto de la escala mayor. Re dórico = notas de Do mayor desde Re. Lo importante es su nota característica comparada con la escala mayor/menor de la misma tónica.',
    why: 'Pensar en modos ayuda en música modal y para elegir colores; en jazz tonal muchas veces basta con la tonalidad y las notas guía.',
    sound: 'Jónico (brillante) → Lidio (más brillante, #4) → Mixolidio (b7) → Dórico (menor con 6) → Eólico (b6) → Frigio (b2) → Locrio (b5).',
    how: { sax: 'Toca los 7 modos desde la misma tónica (paralelos), no desde la misma escala.', guitar: 'Mismo patrón, nota característica marcada en el diapasón.', piano: 'Mano izquierda: bordón (1-5); derecha: el modo.' },
    songs: ['Blue Bossa'], improv: 'Sobre un bordón, cambia de modo cada 4 compases y escucha el cambio de color.',
    exercises: [
      { kind: 'scale', step: 'visualizar', title: 'Re dórico', scale: 'dorian', key: 'D' },
      { kind: 'quiz', step: 'evaluar', title: 'Reconoce el modo de oído', quiz: 'mode-ear', count: 6, concept: 'modos' },
    ],
  },
  {
    id: 'th-mixo-blues', track: 'shared', module: 'th4', title: 'Mixolidio vs. pentatónica en el blues', level: 2, skills: ['escalas', 'improvisacion'], concept: 'modos',
    what: 'Sobre un acorde dominante, el mixolidio contiene la 3ª mayor del acorde; la pentatónica menor/blues contiene la b3 que "roza" contra ella.',
    why: 'Mezclar los dos sonidos (dentro / blue) es la esencia del blues jazzístico.',
    sound: 'Mixolidio: más "dentro", armónico. Pentatónica menor: más crudo, vocal.',
    how: { sax: 'Alterna 2 compases de mixolidio y 2 de escala blues.', guitar: 'Superpón las dos formas en la misma zona del mástil.', piano: 'Mano izquierda shell del I7; derecha alterna las escalas.' },
    songs: ['Blues en Fa (jazz blues)'], improv: 'Haz la pregunta con mixolidio y la respuesta con escala blues.',
    exercises: [
      { kind: 'compare', step: 'escuchar', title: 'Tres colores sobre el blues', progression: 'blues12', key: 'F', scales: ['mixolydian', 'pentMinor', 'blues', 'bluesMajor'], style: 'swing', bpm: 100 },
    ],
  },
  {
    id: 'th-dorian', track: 'shared', module: 'th4', title: 'Dórico: la 6ª mayor en contexto menor', level: 2, skills: ['escalas', 'improvisacion'], concept: 'modos',
    what: 'Dórico = menor natural con 6ª mayor. Sobre un vamp i m7 – IV7, el IV7 contiene esa 6ª.',
    why: 'Es el sonido del ii en un ii-V-I y de muchos temas modales.',
    sound: 'Menor, pero con luz.',
    how: { sax: 'Sostén la 6ª sobre el i m7.', guitar: 'Marca la 6ª en el diapasón y úsala como nota objetivo.', piano: 'Voicing en cuartas sobre Dm7 (E A D G).' },
    songs: ['Blue Bossa', 'Blues menor en Do'], improv: 'Frases que pasen por la 6ª y resuelvan a la 5ª.',
    exercises: [
      { kind: 'phrase', step: 'imitar', title: 'Imita: la 6ª dórica', phrase: 'dorian-sixth' },
      { kind: 'compare', step: 'comprender', title: 'Dórico vs. eólico', progression: 'dorianVamp', key: 'D', scales: ['dorian', 'aeolian'], style: 'bossa', bpm: 100 },
      { kind: 'improv', step: 'crear', title: 'Vamp dórico', progression: 'dorianVamp', key: 'D', style: 'bossa', bpm: 100, minutes: 4, scale: 'dorian', prompts: ['Destaca la 6ª (Si natural en Re dórico).', 'Usa motivos cortos y repítelos.'] },
    ],
  },
  {
    id: 'th-tonal-vs-modal', track: 'shared', module: 'th4', title: 'Cuándo NO pensar en modos', level: 3, skills: ['armonia', 'improvisacion'], concept: 'modos',
    what: 'En un ii-V-I, Dm7 dórico + G7 mixolidio + Cmaj7 jónico = todas son la escala de Do mayor. Pensar "tres modos" es redundante; lo que define el cambio son las notas guía.',
    why: 'Evita la parálisis de "una escala por acorde" y te centra en lo que suena: 3ªs, 7ªs y resoluciones.',
    sound: 'Una línea en Do mayor que cae en F (sobre Dm7), B (sobre G7) y E (sobre Cmaj7) ya describe la armonía.',
    how: { sax: 'Improvisa con Do mayor sobre el ii-V-I, asegurando la 3ª de cada acorde en el tiempo 1.', guitar: 'Una posición de Do mayor + notas objetivo marcadas.', piano: 'Mano izquierda con voicings conducidos; derecha en Do mayor apuntando a notas guía.' },
    songs: ['Satin Doll', 'Autumn Leaves'], improv: 'Una sola escala, objetivo: 3ª del acorde en cada tiempo 1.',
    exercises: [
      { kind: 'progression', step: 'visualizar', title: 'ii-V-I: notas guía sobre una sola escala', progression: 'iiVI', key: 'C', style: 'swing', bpm: 100, display: 'guide' },
      { kind: 'quiz', step: 'evaluar', title: '¿Qué escala funciona y por qué?', quiz: 'scale-for-chord', count: 6, concept: 'acorde-escala' },
    ],
  },
];

// ======================= SAXOFÓN =======================
const SAX: Lesson[] = [
  {
    id: 'sx-blues-call', track: 'sax', module: 'sx1', title: 'Pregunta y respuesta en el blues', level: 1, skills: ['improvisacion', 's_fraseo', 'ritmo'], concept: 'pentatonicas',
    what: 'Frases de 2 compases seguidas de 2 compases de silencio o de respuesta.',
    why: 'Construye la noción de frase: principio, final y espacio. Es cómo "habla" el blues.',
    sound: 'Como una conversación: la respuesta contesta a la pregunta (repite, varía o contrasta).',
    how: { sax: 'Aire constante, articulación suave en las corcheas swing. Las notas largas con vibrato al final.' },
    songs: ['Blues en Fa (jazz blues)', 'Blue Monk'], improv: 'Imita la frase modelo y después responde con una variación propia.',
    exercises: [
      { kind: 'phrase', step: 'escuchar', title: 'Escucha e imita: llamada pentatónica', phrase: 'blues-call' },
      { kind: 'phrase', step: 'imitar', title: 'Imita: motivo y repetición', phrase: 'blues-motif' },
      { kind: 'improv', step: 'crear', title: 'Pregunta-respuesta sobre blues en Fa', progression: 'blues12', key: 'F', style: 'swing', bpm: 110, minutes: 4, scale: 'pentMinor', prompts: ['Compás 1–2: pregunta. 3–4: silencio.', 'Segunda vuelta: responde con la misma frase cambiando el final.', 'Tercera vuelta: respuesta más aguda.'] },
      { kind: 'record', step: 'evaluar', title: 'Grábate un chorus', prompt: 'Graba un chorus de blues en Fa con pregunta-respuesta.', criteria: REC_CRITERIA },
    ],
  },
  {
    id: 'sx-blues-color', track: 'sax', module: 'sx1', title: 'Blue notes y blues mayor/menor', level: 1, skills: ['escalas', 's_fraseo'],
    concept: 'escala-blues',
    what: 'Mezclar escala blues (b3, b5) con blues mayor (b3→3) según el acorde.',
    why: 'Da el sonido de los saxofonistas de blues y swing: dulce y áspero a la vez.',
    sound: 'La b3 que se desliza a la 3 sobre el I7 es el gesto central.',
    how: { sax: 'Prueba un "scoop" (empezar la nota un poco baja y subir) en la b3.' },
    songs: ['Blue Monk', 'Blues en Fa (jazz blues)'], improv: 'Usa b3→3 en el I7 y la b7 del IV7 (que es la b3 del I).',
    exercises: [
      { kind: 'phrase', step: 'imitar', title: 'Imita: de b3 a 3', phrase: 'blues-major-minor' },
      { kind: 'phrase', step: 'imitar', title: 'Imita: blue note de paso', phrase: 'blues-bluenote' },
      { kind: 'compare', step: 'comprender', title: 'Escala blues vs. blues mayor', progression: 'blues12', key: 'F', scales: ['blues', 'bluesMajor', 'mixolydian'], style: 'swing', bpm: 100 },
    ],
  },
  {
    id: 'sx-motif', track: 'sax', module: 'sx1', title: 'Desarrollo de motivos', level: 2, skills: ['improvisacion', 's_fraseo'],
    what: 'Tomar una idea corta y repetirla, transponerla, alargarla o cambiar su ritmo.',
    why: 'Un solo con 2–3 ideas desarrolladas se entiende mejor que muchas notas sin relación.',
    sound: 'Coherencia: el oyente reconoce la idea y disfruta su transformación.',
    how: { sax: 'Elige 3 notas. Repite el ritmo con otras notas; luego las mismas notas con otro ritmo.' },
    songs: ['Blue Monk'], improv: 'Un chorus entero con un único motivo de 3 notas.',
    exercises: [
      { kind: 'phrase', step: 'escuchar', title: 'Modelo: motivo y repetición', phrase: 'blues-motif' },
      { kind: 'improv', step: 'crear', title: 'Un motivo, un chorus', progression: 'blues12', key: 'Bb', style: 'swing', bpm: 110, minutes: 4, prompts: ['Motivo de 3 notas.', 'Repetir → variar ritmo → variar final → desplazar.'] },
      { kind: 'record', step: 'evaluar', title: 'Graba tu desarrollo de motivo', prompt: 'Un chorus desarrollando un solo motivo.', criteria: ['Se reconoce el motivo', 'Hay al menos 3 variaciones', 'El final resuelve'] },
    ],
  },
  {
    id: 'sx-arpeggios', track: 'sax', module: 'sx2', title: 'Arpegios de séptima en tu saxo', level: 1, skills: ['acordes', 'armonia', 's_articulacion'], concept: 'septimas',
    what: 'Arpegios 1-3-5-7 de los acordes de un ii-V-I, leídos en tu transposición.',
    why: 'Las notas del acorde son el esqueleto de cualquier línea de jazz.',
    sound: 'Al tocar el arpegio sobre el acompañamiento, la armonía "se oye" en tu línea.',
    how: { sax: 'Corcheas swing, legato con lengua suave ("du"). Sube 1-3-5-7 y baja 7-5-3-1.' },
    songs: ['Autumn Leaves'], improv: 'Arpegia cada acorde de Autumn Leaves empezando desde la nota más cercana.',
    exercises: [
      { kind: 'progression', step: 'visualizar', title: 'Arpegios del ii-V-I en Si♭ (concierto)', progression: 'iiVI', key: 'Bb', style: 'swing', bpm: 90, display: 'arpeggios' },
      { kind: 'quiz', step: 'evaluar', title: 'Transposición de concierto a tu saxo', quiz: 'sax-transpose', count: 8 },
    ],
  },
  {
    id: 'sx-guide-tones', track: 'sax', module: 'sx2', title: 'Notas guía y resolución', level: 1, skills: ['armonia', 's_resolucion'], concept: 'notas-guia',
    what: 'Las 3ªs y 7ªs definen cada acorde. Unidas por el movimiento mínimo forman una línea que "canta" la armonía.',
    why: 'Con solo notas guía ya suenas a jazz: es la base para encadenar frases a través de los cambios.',
    sound: 'Semitono descendente de la 7ª a la 3ª del siguiente acorde.',
    how: { sax: 'Redondas primero; después rodea cada nota guía con 2–3 notas de la escala.' },
    songs: ['Autumn Leaves', 'Satin Doll'], improv: 'Línea de notas guía en negras, luego en corcheas añadiendo notas de paso.',
    exercises: [
      { kind: 'progression', step: 'visualizar', title: 'Línea de notas guía', progression: 'iiVI', key: 'C', style: 'swing', bpm: 90, display: 'guide' },
      { kind: 'phrase', step: 'imitar', title: 'Imita: resolución por notas guía', phrase: 'iiVI-arp' },
      { kind: 'quiz', step: 'evaluar', title: '3ª y 7ª de cada acorde', quiz: 'guide-tone', count: 8, concept: 'notas-guia' },
      { kind: 'improv', step: 'crear', title: 'Notas guía sobre blues jazzístico', progression: 'jazzBlues', key: 'F', style: 'swing', bpm: 110, minutes: 4, prompts: ['Primera vuelta: solo notas guía (redondas).', 'Segunda vuelta: añade una nota de aproximación antes de cada una.'] },
    ],
  },
  {
    id: 'sx-iiVI', track: 'sax', module: 'sx2', title: 'ii-V-I en las tonalidades más comunes', level: 2, skills: ['armonia', 'improvisacion', 's_resolucion'], concept: 'iiVI',
    what: 'Una línea de ii-V-I aprendida y llevada a Fa, Si♭, Mi♭ y Do (concierto).',
    why: 'Esas tonalidades cubren la mayoría de standards para vientos.',
    sound: 'La misma idea en distintas alturas: el oído aprende la función, no las notas.',
    how: { sax: 'Usa el ejercicio de transposición: la app te muestra la frase escrita para tu saxo en cada tonalidad.' },
    songs: ['There Will Never Be Another You', 'Satin Doll'], improv: 'Toca la frase y continúa improvisando 2 compases más.',
    exercises: [
      { kind: 'transpose', step: 'aplicar', title: 'Transpón la frase de ii-V-I', phrase: 'iiVI-arp', keys: ['F', 'Bb', 'Eb', 'C'] },
      { kind: 'phrase', step: 'imitar', title: 'ii-V-i menor', phrase: 'iiVImin-line' },
    ],
  },
  {
    id: 'sx-chromatic', track: 'sax', module: 'sx3', title: 'Aproximaciones cromáticas y enclosures', level: 2, skills: ['s_vocabulario', 'improvisacion'], concept: 'cromatismo',
    what: 'Llegar a una nota objetivo desde medio tono abajo, o rodeándola (arriba diatónica + abajo cromática).',
    why: 'Es la gramática del bebop: la nota "de fuera" en tiempo débil hace brillar la nota del acorde en tiempo fuerte.',
    sound: 'Tensión breve → resolución inmediata.',
    how: { sax: 'Liga la nota cromática con la nota objetivo; acentúa ligeramente el objetivo.' },
    songs: ['There Will Never Be Another You'], improv: 'Cada vez que cambie el acorde, llega a su 3ª con una aproximación.',
    exercises: [
      { kind: 'phrase', step: 'imitar', title: 'Imita: aproximaciones desde abajo', phrase: 'iiVI-chromatic' },
      { kind: 'phrase', step: 'imitar', title: 'Imita: enclosure', phrase: 'iiVI-enclosure' },
      { kind: 'improv', step: 'crear', title: 'Aproximaciones en ii-V-I', progression: 'iiVIshort', key: 'F', style: 'swing', bpm: 110, minutes: 4, prompts: ['Objetivo: 3ª de cada acorde en el tiempo 1.', 'Desde medio tono abajo, luego enclosure.'] },
    ],
  },
  {
    id: 'sx-bebop', track: 'sax', module: 'sx3', title: 'Escala bebop dominante', level: 3, skills: ['s_vocabulario', 'escalas'], concept: 'bebop',
    what: 'Mixolidio con 7ª mayor de paso: 8 notas que, en corcheas desde una nota del acorde, colocan las notas del acorde en tiempo fuerte.',
    why: 'Herramienta clásica para que las líneas largas suenen "dentro".',
    sound: 'Línea fluida, típica de Charlie Parker y descendientes.',
    how: { sax: 'Desciende desde la fundamental en corcheas. Comprueba que cada tiempo cae en 1, b7, 5, 3.' },
    songs: ['Blues en Fa (jazz blues)'], improv: 'Fragmentos de 4 notas de la escala bebop insertados en frases de blues.',
    exercises: [
      { kind: 'phrase', step: 'imitar', title: 'Imita: escala bebop sobre el I7', phrase: 'bebop-dominant' },
      { kind: 'scale', step: 'visualizar', title: 'Bebop dominante de Fa', scale: 'bebopDominant', key: 'F' },
    ],
  },
  {
    id: 'sx-autumn', track: 'sax', module: 'sx4', title: 'Autumn Leaves en saxofón', level: 2, skills: ['repertorio', 'improvisacion', 's_resolucion'], concept: 'iiVI',
    what: 'Identificar ii-V-I mayores y menores, notas guía y construir un solo.',
    why: 'Es el standard que más enseña por unidad de esfuerzo.',
    sound: 'Escúchalo antes en varias grabaciones (busca en tu plataforma de música).',
    how: { sax: 'Tenor: escrito en La menor/Do mayor. Alto: Mi menor/Sol mayor. La app transpone por ti.' },
    songs: ['Autumn Leaves'], improv: 'Motivo en A, desarrollo en B, clímax en C.',
    exercises: [{ kind: 'song', step: 'aplicar', title: 'Abrir Autumn Leaves', song: 'autumn-leaves' }],
  },
  {
    id: 'sx-bluebossa', track: 'sax', module: 'sx4', title: 'Blue Bossa en saxofón', level: 2, skills: ['repertorio', 'improvisacion'],
    what: 'Do menor dórico + modulación a Re♭ mayor.', why: 'Aprendes a cambiar de "caja" de notas a mitad de tema.', sound: 'Bossa: corcheas iguales (sin swing).',
    how: { sax: 'Articulación más ligada y corcheas rectas.' }, songs: ['Blue Bossa'], improv: 'Prepara la modulación: anticipa el Re♭ un compás antes.',
    exercises: [{ kind: 'song', step: 'aplicar', title: 'Abrir Blue Bossa', song: 'blue-bossa' }],
  },
  {
    id: 'sx-solo-build', track: 'sax', module: 'sx5', title: 'Construcción de un solo: tensión y resolución', level: 3, skills: ['improvisacion', 's_fraseo'],
    what: 'Planificar un solo de 3 choruses: exposición, desarrollo, clímax, cierre.',
    why: 'Un solo es una historia; la energía debe crecer y resolverse.', sound: 'Registro, densidad rítmica y dinámica que aumentan hacia el clímax.',
    how: { sax: 'Chorus 1: registro medio, pocas notas. Chorus 2: más corcheas. Chorus 3: registro agudo y luego cierre.' },
    songs: ['Blues en Fa (jazz blues)', 'Autumn Leaves'], improv: '3 choruses con arco de energía.',
    exercises: [
      { kind: 'improv', step: 'crear', title: 'Solo de 3 choruses', progression: 'jazzBlues', key: 'F', style: 'swing', bpm: 120, minutes: 5, prompts: ['Chorus 1: espacio y motivos.', 'Chorus 2: corcheas y notas guía.', 'Chorus 3: clímax y resolución.'] },
      { kind: 'record', step: 'evaluar', title: 'Graba el solo completo', prompt: 'Graba tus 3 choruses y escúchalo al día siguiente.', criteria: [...REC_CRITERIA, 'Hay un arco de energía claro'] },
    ],
  },
];

// ======================= GUITARRA =======================
const GUITAR: Lesson[] = [
  {
    id: 'gt-notes', track: 'guitar', module: 'gt1', title: 'Notas en la 6ª y 5ª cuerda', level: 1, skills: ['g_diapason'],
    what: 'Ubicar cualquier nota en las cuerdas 6 y 5 (las fundamentales de casi todos los acordes movibles).',
    why: 'Sin esto, los acordes de jazz y las escalas son "formas" sin nombre.', sound: '—',
    how: { guitar: 'Referencias: traste 3 (G/C), 5 (A/D), 7 (B/E), 8 (C/F), 10 (D/G), 12 (E/A).' },
    songs: ['Autumn Leaves'], improv: 'Toca las fundamentales de Autumn Leaves en la 6ª y 5ª cuerda sin pasar del traste 10.',
    exercises: [
      { kind: 'scale', step: 'visualizar', title: 'Notas naturales en el diapasón', scale: 'major', key: 'C' },
      { kind: 'quiz', step: 'evaluar', title: '¿Qué nota es?', quiz: 'fret-note', count: 10 },
    ],
  },
  {
    id: 'gt-octaves-triads', track: 'guitar', module: 'gt1', title: 'Octavas y tríadas en el diapasón', level: 1, skills: ['g_diapason', 'acordes'], concept: 'triadas',
    what: 'Formas de octava (2 cuerdas de distancia, 2 trastes) y tríadas en las cuerdas agudas.',
    why: 'Conectan posiciones y te permiten tocar acordes pequeños en cualquier lugar.', sound: 'Tríadas agudas: sonido limpio de funk/soul y comping ligero.',
    how: { guitar: 'Octava: de 6ª a 4ª cuerda (+2 trastes); de 3ª a 1ª (+3 trastes por la afinación de la 2ª).' },
    songs: ['Blues shuffle en La'], improv: 'Acompaña el blues con tríadas en las cuerdas 1-2-3.',
    exercises: [
      { kind: 'chords', step: 'visualizar', title: 'Tríadas mayores y menores', symbols: ['A', 'D', 'E', 'Am', 'Dm'] },
      { kind: 'quiz', step: 'consolidar', title: 'Notas en el diapasón', quiz: 'fret-note', count: 10 },
    ],
  },
  {
    id: 'gt-pent-pos1', track: 'guitar', module: 'gt2', title: 'Pentatónica menor: posición 1 y frases', level: 1, skills: ['escalas', 'g_blues', 'improvisacion'], concept: 'pentatonicas',
    what: 'La forma de caja de la pentatónica menor desde la 6ª cuerda.',
    why: 'El punto de partida de todo el blues en guitarra.', sound: 'Bends de 4→5 y b7→1 son el sonido del blues eléctrico.',
    how: { guitar: 'Dedos 1 y 4 (o 1 y 3) en cada cuerda. Bend de un tono en la 3ª cuerda (4→5).' },
    songs: ['Blues shuffle en La'], improv: 'Frase de 2 compases + silencio.',
    exercises: [
      { kind: 'scale', step: 'visualizar', title: 'La pentatónica menor', scale: 'pentMinor', key: 'A' },
      { kind: 'phrase', step: 'imitar', title: 'Imita: llamada pentatónica', phrase: 'blues-call', key: 'A' },
      { kind: 'improv', step: 'crear', title: 'Solo sobre shuffle en La', progression: 'blues12', key: 'A', style: 'blues', bpm: 90, minutes: 4, scale: 'pentMinor', prompts: ['Usa bends 4→5.', 'Vibrato en la nota final.', 'Silencios de 2 compases.'] },
    ],
  },
  {
    id: 'gt-blues-scale', track: 'guitar', module: 'gt2', title: 'Escala blues, bends, slides y vibrato', level: 1, skills: ['g_blues', 'improvisacion', 'ritmo'], concept: 'escala-blues',
    what: 'Añadir la b5 y técnicas expresivas.', why: 'Las técnicas convierten notas en frases vocales.', sound: 'Slide hacia la 5ª, bend de cuarto de tono en la b3.',
    how: { guitar: 'Slide del traste 7 al 8 (b5→5) en la 3ª cuerda; vibrato de muñeca.' },
    songs: ['Blues shuffle en La', 'Blue Monk'], improv: 'Cada frase termina con vibrato.',
    exercises: [
      { kind: 'phrase', step: 'imitar', title: 'Imita: bajada por la escala blues', phrase: 'blues-descent', key: 'A' },
      { kind: 'scale', step: 'visualizar', title: 'La blues', scale: 'blues', key: 'A' },
      { kind: 'record', step: 'evaluar', title: 'Graba un chorus de blues', prompt: 'Un chorus de blues en La usando bends, slides y vibrato.', criteria: [...REC_CRITERIA, 'Bends afinados (llegan a la nota)'] },
    ],
  },
  {
    id: 'gt-pent-mix', track: 'guitar', module: 'gt2', title: 'Mezcla de pentatónicas mayor y menor', level: 2, skills: ['g_blues', 'escalas', 'improvisacion'], concept: 'pentatonicas',
    what: 'Pentatónica mayor sobre el I7, menor sobre IV7 y V7 (o mezcladas).', why: 'Es el sonido de B.B. King y del blues "con armonía".', sound: 'Mayor: dulce. Menor: crudo.',
    how: { guitar: 'La mayor pentatónica = F# menor pentatónica (3 trastes abajo).' },
    songs: ['Blues shuffle en La'], improv: 'Cambia de pentatónica cuando cambia el acorde.',
    exercises: [
      { kind: 'compare', step: 'escuchar', title: 'Mayor vs. menor sobre el blues', progression: 'blues12', key: 'A', scales: ['pentMajor', 'pentMinor', 'bluesMajor'], style: 'blues', bpm: 90 },
      { kind: 'phrase', step: 'imitar', title: 'Imita: de b3 a 3', phrase: 'blues-major-minor', key: 'A' },
    ],
  },
  {
    id: 'gt-arpeggios', track: 'guitar', module: 'gt3', title: 'Arpegios y notas objetivo', level: 2, skills: ['acordes', 'improvisacion', 'g_diapason'], concept: 'septimas',
    what: 'Arpegios de 4 notas en una posición y la 3ª de cada acorde como objetivo.', why: 'Para seguir los cambios en lugar de tocar una escala encima.', sound: 'La línea "describe" los acordes.',
    how: { guitar: 'Elige una posición (traste 5–8) y encuentra 1-3-5-7 de cada acorde sin moverte.' },
    songs: ['Autumn Leaves'], improv: 'Sobre I-IV-V: arpegio de cada acorde, cambiando a tiempo.',
    exercises: [
      { kind: 'progression', step: 'visualizar', title: 'Arpegios del blues en La', progression: 'blues12', key: 'A', style: 'blues', bpm: 80, display: 'arpeggios' },
      { kind: 'progression', step: 'aplicar', title: 'Notas guía del ii-V-I', progression: 'iiVI', key: 'G', style: 'swing', bpm: 90, display: 'guide' },
    ],
  },
  {
    id: 'gt-shells', track: 'guitar', module: 'gt4', title: 'Shell voicings (1-3-7)', level: 1, skills: ['acordes', 'g_comping'], concept: 'septimas',
    what: 'Acordes de 3 notas: fundamental, 3ª y 7ª. Desde la 6ª y 5ª cuerda.',
    why: 'Son pequeños, cómodos y suenan a jazz enseguida. Ideales para empezar.', sound: 'Limpios, dejan espacio al solista.',
    how: { guitar: 'Apaga las cuerdas que no se tocan con los dedos libres.' },
    songs: ['Blues en Fa (jazz blues)', 'Autumn Leaves'], improv: '—',
    exercises: [
      { kind: 'chords', step: 'visualizar', title: 'Shells de ii-V-I en Do', symbols: ['Dm7', 'G7', 'Cmaj7'] },
      { kind: 'progression', step: 'aplicar', title: 'Comping en el blues jazzístico', progression: 'jazzBlues', key: 'F', style: 'swing', bpm: 100, display: 'chords' },
      { kind: 'quiz', step: 'evaluar', title: 'Notas de acordes de séptima', quiz: 'chord-notes', count: 6, concept: 'septimas' },
    ],
  },
  {
    id: 'gt-drop', track: 'guitar', module: 'gt4', title: 'Drop 2 y drop 3: cuatro notas', level: 2, skills: ['acordes', 'g_comping'],
    what: 'Acordes completos de 4 notas, base del comping a dos manos de guitarra.',
    why: 'Añaden la 5ª o tensiones; permiten conducción de voces en la cuerda aguda.', sound: 'Más lleno que el shell.',
    how: { guitar: 'Drop 3 desde la 6ª cuerda (3x443x); drop 2 desde la 5ª (x3545x).' },
    songs: ['Satin Doll', 'Misty'], improv: '—',
    exercises: [
      { kind: 'chords', step: 'visualizar', title: 'Cinco calidades en Sol (drop 3)', symbols: ['Gmaj7', 'Gm7', 'G7', 'Gm7b5', 'Gdim7'] },
      { kind: 'chords', step: 'aplicar', title: 'ii-V-I con 9 y 13', symbols: ['Dm7', 'G13', 'Cmaj7', 'Am7', 'D9'] },
    ],
  },
  {
    id: 'gt-comping', track: 'guitar', module: 'gt4', title: 'Ritmos de comping', level: 2, skills: ['g_comping', 'ritmo'], concept: 'swing',
    what: 'Negras estilo Freddie Green, Charleston (1 y el "y" del 2), y anticipaciones.',
    why: 'El ritmo del acompañamiento importa más que la complejidad del acorde.', sound: 'Sigue el ritmo del piano del acompañamiento.',
    how: { guitar: 'Silencia el pianista en el laboratorio y ocupa su lugar con shells.' },
    songs: ['Blues en Fa (jazz blues)', 'Satin Doll'], improv: '—',
    exercises: [
      { kind: 'progression', step: 'aplicar', title: 'Comping sobre blues jazzístico (sin piano)', progression: 'jazzBlues', key: 'F', style: 'swing', bpm: 100, display: 'chords', text: 'Desactiva el piano en el mezclador y acompaña tú.' },
      { kind: 'record', step: 'evaluar', title: 'Graba tu comping', prompt: 'Graba un chorus de comping.', criteria: ['Cambios a tiempo', 'Ritmo constante', 'Acordes limpios (sin cuerdas que zumban)'] },
    ],
  },
  {
    id: 'gt-autumn', track: 'guitar', module: 'gt5', title: 'Autumn Leaves en guitarra', level: 2, skills: ['repertorio', 'g_comping', 'improvisacion'],
    what: 'Forma completa con shells, comping y solo.', why: 'Primer standard completo.', sound: '—',
    how: { guitar: 'Mantente entre los trastes 3 y 8 para toda la forma.' }, songs: ['Autumn Leaves'], improv: 'Sol menor pentatónica + 3ª de D7 (F#).',
    exercises: [{ kind: 'song', step: 'aplicar', title: 'Abrir Autumn Leaves', song: 'autumn-leaves' }],
  },
  {
    id: 'gt-bluebossa', track: 'guitar', module: 'gt5', title: 'Blue Bossa en guitarra', level: 2, skills: ['repertorio', 'g_comping'],
    what: 'Ritmo de bossa y modulación.', why: 'Trabaja ritmo latino y cambio de tonalidad.', sound: '—',
    how: { guitar: 'Pulgar en los bajos, dedos en los acordes sincopados.' }, songs: ['Blue Bossa'], improv: 'Do menor pent. → Re♭ mayor pent.',
    exercises: [{ kind: 'song', step: 'aplicar', title: 'Abrir Blue Bossa', song: 'blue-bossa' }],
  },
  {
    id: 'gt-walk', track: 'guitar', module: 'gt6', title: 'Walking bass + acordes', level: 3, skills: ['g_comping', 'armonia'],
    what: 'Bajo en negras en las cuerdas graves con shells intercalados.', why: 'Permite tocar solo, sin banda.', sound: 'Escucha el bajo del acompañamiento swing: es un modelo.',
    how: { guitar: 'Fundamental (tiempo 1), nota del acorde, nota del acorde, aproximación cromática.' }, songs: ['Blues en Fa (jazz blues)'], improv: '—',
    exercises: [{ kind: 'progression', step: 'escuchar', title: 'Escucha el walking bass', progression: 'jazzBlues', key: 'F', style: 'swing', bpm: 90, display: 'chords', text: 'Silencia piano y batería y escucha solo el bajo.' }],
  },
];

// ======================= PIANO =======================
const PIANO: Lesson[] = [
  {
    id: 'pn-triads', track: 'piano', module: 'pn1', title: 'Tríadas en todas las tonalidades', level: 1, skills: ['acordes', 'p_inversiones'], concept: 'triadas',
    what: 'Construir 1-3-5 mayor y menor desde cualquier tecla.', why: 'Velocidad para encontrar acordes = libertad para acompañar.', sound: '—',
    how: { piano: 'Mano derecha 1-3-5; recorre el círculo de quintas: C G D A E B F# Db Ab Eb Bb F.' },
    songs: ['Blues shuffle en La'], improv: '—',
    exercises: [
      { kind: 'chords', step: 'visualizar', title: 'Tríadas del I-IV-V en Do y Sol', symbols: ['C', 'F', 'G', 'G', 'C', 'D'] },
      { kind: 'quiz', step: 'evaluar', title: '¿Qué tecla es?', quiz: 'key-note', count: 8 },
      { kind: 'quiz', step: 'consolidar', title: 'Tríadas de oído', quiz: 'triad-ear', count: 8, concept: 'triadas' },
    ],
  },
  {
    id: 'pn-inversions', track: 'piano', module: 'pn1', title: 'Inversiones de tríadas y séptimas', level: 1, skills: ['p_inversiones', 'acordes'], concept: 'inversiones',
    what: 'Fundamental, 1ª, 2ª (y 3ª para séptimas).', why: 'Base de la conducción de voces.', sound: 'Mismo acorde, distinta "voz superior".',
    how: { piano: 'Sube por inversiones: Do-Mi-Sol → Mi-Sol-Do → Sol-Do-Mi.' },
    songs: ['Misty'], improv: '—',
    exercises: [
      { kind: 'chords', step: 'visualizar', title: 'Inversiones de Cmaj7 y Am7', symbols: ['Cmaj7', 'Am7'], voicings: ['root', 'inv1', 'inv2', 'inv3'] },
      { kind: 'quiz', step: 'evaluar', title: 'Calidad del acorde de oído', quiz: 'chord-ear', count: 8, concept: 'septimas' },
    ],
  },
  {
    id: 'pn-voiceleading', track: 'piano', module: 'pn2', title: 'Conducción de voces en ii-V-I', level: 1, skills: ['p_voicings', 'armonia'], concept: 'inversiones',
    what: 'Elegir la inversión más cercana: Dm7 → G7 → Cmaj7 moviendo 1–2 notas.', why: 'Sonido profesional y menos esfuerzo.', sound: 'Las voces se mueven por semitono o se mantienen.',
    how: { piano: 'Mantén las notas comunes; mueve las demás a la más cercana.' },
    songs: ['Autumn Leaves', 'Satin Doll'], improv: '—',
    exercises: [
      { kind: 'chords', step: 'visualizar', title: 'ii-V-I conducido en Do y Fa', symbols: ['Dm7', 'G7', 'Cmaj7', 'Gm7', 'C7', 'Fmaj7'], voiceLead: true },
      { kind: 'chords', step: 'aplicar', title: 'Círculo de quintas con dominantes', symbols: ['E7', 'A7', 'D7', 'G7', 'C7', 'F7'], voiceLead: true },
    ],
  },
  {
    id: 'pn-shells', track: 'piano', module: 'pn2', title: 'Shell voicings en la mano izquierda', level: 1, skills: ['p_voicings', 'p_acompanamiento'], concept: 'notas-guia',
    what: '1-3-7 o 1-7-3 en la mano izquierda.', why: 'Dejan la mano derecha libre para la melodía o la improvisación.', sound: 'Base clara, estilo Bud Powell.',
    how: { piano: 'Alterna 1-3-7 y 1-7-3 para que la 3ª y la 7ª se conecten.' },
    songs: ['Blues en Fa (jazz blues)'], improv: 'Mano izquierda shells en 1, derecha frases de blues.',
    exercises: [
      { kind: 'chords', step: 'visualizar', title: 'Shells del blues en Fa', symbols: ['F7', 'Bb7', 'C7', 'Gm7'], voicings: ['shell137', 'shell173'] },
      { kind: 'progression', step: 'aplicar', title: 'Shells sobre blues jazzístico', progression: 'jazzBlues', key: 'F', style: 'swing', bpm: 90, display: 'chords', text: 'Silencia el piano del acompañamiento y toca tú los shells.' },
    ],
  },
  {
    id: 'pn-rootless', track: 'piano', module: 'pn3', title: 'Voicings sin fundamental (A y B)', level: 2, skills: ['p_voicings', 'p_acompanamiento'], concept: 'tensiones',
    what: '3-5-7-9 (A) y 7-9-3-5 (B). El bajista toca la fundamental.', why: 'El sonido del piano de jazz moderno (Bill Evans, Wynton Kelly).', sound: 'Rico y compacto.',
    how: { piano: 'ii-V-I: Dm7 A → G7 B → Cmaj7 A. Solo bajan 1–2 notas.' },
    songs: ['Autumn Leaves', 'Misty'], improv: '—',
    exercises: [
      { kind: 'chords', step: 'visualizar', title: 'Voicings A y B en ii-V-I', symbols: ['Dm7', 'G7', 'Cmaj7'], voicings: ['rootlessA', 'rootlessB'] },
      { kind: 'progression', step: 'escuchar', title: 'Escucha el comping del acompañamiento', progression: 'iiVI', key: 'F', style: 'swing', bpm: 100, display: 'chords' },
    ],
  },
  {
    id: 'pn-blues-comp', track: 'piano', module: 'pn3', title: 'Acompañamiento de blues y coordinación', level: 1, skills: ['p_acompanamiento', 'p_coordinacion', 'ritmo'], concept: 'blues',
    what: 'Mano izquierda: patrón de boogie (1-3-5-6-b7-6-5-3). Derecha: acordes en 2 y 4.', why: 'Coordinación independiente de manos con un patrón muy musical.', sound: 'Escucha el bajo del estilo "blues shuffle".',
    how: { piano: 'Primero la izquierda sola hasta que sea automática; luego añade la derecha en 2 y 4.' },
    songs: ['Blues shuffle en La'], improv: 'Izquierda boogie, derecha frases con la escala blues.',
    exercises: [
      { kind: 'progression', step: 'escuchar', title: 'Shuffle en Do: bajo de boogie', progression: 'blues12', key: 'C', style: 'blues', bpm: 80, display: 'chords' },
      { kind: 'record', step: 'evaluar', title: 'Graba la coordinación', prompt: 'Un chorus de blues con ambas manos.', criteria: ['Mano izquierda constante', 'Acordes en 2 y 4 a tiempo', 'Las manos no se "arrastran" entre sí'] },
    ],
  },
  {
    id: 'pn-rh-improv', track: 'piano', module: 'pn4', title: 'Improvisación con la mano derecha', level: 2, skills: ['improvisacion', 'p_coordinacion'], concept: 'notas-guia',
    what: 'Izquierda shells en el tiempo 1; derecha frases con notas guía como destino.', why: 'Integra armonía y melodía.', sound: '—',
    how: { piano: 'Mano izquierda muy simple; toda la atención en la derecha.' },
    songs: ['Autumn Leaves'], improv: 'Frases de 2 compases que terminen en la 3ª del acorde siguiente.',
    exercises: [
      { kind: 'phrase', step: 'imitar', title: 'Imita: aproximaciones cromáticas', phrase: 'iiVI-chromatic' },
      { kind: 'improv', step: 'crear', title: 'ii-V-I mano derecha', progression: 'iiVIshort', key: 'F', style: 'swing', bpm: 100, minutes: 4, prompts: ['Izquierda: shells.', 'Derecha: llega a la 3ª en el tiempo 1.'] },
    ],
  },
  {
    id: 'pn-autumn', track: 'piano', module: 'pn5', title: 'Autumn Leaves en piano', level: 2, skills: ['repertorio', 'p_voicings', 'p_acompanamiento'],
    what: 'Progresión, voicings A/B, acompañamiento con la izquierda e improvisación con la derecha.', why: 'Primer standard completo a dos manos.', sound: '—',
    how: { piano: 'Mano izquierda: voicings A/B alternados entre Do3 y Do4.' }, songs: ['Autumn Leaves'], improv: 'Derecha en Sol menor; F# sobre D7.',
    exercises: [{ kind: 'song', step: 'aplicar', title: 'Abrir Autumn Leaves', song: 'autumn-leaves' }],
  },
  {
    id: 'pn-misty', track: 'piano', module: 'pn5', title: 'Misty: voicings de balada', level: 3, skills: ['repertorio', 'p_voicings'],
    what: 'Voicings abiertos a dos manos para una balada.', why: 'Sonido amplio y expresivo.', sound: '—',
    how: { piano: 'Izquierda 1-7, derecha 3-5-9.' }, songs: ['Misty'], improv: 'Fills cortos entre frases.',
    exercises: [{ kind: 'song', step: 'aplicar', title: 'Abrir Misty', song: 'misty' }],
  },
  {
    id: 'pn-intros', track: 'piano', module: 'pn6', title: 'Introducciones y finales', level: 3, skills: ['p_acompanamiento', 'armonia'],
    what: 'Intro con I-vi-ii-V (o iii-VI-ii-V); final con turnaround repetido.', why: 'Para tocar temas completos de forma autónoma.', sound: '—',
    how: { piano: 'Usa voicings conducidos sobre el turnaround.' }, songs: ['Satin Doll'], improv: '—',
    exercises: [{ kind: 'chords', step: 'aplicar', title: 'Turnaround para intro', symbols: ['Cmaj7', 'A7', 'Dm7', 'G7', 'Em7', 'A7', 'Dm7', 'G7'], voiceLead: true }],
  },
];

export const LESSONS: Lesson[] = [...SHARED, ...SAX, ...GUITAR, ...PIANO];
export const lessonById = (id: string) => LESSONS.find((l) => l.id === id);
export const modulesFor = (track: Lesson['track']) => MODULES.filter((m) => m.track === track);
export const lessonsInModule = (moduleId: string) => LESSONS.filter((l) => l.module === moduleId);

// Diagnóstico por instrumento: cuestionario + pruebas. Las pruebas de ejecución son AUTOEVALUADAS
// (con audio de referencia); las de teoría/oído son ejercicios con respuesta verificable.
import { SkillId } from '../progress/store';
import { InstrumentId } from '../theory/instruments';
import { QuizKind } from './types';

export interface Question {
  id: keyof import('../progress/store').DiagnosticAnswers;
  label: string;
  options?: string[];
  multi?: boolean;
  free?: boolean;
}

export const QUESTIONS: Question[] = [
  { id: 'experience', label: '¿Cuánto tiempo llevas tocando este instrumento?', options: ['Menos de 1 año', '1–3 años', '3–10 años', 'Más de 10 años'] },
  { id: 'styles', label: 'Estilos preferidos', options: ['Blues', 'Jazz tradicional / swing', 'Standards', 'Baladas', 'Bebop', 'Bossa / latino', 'Rock / pop'], multi: true },
  { id: 'reading', label: '¿Lees partitura?', options: ['No', 'Lento, nota a nota', 'Con fluidez', 'A primera vista'] },
  { id: 'improvExperience', label: 'Experiencia improvisando', options: ['Nunca', 'Algo de pentatónica / blues', 'Improviso sobre algunos temas', 'Improviso sobre standards con cambios'] },
  { id: 'harmony', label: 'Conocimientos de armonía', options: ['Básicos (escalas mayores)', 'Acordes y funciones', 'ii-V-I y notas guía', 'Avanzados (sustituciones, modos)'] },
  { id: 'goals', label: 'Tu objetivo personal con este instrumento', free: true },
  { id: 'minutesPerDay', label: 'Minutos de práctica disponibles al día', options: ['10', '20', '30', '45'] },
];

/** Traduce respuestas del cuestionario a evidencias de autoevaluación (0–100). */
export function selfAssessmentEvidence(answers: Record<string, string | string[]>, instrument: InstrumentId): { skill: SkillId; value: number }[] {
  const idx = (q: string) => {
    const opts = QUESTIONS.find((x) => x.id === q)?.options ?? [];
    const i = opts.indexOf(answers[q] as string);
    return i < 0 ? 0 : i;
  };
  const scale = (i: number) => [20, 45, 65, 85][i] ?? 20;
  const exp = scale(idx('experience'));
  const impro = scale(idx('improvExperience'));
  const harm = scale(idx('harmony'));
  const out: { skill: SkillId; value: number }[] = [
    { skill: 'improvisacion', value: impro },
    { skill: 'armonia', value: harm },
    { skill: 'escalas', value: Math.round((harm + exp) / 2) },
    { skill: 'acordes', value: harm },
  ];
  if (instrument === 'sax') out.push({ skill: 's_fraseo', value: Math.round((exp + impro) / 2) }, { skill: 's_articulacion', value: exp });
  if (instrument === 'guitar') out.push({ skill: 'g_diapason', value: exp }, { skill: 'g_blues', value: impro });
  if (instrument === 'piano') out.push({ skill: 'p_coordinacion', value: exp }, { skill: 'p_inversiones', value: harm });
  return out;
}

export interface DiagnosticTest {
  id: string;
  title: string;
  instruction: string;
  skills: SkillId[];
  /** quiz con respuesta verificable o prueba práctica autoevaluada */
  type: { quiz: QuizKind; count: number } | { practical: 'phrase'; phrase: string } | { practical: 'chords'; symbols: string[] } | { practical: 'improv'; progression: string; key: string; style: 'swing' | 'blues' } | { practical: 'scale'; scale: string; key: string };
}

export const TESTS: Record<InstrumentId, DiagnosticTest[]> = {
  sax: [
    { id: 'sx-imit', title: 'Imitar una frase', instruction: 'Escucha la frase (puedes repetirla) y tócala. Si quieres, activa la detección de notas para comprobar las alturas.', skills: ['oido', 's_fraseo'], type: { practical: 'phrase', phrase: 'blues-call' } },
    { id: 'sx-guide', title: 'Identificar notas guía', instruction: 'Responde: ¿cuáles son la 3ª y la 7ª de cada acorde?', skills: ['armonia', 's_resolucion'], type: { quiz: 'guide-tone', count: 5 } },
    { id: 'sx-arp', title: 'Ejecutar arpegios', instruction: 'Toca los arpegios de Cm7–F7–Bbmaj7 (concierto) que muestra la notación transpuesta para tu saxo.', skills: ['acordes', 's_articulacion'], type: { practical: 'chords', symbols: ['Cm7', 'F7', 'Bbmaj7'] } },
    { id: 'sx-blues', title: 'Improvisar sobre un blues', instruction: 'Improvisa 2 choruses sobre el blues en Fa.', skills: ['improvisacion', 'ritmo'], type: { practical: 'improv', progression: 'blues12', key: 'F', style: 'swing' } },
    { id: 'sx-iivi', title: 'Resolver un ii-V-I', instruction: 'Responde cuál es la escala adecuada en cada contexto.', skills: ['armonia', 'escalas'], type: { quiz: 'scale-for-chord', count: 4 } },
    { id: 'sx-ear', title: 'Oído: calidades de acorde', instruction: 'Escucha y reconoce el tipo de acorde.', skills: ['oido'], type: { quiz: 'chord-ear', count: 5 } },
  ],
  guitar: [
    { id: 'gt-chords', title: 'Reconocer y tocar acordes', instruction: 'Toca estos acordes con las digitaciones que conozcas; compara con el audio.', skills: ['acordes'], type: { practical: 'chords', symbols: ['A7', 'Dm7', 'Gmaj7', 'Bm7b5'] } },
    { id: 'gt-frets', title: 'Ubicar notas en el diapasón', instruction: '¿Qué nota es?', skills: ['g_diapason'], type: { quiz: 'fret-note', count: 6 } },
    { id: 'gt-pent', title: 'Ejecutar pentatónicas', instruction: 'Toca La pentatónica menor en al menos una posición, a 80 bpm.', skills: ['escalas', 'g_blues'], type: { practical: 'scale', scale: 'pentMinor', key: 'A' } },
    { id: 'gt-blues', title: 'Improvisar sobre un blues', instruction: 'Improvisa 2 choruses sobre el shuffle en La.', skills: ['improvisacion', 'g_blues'], type: { practical: 'improv', progression: 'blues12', key: 'A', style: 'blues' } },
    { id: 'gt-sevenths', title: 'Construir acordes de séptima', instruction: '¿Qué notas forman cada acorde?', skills: ['acordes', 'armonia'], type: { quiz: 'chord-notes', count: 5 } },
    { id: 'gt-scales', title: 'Relacionar escalas con acordes', instruction: 'Elige la escala adecuada.', skills: ['armonia', 'escalas'], type: { quiz: 'scale-for-chord', count: 4 } },
  ],
  piano: [
    { id: 'pn-build', title: 'Construir tríadas y séptimas', instruction: '¿Qué notas forman cada acorde?', skills: ['acordes'], type: { quiz: 'chord-notes', count: 5 } },
    { id: 'pn-inv', title: 'Ejecutar inversiones', instruction: 'Toca Cmaj7 y Am7 en las 4 posiciones que muestra el teclado.', skills: ['p_inversiones'], type: { practical: 'chords', symbols: ['Cmaj7', 'Am7'] } },
    { id: 'pn-prog', title: 'Identificar progresiones', instruction: 'Escucha y reconoce la progresión.', skills: ['oido', 'armonia'], type: { quiz: 'progression-ear', count: 4 } },
    { id: 'pn-vl', title: 'Conectar acordes con conducción de voces', instruction: 'Toca Dm7–G7–Cmaj7 moviendo lo mínimo (compara con la conducción mostrada).', skills: ['p_voicings'], type: { practical: 'chords', symbols: ['Dm7', 'G7', 'Cmaj7'] } },
    { id: 'pn-comp', title: 'Acompañar una progresión sencilla', instruction: 'Acompaña un blues en Do (silencia el piano del acompañamiento).', skills: ['p_acompanamiento', 'p_coordinacion'], type: { practical: 'improv', progression: 'blues12', key: 'C', style: 'blues' } },
    { id: 'pn-ear', title: 'Oído: calidades de acorde', instruction: 'Escucha y reconoce el tipo de acorde.', skills: ['oido'], type: { quiz: 'chord-ear', count: 5 } },
  ],
};

export const PRACTICAL_SCALE = [
  { value: 20, label: 'No pude hacerlo' },
  { value: 45, label: 'Con mucha dificultad' },
  { value: 70, label: 'Bien, con algunos errores' },
  { value: 90, label: 'Con soltura' },
];

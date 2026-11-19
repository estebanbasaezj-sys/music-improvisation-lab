// Profesor virtual: genera la sesión de "Mi práctica de hoy" a partir del nivel, las lecciones
// pendientes, los repasos espaciados y las habilidades más débiles del instrumento.
import { InstrumentProgress, SkillId, dueLessons, mastery, skillLevel, skillsFor } from '../progress/store';
import { InstrumentId } from '../theory/instruments';
import { LESSONS, MODULES, lessonById } from './lessons';
import { Exercise, Lesson, QuizKind } from './types';

export interface Block {
  id: string;
  title: string;
  minutes: number;
  why: string;
  exercise: Exercise;
  lessonId?: string;
  skills: SkillId[];
}

/** Orden de la ruta: teoría compartida intercalada con la ruta del instrumento por fase y nivel. */
export function routeFor(instrument: InstrumentId): Lesson[] {
  const order = (l: Lesson) => {
    const m = MODULES.find((x) => x.id === l.module)!;
    return m.phase * 100 + l.level * 10 + (l.track === 'shared' ? 0 : 1);
  };
  return LESSONS.filter((l) => l.track === instrument || l.track === 'shared').sort((a, b) => order(a) - order(b));
}

export function weakestSkills(p: InstrumentProgress, instrument: InstrumentId): SkillId[] {
  return skillsFor(instrument)
    .map((s) => ({ s, v: skillLevel(p.skills[s]) ?? 50 }))
    .sort((a, b) => a.v - b.v)
    .map((x) => x.s);
}

export function currentLesson(p: InstrumentProgress, instrument: InstrumentId): Lesson {
  const route = routeFor(instrument).filter((l) => l.track === instrument);
  for (const l of route) {
    const m = mastery(p.lessons[l.id]);
    const known = l.skills.map((s) => skillLevel(p.skills[s])).filter((x): x is number => x !== null);
    const strong = known.length === l.skills.length && known.every((v) => v >= 85);
    if (m.value < 0.8 && !strong) return l;
  }
  return route[route.length - 1];
}

const EAR_FOR: Record<InstrumentId, QuizKind[]> = {
  sax: ['guide-tone', 'chord-ear', 'sax-transpose', 'interval-ear'],
  guitar: ['fret-note', 'chord-ear', 'chord-notes', 'interval-ear'],
  piano: ['chord-ear', 'progression-ear', 'chord-notes', 'key-note'],
};

function earQuiz(instrument: InstrumentId, weak: SkillId[]): QuizKind {
  const w = weak[0];
  if (w === 'g_diapason' && instrument === 'guitar') return 'fret-note';
  if (w === 'oido') return instrument === 'piano' ? 'progression-ear' : 'chord-ear';
  if (w === 'armonia' || w === 's_resolucion') return 'guide-tone';
  if (w === 'acordes' || w === 'p_inversiones') return 'chord-notes';
  if (w === 'escalas') return 'scale-notes';
  const day = new Date().getDate();
  return EAR_FOR[instrument][day % EAR_FOR[instrument].length];
}

const WARMUP: Record<InstrumentId, Exercise[]> = {
  sax: [
    { kind: 'phrase', step: 'imitar', title: 'Imitación de frase', phrase: 'blues-call' },
    { kind: 'phrase', step: 'imitar', title: 'Imitación de frase', phrase: 'iiVI-arp' },
    { kind: 'phrase', step: 'imitar', title: 'Imitación de frase', phrase: 'blues-major-minor' },
  ],
  guitar: [
    { kind: 'scale', step: 'visualizar', title: 'Pentatónica y frase de blues', scale: 'pentMinor', key: 'A' },
    { kind: 'phrase', step: 'imitar', title: 'Frase de blues', phrase: 'blues-descent', key: 'A' },
    { kind: 'scale', step: 'visualizar', title: 'Escala blues', scale: 'blues', key: 'E' },
  ],
  piano: [
    { kind: 'chords', step: 'visualizar', title: 'Inversiones', symbols: ['Cmaj7', 'Fmaj7'], voicings: ['root', 'inv1', 'inv2', 'inv3'] },
    { kind: 'chords', step: 'visualizar', title: 'Inversiones de tríadas', symbols: ['C', 'F', 'G'], voicings: ['root', 'inv1', 'inv2'] },
    { kind: 'chords', step: 'visualizar', title: 'Inversiones en menor', symbols: ['Am7', 'Dm7'], voicings: ['root', 'inv1', 'inv2', 'inv3'] },
  ],
};

const DEFAULT_IMPROV: Record<InstrumentId, Exercise> = {
  sax: { kind: 'improv', step: 'crear', title: 'Improvisación sobre acompañamiento', progression: 'blues12', key: 'F', style: 'swing', bpm: 110, minutes: 5, prompts: ['Pregunta-respuesta.', 'Termina frases en notas del acorde.'] },
  guitar: { kind: 'improv', step: 'crear', title: 'Improvisación sobre blues de 12 compases', progression: 'blues12', key: 'A', style: 'blues', bpm: 90, minutes: 5, scale: 'pentMinor', prompts: ['Bends y vibrato.', 'Deja silencios.'] },
  piano: { kind: 'improv', step: 'crear', title: 'Improvisación con mano derecha', progression: 'blues12', key: 'C', style: 'swing', bpm: 100, minutes: 5, scale: 'blues', prompts: ['Izquierda shells en el tiempo 1.', 'Derecha frases cortas.'] },
};

const COMP_BLOCK: Record<InstrumentId, Exercise> = {
  sax: { kind: 'phrase', step: 'imitar', title: 'Aproximaciones cromáticas', phrase: 'iiVI-chromatic' },
  guitar: { kind: 'progression', step: 'aplicar', title: 'Acordes de séptima y acompañamiento', progression: 'jazzBlues', key: 'F', style: 'swing', bpm: 100, display: 'chords', text: 'Silencia el piano y acompaña con shells.' },
  piano: { kind: 'progression', step: 'aplicar', title: 'Acompañamiento jazz', progression: 'iiVI', key: 'F', style: 'swing', bpm: 100, display: 'chords', text: 'Silencia el piano y acompaña tú con voicings A/B.' },
};

const pickExercise = (l: Lesson, steps: Exercise['step'][], kinds?: Exercise['kind'][]) =>
  l.exercises.find((e) => steps.includes(e.step) && (!kinds || kinds.includes(e.kind)));

export function generateSession(instrument: InstrumentId, minutes: 10 | 20 | 30 | 45, p: InstrumentProgress, seed = new Date().getDate(), vocabDue = 0): Block[] {
  const weak = weakestSkills(p, instrument);
  const lesson = currentLesson(p, instrument);
  const due = dueLessons(p).map(lessonById).filter((l): l is Lesson => !!l && (l.track === instrument || l.track === 'shared'));
  const blocks: Block[] = [];
  const add = (b: Omit<Block, 'id'>) => blocks.push({ ...b, id: `${blocks.length}-${b.title}` });

  const plan: Record<number, { warm: number; review: number; focus: number; ear: number; extra: number; improv: number; evalm: number }> = {
    10: { warm: 2, review: 0, focus: 3, ear: 0, extra: 0, improv: 4, evalm: 1 },
    20: { warm: 3, review: 0, focus: 5, ear: 0, extra: 5, improv: 5, evalm: 2 },
    30: { warm: 3, review: 5, focus: 6, ear: 4, extra: 5, improv: 5, evalm: 2 },
    45: { warm: 4, review: 7, focus: 10, ear: 5, extra: 6, improv: 10, evalm: 3 },
  };
  const t = { ...plan[minutes] };
  // sin repasos pendientes, esos minutos van al foco
  if (!due.length) { t.focus += t.review; t.review = 0; }

  const warm = WARMUP[instrument][seed % WARMUP[instrument].length];
  add({ title: `Calentamiento: ${warm.title.toLowerCase()}`, minutes: t.warm, why: 'Empezamos escuchando e imitando: activa el oído antes que los dedos.', exercise: warm, skills: ['oido', 'escalas'] });

  if (t.review && due.length) {
    const r = due[0];
    const ex = pickExercise(r, ['aplicar', 'imitar', 'evaluar', 'consolidar', 'visualizar']) ?? r.exercises[0];
    add({ title: `Repaso: ${r.title}`, minutes: t.review, why: 'Repetición espaciada: esta lección tocaba repaso hoy. Repasar justo antes de olvidar consolida la memoria.', exercise: ex, lessonId: r.id, skills: r.skills });
  }

  const focusEx = pickExercise(lesson, ['imitar', 'visualizar', 'aplicar', 'comprender', 'escuchar']) ?? lesson.exercises[0];
  add({ title: `Foco: ${lesson.title}`, minutes: t.focus, why: `${lesson.what} ${lesson.why}`, exercise: focusEx, lessonId: lesson.id, skills: lesson.skills });

  if (t.extra) add({ title: COMP_BLOCK[instrument].title, minutes: t.extra, why: 'Aplicación de la armonía en tu instrumento.', exercise: COMP_BLOCK[instrument], skills: instrument === 'sax' ? ['s_vocabulario'] : instrument === 'guitar' ? ['g_comping'] : ['p_acompanamiento'] });

  const quiz = earQuiz(instrument, weak);
  const earMinutes = t.ear;
  if (earMinutes) add({ title: 'Oído y armonía', minutes: earMinutes, why: `Tu habilidad con menos evidencia o nivel más bajo ahora mismo: refuerzo con un ejercicio de respuesta verificable.`, exercise: { kind: 'quiz', step: 'evaluar', title: 'Ejercicio', quiz, count: 6 }, skills: weak.slice(0, 1) });

  let improvMin = t.improv;
  if (vocabDue > 0 && minutes >= 20) {
    const vm = minutes >= 30 ? 4 : 3;
    improvMin -= vm;
    add({ title: 'Repaso de tu vocabulario', minutes: vm, why: 'Una frase que guardaste toca repaso hoy: llévala a otra tonalidad. Así el lenguaje pasa de imitar a ser tuyo.', exercise: { kind: 'vocab', step: 'consolidar', title: 'Vocabulario en 12 tonalidades' }, skills: ['s_vocabulario', 'improvisacion'].filter((x) => instrument === 'sax' || x !== 's_vocabulario') as SkillId[] });
  }
  const improvEx = pickExercise(lesson, ['crear'], ['improv']) ?? DEFAULT_IMPROV[instrument];
  add({ title: 'Taller de improvisación', minutes: improvMin, why: 'Escucha un solo de ejemplo explicado sobre la progresión, repite sus frases después de la base, transforma una y luego improvisa tú con un reto concreto (una idea por chorus).', exercise: improvEx, lessonId: lesson.id, skills: ['improvisacion'] });

  add({ title: 'Grabación y autoevaluación', minutes: t.evalm, why: 'Escucharte desde fuera es la forma más honesta de evaluar. Valora con los criterios; la app no inventa puntuaciones.', exercise: { kind: 'record', step: 'evaluar', title: 'Grábate', prompt: 'Graba 1 minuto de improvisación sobre el acompañamiento de hoy.', criteria: ['Las notas encajan con los acordes', 'El tempo es estable', 'Frases con principio y final', 'Hay espacio'] }, skills: ['improvisacion'] });

  return blocks;
}

// Registro de progreso. Cada instrumento tiene su propia matriz de habilidades y estado de lecciones;
// los conceptos teóricos compartidos se guardan aparte. El almacenamiento es un adaptador
// (localStorage hoy) para poder sustituirlo por uno en la nube sin tocar la lógica.
import { useSyncExternalStore } from 'react';
import { InstrumentId, SaxType } from '../theory/instruments';

/** Capas del mezclador global: qué instrumentos suenan en cualquier acompañamiento. */
export interface Layers { drums: boolean; bass: boolean; piano: boolean; guitar: boolean; melody: boolean; click: boolean }
export const DEFAULT_LAYERS: Layers = { drums: true, bass: true, piano: true, guitar: false, melody: true, click: false };

export type SkillId =
  | 'oido' | 'ritmo' | 'armonia' | 'escalas' | 'acordes' | 'improvisacion' | 'repertorio'
  | 's_fraseo' | 's_articulacion' | 's_vocabulario' | 's_resolucion'
  | 'g_diapason' | 'g_comping' | 'g_blues'
  | 'p_inversiones' | 'p_voicings' | 'p_coordinacion' | 'p_acompanamiento';

export const SKILL_LABEL: Record<SkillId, string> = {
  oido: 'Oído', ritmo: 'Ritmo', armonia: 'Armonía', escalas: 'Escalas y modos', acordes: 'Construcción de acordes',
  improvisacion: 'Improvisación', repertorio: 'Repertorio',
  s_fraseo: 'Fraseo', s_articulacion: 'Articulación', s_vocabulario: 'Vocabulario jazz', s_resolucion: 'Resolución armónica',
  g_diapason: 'Diapasón', g_comping: 'Comping', g_blues: 'Blues',
  p_inversiones: 'Inversiones', p_voicings: 'Voicings', p_coordinacion: 'Coordinación de manos', p_acompanamiento: 'Acompañamiento',
};

export const COMMON_SKILLS: SkillId[] = ['oido', 'ritmo', 'armonia', 'escalas', 'acordes', 'improvisacion', 'repertorio'];
export const SPECIFIC_SKILLS: Record<InstrumentId, SkillId[]> = {
  sax: ['s_fraseo', 's_articulacion', 's_vocabulario', 's_resolucion'],
  guitar: ['g_diapason', 'g_comping', 'g_blues'],
  piano: ['p_inversiones', 'p_voicings', 'p_coordinacion', 'p_acompanamiento'],
};
export const skillsFor = (i: InstrumentId) => [...COMMON_SKILLS, ...SPECIFIC_SKILLS[i]];

export type EvidenceSource = 'autoevaluacion' | 'prueba' | 'quiz' | 'deteccion' | 'valoracion';
export const SOURCE_LABEL: Record<EvidenceSource, string> = {
  autoevaluacion: 'Autoevaluación', prueba: 'Prueba práctica (autoevaluada)', quiz: 'Ejercicio con respuesta correcta', deteccion: 'Detección de notas por micrófono', valoracion: 'Valoración de lección',
};
export interface Evidence {
  date: string;
  source: EvidenceSource;
  value: number; // 0..100
  note?: string;
}

export type Rating = 'facil' | 'adecuado' | 'dificil';
export interface LessonState {
  status: 'nuevo' | 'en_curso' | 'completada';
  completedAt?: string;
  ratings: { date: string; rating: Rating }[];
  quizScores: { date: string; score: number }[];
  srs?: { intervalDays: number; due: string };
}

export interface DiagnosticAnswers {
  experience: string;
  styles: string[];
  reading: string;
  improvExperience: string;
  harmony: string;
  goals: string;
  minutesPerDay: number;
  completedAt?: string;
}

export interface InstrumentProgress {
  diagnostic?: DiagnosticAnswers;
  skills: Partial<Record<SkillId, Evidence[]>>;
  lessons: Record<string, LessonState>;
  sessions: { date: string; minutes: number; blocks: { title: string; rating?: Rating; done: boolean }[] }[];
  practiceMinutes: Record<string, number>; // fecha → minutos
}

export type AgeProfile = 'nino' | 'adolescente' | 'adulto';
export type Plan = 'free' | 'pro';
export interface Settings {
  saxType: SaxType;
  noteNames: 'letras' | 'solfeo';
  defaultBpm: number;
  /** quién practica: adapta menú, tamaño y metas */
  profile: AgeProfile | null;
  /** menú y pantallas reducidas (null = según el perfil) */
  simple: boolean | null;
  /** plan de licencia (sin cobro todavía: «pro» mientras se desarrolla; Administración permite previsualizar «free») */
  plan: Plan;
}

export interface AppState {
  version: 1;
  instrument: InstrumentId;
  settings: Settings;
  progress: Record<InstrumentId, InstrumentProgress>;
  shared: { concepts: Record<string, { quizScores: { date: string; score: number }[] }> };
  resources: { verified: Record<string, string>; custom: { id: string; title: string; url: string; instrument: InstrumentId | 'all'; concept: string }[] };
  vocab: VocabItem[];
  game: GameState;
  path: Record<InstrumentId, PathState>;
  sound: { keys: 'piano' | 'rhodes'; layers: Layers; volumes: { melody: number; comp: number; bass: number; drums: number } };
  /** usos por mes (AAAA-MM) de funciones con límite en el plan gratuito */
  usage: Record<string, Record<string, number>>;
  /** ejercicios del explorador de cadencias ya probados («cadencia:ejercicio» → fecha) */
  explorer: Record<string, string>;
}

export interface GameState {
  xp: number;
  xpByDay: Record<string, number>;
  dailyGoal: number;
  streak: { count: number; lastDay: string | null; freezes: number; best: number };
  achievements: string[];
  micOk: boolean; // el alumno prefiere ejercicios con micrófono
  lessonsByDay: Record<string, number>;
  perfectByDay: Record<string, number>;
  /** día en que se abrió el cofre de las misiones diarias */
  chestDay: string | null;
}
export interface NodeState { stars: number; timesDone: number; bestAcc: number; completedAt: string; byTest?: boolean }
export interface PathState {
  level: number | null; // nivel asignado por la prueba (null = sin prueba)
  placementAt?: string;
  nodes: Record<string, NodeState>;
  mistakes: { key: string; spec: string; count: number; last: string }[];
}

/** Frase guardada en "Mi vocabulario" (transportable a las 12 tonalidades). */
export interface VocabItem {
  id: string;
  title: string;
  source: string; // de dónde salió (idea, lección, IA)
  key: string; // tonalidad original (concierto)
  chart: string; // armonía de la frase
  notes: { midi: number; start: number; dur: number; tech?: string }[];
  createdAt: string;
  instrument: InstrumentId;
  keysPracticed: string[];
  ratings: { date: string; rating: Rating }[];
  srs?: { intervalDays: number; due: string };
}

const emptyPath = (): PathState => ({ level: null, nodes: {}, mistakes: [] });
const emptyProgress = (): InstrumentProgress => ({ skills: {}, lessons: {}, sessions: [], practiceMinutes: {} });

export const initialState = (): AppState => ({
  version: 1,
  instrument: 'sax',
  settings: { saxType: 'tenor', noteNames: 'letras', defaultBpm: 100, profile: null, simple: null, plan: 'pro' },
  progress: { sax: emptyProgress(), guitar: emptyProgress(), piano: emptyProgress() },
  shared: { concepts: {} },
  resources: { verified: {}, custom: [] },
  vocab: [],
  game: { xp: 0, xpByDay: {}, dailyGoal: 20, streak: { count: 0, lastDay: null, freezes: 1, best: 0 }, achievements: [], micOk: true, lessonsByDay: {}, perfectByDay: {}, chestDay: null },
  usage: {},
  explorer: {},
  path: { sax: emptyPath(), guitar: emptyPath(), piano: emptyPath() },
  sound: { keys: 'piano', layers: { ...DEFAULT_LAYERS }, volumes: { melody: 0, comp: -5, bass: -2, drums: -6 } },
});

// ---------- adaptador de almacenamiento ----------
export interface StorageAdapter {
  load(): AppState | null;
  save(s: AppState): void;
}
const KEY = 'music-improvisation-lab.v1';
export const localAdapter: StorageAdapter = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as AppState) : null;
    } catch {
      return null;
    }
  },
  save(s) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* almacenamiento lleno o bloqueado */
    }
  },
};

// leer `localStorage` puede lanzar un error (navegadores dentro de otras apps o con cookies bloqueadas):
// antes eso dejaba la página en blanco; ahora la app funciona igual, solo que sin guardar el progreso
const storageOk = (() => { try { return typeof localStorage !== 'undefined' && !!localStorage; } catch { return false; } })();
let adapter: StorageAdapter = storageOk ? localAdapter : { load: () => null, save: () => {} };
let state: AppState = merge(adapter.load());
const listeners = new Set<() => void>();

function merge(loaded: AppState | null): AppState {
  const base = initialState();
  if (!loaded) return base;
  return {
    ...base,
    ...loaded,
    settings: { ...base.settings, ...loaded.settings },
    progress: {
      sax: { ...emptyProgress(), ...loaded.progress?.sax },
      guitar: { ...emptyProgress(), ...loaded.progress?.guitar },
      piano: { ...emptyProgress(), ...loaded.progress?.piano },
    },
    shared: { concepts: { ...loaded.shared?.concepts } },
    resources: { verified: { ...loaded.resources?.verified }, custom: [...(loaded.resources?.custom ?? [])] },
    vocab: [...(loaded.vocab ?? [])],
    game: { ...base.game, ...loaded.game, streak: { ...base.game.streak, ...loaded.game?.streak }, lessonsByDay: { ...loaded.game?.lessonsByDay }, perfectByDay: { ...loaded.game?.perfectByDay } },
    usage: { ...loaded.usage },
    explorer: { ...loaded.explorer },
    path: {
      sax: { ...emptyPath(), ...loaded.path?.sax },
      guitar: { ...emptyPath(), ...loaded.path?.guitar },
      piano: { ...emptyPath(), ...loaded.path?.piano },
    },
    sound: migrateSound(base.sound, loaded.sound),
  };
}

/** Versiones antiguas guardaban un único acompañante (`comp`); ahora cada capa se activa por separado. */
function migrateSound(base: AppState['sound'], loaded?: Partial<AppState['sound']> & { comp?: string }): AppState['sound'] {
  const out: AppState['sound'] = { ...base, ...loaded, layers: { ...base.layers, ...loaded?.layers }, volumes: { ...base.volumes, ...loaded?.volumes } };
  if (loaded?.comp && !loaded.layers) {
    if (loaded.comp === 'guitar') { out.layers.guitar = true; out.layers.piano = false; }
    if (loaded.comp === 'rhodes') out.keys = 'rhodes';
  }
  delete (out as { comp?: string }).comp;
  return out;
}

export function setAdapter(a: StorageAdapter) {
  adapter = a;
  state = merge(a.load());
  listeners.forEach((l) => l());
}

export function getState() {
  return state;
}
export function update(fn: (s: AppState) => void) {
  const next: AppState = structuredClone(state);
  fn(next);
  state = next;
  adapter.save(state);
  listeners.forEach((l) => l());
}
export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}
export function replaceState(s: AppState) {
  state = merge(s);
  adapter.save(state);
  listeners.forEach((l) => l());
}

// ---------- lógica de progreso ----------
/** Fecha local AAAA-MM-DD (la racha cambia a medianoche de tu zona horaria, como en Duolingo). */
export const localDay = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
export const today = () => localDay(new Date());
export const addDays = (d: string, n: number) => {
  const dt = new Date(d + 'T12:00:00');
  dt.setDate(dt.getDate() + n);
  return localDay(dt);
};

const WEIGHT: Record<EvidenceSource, number> = { autoevaluacion: 1, prueba: 1.5, quiz: 2, deteccion: 2, valoracion: 1 };

/** Nivel 0–100 de una habilidad: promedio ponderado de evidencias recientes (las últimas 8). null = sin datos. */
export function skillLevel(ev: Evidence[] | undefined): number | null {
  if (!ev || ev.length === 0) return null;
  const recent = ev.slice(-8);
  let s = 0;
  let w = 0;
  recent.forEach((e, i) => {
    const wt = WEIGHT[e.source] * (0.6 + (0.4 * (i + 1)) / recent.length);
    s += e.value * wt;
    w += wt;
  });
  return Math.round(s / w);
}

export function addEvidence(instrument: InstrumentId, skill: SkillId, e: Omit<Evidence, 'date'>) {
  update((s) => {
    const p = s.progress[instrument];
    (p.skills[skill] ??= []).push({ ...e, date: today() });
  });
}

const RATING_VALUE: Record<Rating, number> = { facil: 90, adecuado: 65, dificil: 30 };

/** Repetición espaciada: difícil → mañana; adecuado → intervalo×2; fácil → intervalo×3. */
export function nextSrs(prev: LessonState['srs'], rating: Rating, from = today()) {
  const base = prev?.intervalDays ?? 1;
  const intervalDays = rating === 'dificil' ? 1 : rating === 'adecuado' ? Math.max(2, base * 2) : Math.max(4, base * 3);
  return { intervalDays, due: addDays(from, intervalDays) };
}

export function rateLesson(instrument: InstrumentId, lessonId: string, rating: Rating, skills: SkillId[]) {
  update((s) => {
    const p = s.progress[instrument];
    const l = (p.lessons[lessonId] ??= { status: 'en_curso', ratings: [], quizScores: [] });
    l.ratings.push({ date: today(), rating });
    l.srs = nextSrs(l.srs, rating);
    if (l.status === 'nuevo') l.status = 'en_curso';
    for (const sk of skills) (p.skills[sk] ??= []).push({ date: today(), source: 'valoracion', value: RATING_VALUE[rating], note: lessonId });
  });
}

export function recordQuiz(instrument: InstrumentId, lessonId: string | null, conceptId: string | null, score: number, skills: SkillId[]) {
  update((s) => {
    const p = s.progress[instrument];
    if (lessonId) {
      const l = (p.lessons[lessonId] ??= { status: 'en_curso', ratings: [], quizScores: [] });
      l.quizScores.push({ date: today(), score });
    }
    if (conceptId) (s.shared.concepts[conceptId] ??= { quizScores: [] }).quizScores.push({ date: today(), score });
    for (const sk of skills) (p.skills[sk] ??= []).push({ date: today(), source: 'quiz', value: score, note: lessonId ?? conceptId ?? undefined });
  });
}

export function markLesson(instrument: InstrumentId, lessonId: string, status: LessonState['status']) {
  update((s) => {
    const l = (s.progress[instrument].lessons[lessonId] ??= { status: 'nuevo', ratings: [], quizScores: [] });
    l.status = status;
    if (status === 'completada') {
      l.completedAt = today();
      l.srs ??= nextSrs(undefined, 'adecuado');
    }
  });
}

/**
 * Dominio (0..1), distinto de "completada": requiere práctica en al menos 2 días distintos
 * y combina valoraciones y resultados de ejercicios medibles.
 */
export function mastery(l: LessonState | undefined): { value: number; label: string } {
  if (!l || (l.ratings.length === 0 && l.quizScores.length === 0)) return { value: 0, label: 'Sin práctica' };
  const vals = [...l.ratings.slice(-4).map((r) => RATING_VALUE[r.rating] / 100), ...l.quizScores.slice(-4).map((q) => q.score / 100)];
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const days = new Set([...l.ratings.map((r) => r.date), ...l.quizScores.map((q) => q.date)]).size;
  const value = days >= 2 ? avg : Math.min(avg, 0.6);
  const label = value >= 0.8 ? 'Dominada' : value >= 0.55 ? 'En consolidación' : 'En aprendizaje';
  return { value, label: days < 2 && avg >= 0.6 ? 'Repasa otro día para consolidar' : label };
}

export function dueLessons(p: InstrumentProgress, on = today()): string[] {
  return Object.entries(p.lessons)
    .filter(([, l]) => l.srs && l.srs.due <= on)
    .sort((a, b) => (a[1].srs!.due < b[1].srs!.due ? -1 : 1))
    .map(([id]) => id);
}

export function logPractice(instrument: InstrumentId, minutes: number) {
  update((s) => {
    const p = s.progress[instrument];
    p.practiceMinutes[today()] = (p.practiceMinutes[today()] ?? 0) + minutes;
  });
}

export function streak(p: InstrumentProgress[]): number {
  const days = new Set(p.flatMap((x) => Object.keys(x.practiceMinutes)));
  let n = 0;
  let d = today();
  if (!days.has(d)) d = addDays(d, -1);
  while (days.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

// ---------- vocabulario ----------
export function addVocab(item: Omit<VocabItem, 'id' | 'createdAt' | 'keysPracticed' | 'ratings'>) {
  const id = crypto.randomUUID();
  update((s) => {
    s.vocab.push({ ...item, id, createdAt: today(), keysPracticed: [item.key], ratings: [], srs: { intervalDays: 1, due: today() } });
  });
  return id;
}
export function rateVocab(id: string, rating: Rating, key?: string) {
  update((s) => {
    const v = s.vocab.find((x) => x.id === id);
    if (!v) return;
    v.ratings.push({ date: today(), rating });
    v.srs = nextSrs(v.srs, rating);
    if (key && !v.keysPracticed.includes(key)) v.keysPracticed.push(key);
  });
}
export function removeVocab(id: string) {
  update((s) => { s.vocab = s.vocab.filter((x) => x.id !== id); });
}
export const dueVocab = (s: AppState, instrument: InstrumentId, on = today()) => s.vocab.filter((v) => v.instrument === instrument && (!v.srs || v.srs.due <= on));

// ---------- juego: XP, racha, nodos, errores ----------
const dayDiff = (a: string, b: string) => Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000);

/** Suma XP y actualiza la racha (un protector de racha cubre un día perdido). */
export function addXp(amount: number) {
  update((s) => {
    const d = today();
    const g = s.game;
    g.xp += amount;
    g.xpByDay[d] = (g.xpByDay[d] ?? 0) + amount;
    const last = g.streak.lastDay;
    if (last !== d) {
      const gap = last ? dayDiff(last, d) : 1;
      if (!last || gap === 1) g.streak.count += 1;
      else if (gap === 2 && g.streak.freezes > 0) { g.streak.freezes -= 1; g.streak.count += 1; }
      else g.streak.count = 1;
      g.streak.lastDay = d;
      g.streak.best = Math.max(g.streak.best, g.streak.count);
      if (g.streak.count % 7 === 0) g.streak.freezes = Math.min(2, g.streak.freezes + 1);
    }
    const ach = (id: string, cond: boolean) => { if (cond && !g.achievements.includes(id)) g.achievements.push(id); };
    ach('xp100', g.xp >= 100); ach('xp1000', g.xp >= 1000); ach('streak3', g.streak.count >= 3); ach('streak7', g.streak.count >= 7); ach('streak30', g.streak.count >= 30);
  });
}
export const xpToday = (s: AppState) => s.game.xpByDay[today()] ?? 0;
/** Racha visible: se pierde si ayer no se practicó (salvo protector). */
export function currentStreak(s: AppState) {
  const l = s.game.streak.lastDay;
  if (!l) return 0;
  const gap = dayDiff(l, today());
  return gap <= 1 || (gap === 2 && s.game.streak.freezes > 0) ? s.game.streak.count : 0;
}

export function completeNode(instrument: InstrumentId, nodeId: string, stars: number, acc: number) {
  update((s) => {
    const p = s.path[instrument];
    const n = p.nodes[nodeId];
    p.nodes[nodeId] = { stars: Math.max(n?.stars ?? 0, stars), timesDone: (n?.timesDone ?? 0) + 1, bestAcc: Math.max(n?.bestAcc ?? 0, acc), completedAt: today(), byTest: n?.byTest && stars <= 1 };
    const ach = (id: string, cond: boolean) => { if (cond && !s.game.achievements.includes(id)) s.game.achievements.push(id); };
    ach('first-lesson', true);
    ach('perfect', acc >= 0.999);
  });
}
export function markNodesByTest(instrument: InstrumentId, nodeIds: string[], level: number) {
  update((s) => {
    const p = s.path[instrument];
    p.level = level;
    p.placementAt = today();
    for (const id of nodeIds) if (!p.nodes[id]) p.nodes[id] = { stars: 1, timesDone: 0, bestAcc: 0, completedAt: today(), byTest: true };
  });
}
export function recordMistake(instrument: InstrumentId, key: string) {
  update((s) => {
    const m = s.path[instrument].mistakes;
    const e = m.find((x) => x.key === key);
    if (e) { e.count++; e.last = today(); } else m.push({ key, spec: key, count: 1, last: today() });
    if (m.length > 60) m.splice(0, m.length - 60);
  });
}
export function clearMistake(instrument: InstrumentId, key: string) {
  update((s) => {
    const m = s.path[instrument].mistakes;
    const e = m.find((x) => x.key === key);
    if (e) { e.count -= 1; if (e.count <= 0) s.path[instrument].mistakes = m.filter((x) => x.key !== key); }
  });
}
export const ACHIEVEMENTS: Record<string, { name: string; icon: string; desc: string }> = {
  'first-lesson': { name: 'Primer paso', icon: '🎵', desc: 'Completaste tu primera lección.' },
  perfect: { name: 'Sin errores', icon: '💎', desc: 'Una lección perfecta.' },
  xp100: { name: '100 XP', icon: '⭐', desc: 'Sumaste 100 puntos de experiencia.' },
  xp1000: { name: '1000 XP', icon: '🌟', desc: 'Mil puntos: constancia de verdad.' },
  streak3: { name: 'Racha de 3', icon: '🔥', desc: 'Tres días seguidos practicando.' },
  streak7: { name: 'Semana completa', icon: '🔥', desc: 'Siete días seguidos.' },
  streak30: { name: 'Un mes', icon: '🏆', desc: 'Treinta días seguidos.' },
  placement: { name: 'Nivel descubierto', icon: '🧭', desc: 'Hiciste la prueba de nivel.' },
  unit: { name: 'Unidad superada', icon: '🏅', desc: 'Superaste un desafío de unidad.' },
};
export function unlockAchievement(id: string) {
  update((s) => { if (!s.game.achievements.includes(id)) s.game.achievements.push(id); });
}


// ---------- misiones diarias, nivel de jugador y uso por mes ----------
/** Registra una lección terminada hoy (para las misiones del día). */
export function recordLessonDone(accuracy: number) {
  update((s) => {
    const d = today();
    s.game.lessonsByDay[d] = (s.game.lessonsByDay[d] ?? 0) + 1;
    if (accuracy >= 0.9) s.game.perfectByDay[d] = (s.game.perfectByDay[d] ?? 0) + 1;
  });
}
export interface Quest { id: string; icon: string; text: string; value: number; target: number }
export function dailyQuests(s: AppState): Quest[] {
  const d = today();
  return [
    { id: 'xp', icon: '⚡', text: `Gana ${s.game.dailyGoal} XP`, value: Math.min(xpToday(s), s.game.dailyGoal), target: s.game.dailyGoal },
    { id: 'lessons', icon: '📖', text: 'Completa 2 lecciones', value: Math.min(s.game.lessonsByDay[d] ?? 0, 2), target: 2 },
    { id: 'perfect', icon: '🎯', text: 'Haz una lección con 90 % de aciertos', value: Math.min(s.game.perfectByDay[d] ?? 0, 1), target: 1 },
  ];
}
export const CHEST_XP = 15;
export function openChest() {
  update((s) => { s.game.chestDay = today(); });
  addXp(CHEST_XP);
}
/** Nivel de jugador a partir del XP total (cada nivel cuesta un poco más que el anterior). */
export function playerLevel(xp: number) {
  let lv = 1, need = 60, acc = 0;
  while (xp >= acc + need) { acc += need; lv++; need = Math.round(need * 1.18); }
  return { level: lv, into: xp - acc, need };
}
export const monthKey = () => today().slice(0, 7);
export function countUse(feature: string) {
  update((s) => { const m = monthKey(); s.usage[m] = { ...s.usage[m], [feature]: (s.usage[m]?.[feature] ?? 0) + 1 }; });
}
export const usesThisMonth = (s: AppState, feature: string) => s.usage[monthKey()]?.[feature] ?? 0;

/** Marca un ejercicio del explorador de cadencias como probado. Devuelve true si es la primera vez (da XP). */
export const EXPLORE_XP = 5;
export function markExplored(key: string): boolean {
  if (state.explorer[key]) return false;
  update((s) => { s.explorer[key] = today(); });
  addXp(EXPLORE_XP);
  return true;
}

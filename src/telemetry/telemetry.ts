// Observabilidad local: registra en este navegador (no se envía a ningún servidor) el uso de la app, las
// operaciones de IA y cómputo (tiempo, dispositivo, tamaño de la entrada, tokens estimados), los errores y las
// capacidades del equipo. Alimenta el módulo de Administración para dimensionar costos y decidir precios.
// Hay un punto de enganche (`setSink`) para enviar los eventos a un servicio propio cuando exista, con el
// consentimiento del usuario (obligatorio si hay menores de edad).

export type EventType = 'session' | 'page' | 'lesson' | 'feature' | 'ai' | 'error' | 'perf';

export interface AiMeta {
  op: AiOp;
  /** dónde corrió: en el equipo del usuario (gratis para el negocio) o en la nube (cuesta por uso) */
  where: 'device' | 'cloud';
  model?: string;
  device?: string; // webgpu, wasm, webgl, cpu…
  inputSec?: number; // segundos de audio procesados
  ms?: number;
  ok?: boolean;
  tokensIn?: number; // estimados (≈ caracteres / 3,6)
  tokensOut?: number;
  error?: string;
}
export type AiOp = 'separacion-ia' | 'separacion-centro' | 'transcripcion' | 'armonia' | 'realce' | 'velocidad-tono' | 'profesor-solo' | 'profesor-pregunta' | 'deteccion-microfono';

export interface TEvent { t: number; type: EventType; name?: string; data?: Record<string, unknown> }

const KEY = 'mil-telemetry.v1';
const MAX = 4000;
let events: TEvent[] = [];
try { events = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { events = []; }
let sink: ((e: TEvent) => void) | null = null;
let saveTimer = 0;
const listeners = new Set<() => void>();

function persist() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(events.slice(-MAX))); } catch { /* sin espacio: se pierde lo más antiguo */ events = events.slice(-Math.floor(MAX / 2)); }
  }, 400);
}

export function track(type: EventType, name?: string, data?: Record<string, unknown>) {
  const e: TEvent = { t: Date.now(), type, name, data };
  events.push(e);
  if (events.length > MAX * 1.2) events = events.slice(-MAX);
  persist();
  try { sink?.(e); } catch { /* el destino externo nunca rompe la app */ }
  listeners.forEach((l) => l());
}

export const trackFeature = (name: string, data?: Record<string, unknown>) => track('feature', name, data);
export const trackAi = (m: AiMeta) => track('ai', m.op, m as unknown as Record<string, unknown>);

/** Mide una operación de IA o cómputo y la registra (también si falla). */
export async function timedAi<T>(meta: Omit<AiMeta, 'ms' | 'ok'>, fn: () => Promise<T>, extra?: (r: T) => Partial<AiMeta>): Promise<T> {
  const t0 = performance.now();
  try {
    const r = await fn();
    trackAi({ ...meta, ...(extra?.(r) ?? {}), ms: Math.round(performance.now() - t0), ok: true });
    return r;
  } catch (e) {
    const aborted = (e as DOMException)?.name === 'AbortError';
    trackAi({ ...meta, ms: Math.round(performance.now() - t0), ok: false, error: aborted ? 'cancelado' : String((e as Error)?.message ?? e).slice(0, 160) });
    throw e;
  }
}

/** Tokens aproximados de un texto en español (para estimar costos de IA en la nube). */
export const estimateTokens = (text: string) => Math.ceil(text.length / 3.6);

export const getEvents = () => events;
export function clearEvents() { events = []; try { localStorage.removeItem(KEY); } catch { /* nada */ } listeners.forEach((l) => l()); }
export const subscribeTelemetry = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
/** Destino externo opcional (p. ej. un endpoint propio). Úsalo solo con consentimiento informado. */
export const setSink = (f: ((e: TEvent) => void) | null) => { sink = f; };

let started = false;
/** Registra la sesión, el tiempo de carga y los errores no controlados. Llamar una vez al iniciar la app. */
export function startTelemetry() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const nav = navigator as Navigator & { deviceMemory?: number; gpu?: unknown };
  track('session', 'inicio', {
    cores: nav.hardwareConcurrency, memGB: nav.deviceMemory, webgpu: !!nav.gpu,
    mobile: /Android|iPhone|iPad|iPod/i.test(nav.userAgent), standalone: window.matchMedia?.('(display-mode: standalone)').matches,
    w: window.screen?.width, h: window.screen?.height, lang: nav.language,
  });
  window.addEventListener('load', () => {
    const nt = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nt) track('perf', 'carga', { ms: Math.round(nt.loadEventStart || nt.duration), transfer: nt.transferSize });
  });
  window.addEventListener('error', (e) => track('error', 'js', { msg: String(e.message).slice(0, 200), src: `${(e.filename || '').split('/').pop()}:${e.lineno}` }));
  window.addEventListener('unhandledrejection', (e) => track('error', 'promesa', { msg: String((e.reason as Error)?.message ?? e.reason).slice(0, 200) }));
}

// ---------------------------------------------------------------- resúmenes para el panel
export const dayOf = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export interface AiSummary { op: string; where: string; count: number; fails: number; inputSec: number; ms: number; tokensIn: number; tokensOut: number; devices: Record<string, number>; models: Record<string, number> }

export function summarize(evts = events) {
  const days = new Map<string, { sessions: number; lessons: number; xp: number; ai: number; errors: number }>();
  const day = (t: number) => { const k = dayOf(t); let d = days.get(k); if (!d) { d = { sessions: 0, lessons: 0, xp: 0, ai: 0, errors: 0 }; days.set(k, d); } return d; };
  const features = new Map<string, number>();
  const pages = new Map<string, number>();
  const ai = new Map<string, AiSummary>();
  const errors: TEvent[] = [];
  for (const e of evts) {
    const d = day(e.t);
    if (e.type === 'session') d.sessions++;
    else if (e.type === 'lesson') { d.lessons++; d.xp += Number(e.data?.xp ?? 0); }
    else if (e.type === 'page') pages.set(e.name ?? '?', (pages.get(e.name ?? '?') ?? 0) + 1);
    else if (e.type === 'feature') features.set(e.name ?? '?', (features.get(e.name ?? '?') ?? 0) + 1);
    else if (e.type === 'error') { d.errors++; errors.push(e); }
    else if (e.type === 'ai') {
      d.ai++;
      const m = e.data as unknown as AiMeta;
      const k = m.op;
      const s = ai.get(k) ?? { op: m.op, where: m.where, count: 0, fails: 0, inputSec: 0, ms: 0, tokensIn: 0, tokensOut: 0, devices: {}, models: {} };
      s.count++;
      if (m.ok === false) s.fails++;
      s.inputSec += m.inputSec ?? 0; s.ms += m.ms ?? 0; s.tokensIn += m.tokensIn ?? 0; s.tokensOut += m.tokensOut ?? 0;
      if (m.device) s.devices[m.device] = (s.devices[m.device] ?? 0) + 1;
      if (m.model) s.models[m.model] = (s.models[m.model] ?? 0) + 1;
      ai.set(k, s);
    }
  }
  const sessions = evts.filter((e) => e.type === 'session');
  const last = sessions[sessions.length - 1]?.data ?? {};
  return {
    days: [...days.entries()].sort(([a], [b]) => (a < b ? -1 : 1)),
    features: [...features.entries()].sort((a, b) => b[1] - a[1]),
    pages: [...pages.entries()].sort((a, b) => b[1] - a[1]),
    ai: [...ai.values()].sort((a, b) => b.count - a.count),
    errors: errors.slice(-30).reverse(),
    device: last,
    first: evts[0]?.t ?? null,
    total: evts.length,
  };
}

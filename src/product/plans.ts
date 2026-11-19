// Planes de licencia (Gratis / Pro) y qué incluye cada uno. Sin cobro todavía: el plan se guarda en Ajustes
// («pro» mientras se desarrolla) y Administración permite previsualizar la app como usuario gratuito.
// `where` indica si la función corre en el equipo del usuario (costo marginal 0 para el negocio) o en la nube.
import type { AppState } from '../progress/store';
import { usesThisMonth } from '../progress/store';

export type FeatureId =
  | 'camino' | 'laboratorio' | 'acompanamientos' | 'microfono' | 'repertorio' | 'repertorio-completo' | 'vocabulario'
  | 'sacar-solos' | 'separacion-ia' | 'transcripcion' | 'explicacion' | 'proyectos' | 'profesor-ia';

export interface FeatureDef { id: FeatureId; name: string; tier: 'free' | 'pro'; where: 'device' | 'cloud' | 'none'; freeLimit?: number; limitText?: string }

export const FREE_TUNES = 12;
export const FREE_PROJECTS = 3;

export const FEATURES: FeatureDef[] = [
  { id: 'camino', name: 'Camino por niveles, lecciones, prueba de nivel, rachas y logros', tier: 'free', where: 'device' },
  { id: 'laboratorio', name: 'Laboratorio: escalas, acordes, progresiones, metrónomo, afinador', tier: 'free', where: 'device' },
  { id: 'acompanamientos', name: 'Acompañamientos con mezclador (batería, bajo, piano, guitarra, clic)', tier: 'free', where: 'device' },
  { id: 'microfono', name: 'Ejercicios con micrófono y palmas', tier: 'free', where: 'device' },
  { id: 'repertorio', name: `Repertorio: ${FREE_TUNES} temas completos`, tier: 'free', where: 'device' },
  { id: 'vocabulario', name: 'Mi vocabulario y repaso espaciado', tier: 'free', where: 'device' },
  { id: 'sacar-solos', name: 'Sacar solos: editor, loop, velocidad, tono, marcas', tier: 'free', where: 'device' },
  { id: 'repertorio-completo', name: 'Repertorio completo y temas nuevos cada mes', tier: 'pro', where: 'device' },
  { id: 'separacion-ia', name: 'Separación de instrumentos con IA', tier: 'pro', where: 'device', freeLimit: 3, limitText: '3 por mes' },
  { id: 'transcripcion', name: 'Transcripción a partitura y explicación del solo', tier: 'pro', where: 'device', freeLimit: 5, limitText: '5 por mes' },
  { id: 'proyectos', name: 'Proyectos guardados ilimitados', tier: 'pro', where: 'none', freeLimit: FREE_PROJECTS, limitText: `${FREE_PROJECTS} proyectos` },
  { id: 'profesor-ia', name: 'Profesor IA: solos explicados y preguntas (Claude, en la nube)', tier: 'pro', where: 'cloud' },
];
export const featureById = (id: FeatureId) => FEATURES.find((f) => f.id === id)!;

export interface Access { ok: boolean; left?: number; reason?: string }

/** ¿Puede el usuario usar la función ahora? En el plan gratuito, las funciones Pro con cupo mensual cuentan sus usos. */
export function access(s: AppState, id: FeatureId, extra?: { projects?: number }): Access {
  const f = featureById(id);
  if (s.settings.plan === 'pro' || f.tier === 'free') return { ok: true };
  if (id === 'proyectos') {
    const left = FREE_PROJECTS - (extra?.projects ?? 0);
    return left > 0 ? { ok: true, left } : { ok: false, left: 0, reason: `El plan gratuito guarda hasta ${FREE_PROJECTS} proyectos.` };
  }
  if (f.freeLimit) {
    const left = f.freeLimit - usesThisMonth(s, id);
    return left > 0 ? { ok: true, left } : { ok: false, left: 0, reason: `Usaste las ${f.freeLimit} de este mes del plan gratuito.` };
  }
  return { ok: false, reason: 'Disponible en el plan Pro.' };
}

// ---------------------------------------------------------------- costos de IA en la nube
// Precios oficiales de la API de Claude por millón de tokens (consultados el 2026-11-03). La lectura de caché
// cuesta ≈ 0,1× la entrada y la escritura ≈ 1,25×. Revisa la página de precios antes de fijar el tuyo.
export const PRICES_CHECKED = '2026-11-03';
export const CLAUDE_PRICES = [
  { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5', input: 0.1, output: 0.5, note: 'el más económico: respuestas breves del profesor' },
  { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', input: 2, output: 10, note: 'equilibrio calidad/costo' },
  { id: 'claude-opus-5-5', name: 'Claude Opus 5.5', input: 4, output: 20, note: 'el más capaz' },
];

export interface CostInput { priceIn: number; priceOut: number; callsPerUser: number; tokensIn: number; tokensOut: number; cachedShare: number }
/** Costo mensual de IA en la nube por usuario (USD). */
export function cloudCostPerUser(c: CostInput) {
  const inCost = c.tokensIn * ((1 - c.cachedShare) * c.priceIn + c.cachedShare * c.priceIn * 0.1) / 1e6;
  const outCost = (c.tokensOut * c.priceOut) / 1e6;
  return c.callsPerUser * (inCost + outCost);
}

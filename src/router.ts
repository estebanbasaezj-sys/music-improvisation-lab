// Rutas con parámetros: #/tema/autumn-leaves?c=1-8&bpm=110&tono=G
// Los enlaces antiguos (sin «?») siguen funcionando igual. Los ajustes de práctica viven en la URL, así que
// recargar la página o pulsar «Retomar» abre el mismo ejercicio con los mismos ajustes.

export interface Route { path: string; seg: string; arg: string; params: URLSearchParams }

export function parseHash(h: string = typeof location !== 'undefined' ? location.hash : ''): Route {
  const raw = h.replace(/^#\/?/, '') || 'hoy';
  const q = raw.indexOf('?');
  const path = q < 0 ? raw : raw.slice(0, q);
  const params = new URLSearchParams(q < 0 ? '' : raw.slice(q + 1));
  const [seg, arg = ''] = path.split('/');
  return { path, seg: seg || 'hoy', arg, params };
}

export type ParamPatch = Record<string, string | number | boolean | null | undefined>;

export function buildRoute(path: string, params: URLSearchParams | ParamPatch = {}): string {
  const p = params instanceof URLSearchParams ? new URLSearchParams(params) : new URLSearchParams();
  if (!(params instanceof URLSearchParams)) {
    for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== '' && v !== false) p.set(k, String(v));
  }
  const q = p.toString();
  return `#/${path}${q ? `?${q}` : ''}`;
}

/** Cambia parámetros de la ruta actual sin recargar la pantalla ni crear otra entrada en el historial. */
export function replaceParams(patch: ParamPatch): string {
  const { path, params } = parseHash();
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === '' || v === false) params.delete(k);
    else params.set(k, String(v));
  }
  const url = buildRoute(path, params);
  if (typeof location !== 'undefined' && url !== location.hash) {
    try { history.replaceState(history.state, '', url); } catch { /* algunos navegadores limitan replaceState */ }
  }
  return url;
}

export const go = (route: string) => { if (location.hash !== route) location.hash = route; };

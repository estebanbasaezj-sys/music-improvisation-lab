// «Retomar práctica»: cada pantalla de práctica declara qué ejercicio es; los reproductores informan
// tempo y fragmento. Todo se guarda en la URL (sobrevive a recargar) y, en cuanto el alumno empieza a
// tocar, como «la última práctica» de su instrumento.
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { ParamPatch, buildRoute, parseHash, replaceParams } from '../router';
import { getState, saveSpot } from '../progress/store';

export interface SpotDescription { id: string; title: string; detail: string; minutes?: number }

export interface SpotCtl {
  /** valor guardado de un ajuste (de la URL) */
  get: (k: string) => string | null;
  /** guarda ajustes (URL y, si ya empezó, «Retomar») */
  set: (patch: ParamPatch) => void;
  /** el alumno empezó a tocar: desde ahora este ejercicio es «su última práctica» */
  started: () => void;
}

const Ctx = createContext<SpotCtl | null>(null);
export const useSpot = () => useContext(Ctx);

/** Ajustes iniciales de la URL al abrir la pantalla (no cambian mientras está abierta). */
export function useInitialParams() {
  return useMemo(() => parseHash().params, []);
}

export function SpotProvider({ describe, children }: { describe: (p: URLSearchParams) => SpotDescription; children: ReactNode }) {
  const desc = useRef(describe);
  desc.current = describe;
  const begun = useRef(false);
  const timer = useRef<number>(0);
  const persist = useCallback(() => {
    const { path, params } = parseHash();
    const d = desc.current(params);
    saveSpot(getState().instrument, { ...d, route: buildRoute(path, params) });
  }, []);
  const ctl = useMemo<SpotCtl>(() => ({
    get: (k) => parseHash().params.get(k),
    set: (patch) => {
      replaceParams(patch);
      if (!begun.current) return;
      clearTimeout(timer.current);
      timer.current = window.setTimeout(persist, 400);
    },
    started: () => { begun.current = true; clearTimeout(timer.current); persist(); },
  }), [persist]);
  useEffect(() => {
    // si se vuelve al mismo ejercicio que ya era «la última práctica», sus cambios se siguen guardando
    const st = getState();
    if (st.resume[st.instrument]?.id === desc.current(parseHash().params).id) begun.current = true;
    return () => clearTimeout(timer.current);
  }, []);
  return <Ctx.Provider value={ctl}>{children}</Ctx.Provider>;
}

/** «Fa mayor», «Sol menor»… a partir de un nombre de tonalidad ya traducido. */
export const keyWords = (name: string, minor = false) => `${name} ${minor ? 'menor' : 'mayor'}`;

/** Fragmento «c1-8» → «compases 1–8». */
export function fragWords(frag: string | null | undefined, all = 'todo el tema') {
  if (!frag || frag === 'all') return all;
  const m = /^(\d+)-(\d+)$/.exec(frag);
  if (!m) return all;
  return m[1] === m[2] ? `compás ${m[1]}` : `compases ${m[1]}–${m[2]}`;
}

// Control global del sonido: qué instrumentos suenan en cualquier acompañamiento (mezclador por capas)
// y el botón flotante para detener todo lo que esté sonando.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Bus, STOP_ALL_EVENT, isAudioActive, setBusVolume, stopAllAudio, subscribeActivity } from '../audio/engine';
import { COMP_LABEL, CompInstrument } from '../audio/backing';
import { DEFAULT_LAYERS, Layers, update, useAppState } from '../progress/store';

export const LAYER_INFO: { id: keyof Layers; label: string; icon: string }[] = [
  { id: 'drums', label: 'Batería', icon: '🥁' },
  { id: 'bass', label: 'Bajo', icon: '🎻' },
  { id: 'piano', label: 'Piano', icon: '🎹' },
  { id: 'guitar', label: 'Guitarra', icon: '🎸' },
  { id: 'melody', label: 'Melodía', icon: '🎷' },
  { id: 'click', label: 'Clic', icon: '⏱' },
];

const PRESETS: { label: string; layers: Partial<Layers> }[] = [
  { label: 'Combo completo', layers: { drums: true, bass: true, piano: true, guitar: false, melody: true } },
  { label: 'Trío para solear', layers: { drums: true, bass: true, piano: true, guitar: false, melody: false } },
  { label: 'Solo batería', layers: { drums: true, bass: false, piano: false, guitar: false, melody: false } },
  { label: 'Batería + clic', layers: { drums: true, bass: false, piano: false, guitar: false, melody: false, click: true } },
  { label: 'Solo piano', layers: { drums: false, bass: false, piano: true, guitar: false, melody: false } },
  { label: 'Solo guitarra', layers: { drums: false, bass: false, piano: false, guitar: true, melody: false } },
  { label: 'Bajo + batería', layers: { drums: true, bass: true, piano: false, guitar: false, melody: false } },
  { label: 'Solo clic', layers: { drums: false, bass: false, piano: false, guitar: false, melody: false, click: true } },
];

const setLayer = (id: keyof Layers, on: boolean) => update((s) => { s.sound.layers[id] = on; });

/** Interruptores de capas. Cambian el mezclador global y se oyen al instante, incluso con la base sonando. */
export function LayerToggles({ hide = [] }: { hide?: (keyof Layers)[] }) {
  const s = useAppState();
  const L = s.sound.layers;
  return (
    <div className="layer-toggles" role="group" aria-label="Instrumentos que suenan">
      {LAYER_INFO.filter((l) => !hide.includes(l.id)).map((l) => (
        <button key={l.id} type="button" className={`layer ${L[l.id] ? 'on' : ''}`} aria-pressed={L[l.id]} onClick={() => setLayer(l.id, !L[l.id])}>
          <span className="li">{l.icon}</span><span>{l.label}</span>
        </button>
      ))}
    </div>
  );
}

const BUS_LABEL: Record<Bus, string> = { melody: 'Melodía y frases', comp: 'Piano / guitarra', bass: 'Bajo', drums: 'Batería' };

/** Contenido del mezclador: capas, combinaciones rápidas, sonido de teclado y volúmenes. */
export function MixPanel() {
  const s = useAppState();
  const L = s.sound.layers;
  const nothing = !L.drums && !L.bass && !L.piano && !L.guitar && !L.melody && !L.click;
  return (
    <div className="mix-panel">
      <p className="small muted">Elige qué suena en todos los acompañamientos de la app (canciones, repertorio, taller, ejercicios). Puedes combinar cualquier grupo; los cambios se oyen en vivo.</p>
      <LayerToggles />
      {nothing && <p className="warn small">Todo está apagado: los acompañamientos no sonarán.</p>}
      <div className="chip-row">
        {PRESETS.map((p) => {
          const target = { ...DEFAULT_LAYERS, click: false, ...p.layers };
          const on = (Object.keys(target) as (keyof Layers)[]).every((k) => target[k] === L[k]);
          return <button key={p.label} className={`chip ${on ? 'on' : ''}`} onClick={() => update((x) => { x.sound.layers = target; })}>{p.label}</button>;
        })}
      </div>
      <label className="field inline"><span>Sonido de teclado</span>
        <select value={s.sound.keys} onChange={(e) => update((x) => { x.sound.keys = e.target.value as CompInstrument; })}>
          {Object.entries(COMP_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      {(Object.keys(BUS_LABEL) as Bus[]).map((b) => (
        <label key={b} className="mix-row"><span>{BUS_LABEL[b]}</span>
          <input type="range" min={-30} max={6} value={s.sound.volumes[b]} onChange={(e) => update((x) => { x.sound.volumes[b] = +e.target.value; })} />
          <span className="small">{s.sound.volumes[b]} dB</span>
        </label>
      ))}
    </div>
  );
}

/** Botón de la barra superior que abre el mezclador. */
export function MixButton() {
  const s = useAppState();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { (Object.keys(s.sound.volumes) as Bus[]).forEach((b) => setBusVolume(b, s.sound.volumes[b])); }, [s.sound.volumes]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  const L = s.sound.layers;
  const icons = LAYER_INFO.filter((l) => L[l.id]).map((l) => l.icon).join('');
  return (
    <div className="mix-btn-wrap" ref={ref}>
      <button className={`mix-btn ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open} title="Elegir qué instrumentos suenan">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 3v8M5 15v6M12 3v4M12 11v10M19 3v10M19 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="5" cy="13" r="2.2" fill="currentColor" /><circle cx="12" cy="9" r="2.2" fill="currentColor" /><circle cx="19" cy="15" r="2.2" fill="currentColor" /></svg>
        <span className="lbl">Mezcla</span><span className="mix-icons" aria-hidden="true">{icons || '∅'}</span>
      </button>
      {open && (
        <div className="mix-pop" role="dialog" aria-label="Mezclador">
          <div className="row between"><b>¿Qué quieres que suene?</b><button className="btn sm" onClick={() => setOpen(false)}>Cerrar</button></div>
          <MixPanel />
        </div>
      )}
    </div>
  );
}

export function useAudioActive() {
  return useSyncExternalStore(subscribeActivity, isAudioActive, () => false);
}

/** Llama a `fn` cuando el usuario pulsa «Detener audio» (para devolver la interfaz a su estado inicial). */
export function useOnStopAll(fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const h = () => ref.current();
    window.addEventListener(STOP_ALL_EVENT, h);
    return () => window.removeEventListener(STOP_ALL_EVENT, h);
  }, []);
}

/** Botón flotante: aparece mientras suena algo; también responde a la tecla Esc. */
export function StopAllButton() {
  const active = useAudioActive();
  const [, force] = useState(0);
  // las notas agendadas a futuro terminan solas: revisar cada medio segundo mientras el botón está visible
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => force((x) => x + 1), 500);
    return () => clearInterval(id);
  }, [active]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !isAudioActive()) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      stopAllAudio();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (!isAudioActive()) return null;
  return (
    <button className="stop-all" onClick={stopAllAudio} title="Detener todo el audio (Esc)">
      <span className="sq" aria-hidden="true" /> Detener audio <kbd>Esc</kbd>
    </button>
  );
}

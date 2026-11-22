// Controles del generador de solos: pasaje, nivel 1–5, forma de tocar (agrupadas), recorrer formas, otra
// versión y velocidad. Pensado para probar muchas maneras de tocar el mismo pasaje con pocos toques.
import { ChordEvent } from '../theory/progressions';
import { LEVELS, Level, Passage, WAYS, WAY_GROUPS, WayId, wayAvailable, wayById } from '../theory/ways';

export type Speed = 'lenta' | 'normal' | 'rapida';
export const SPEED_FACTOR: Record<Speed, number> = { lenta: 0.75, normal: 1, rapida: 1.25 };

interface Props {
  events: ChordEvent[];
  passages: Passage[];
  passage: string;
  onPassage: (id: string) => void;
  level: Level;
  onLevel: (l: Level) => void;
  way: WayId;
  onWay: (w: WayId) => void;
  onAnother: () => void;
  speed: Speed;
  onSpeed: (s: Speed) => void;
}

export function WayPicker({ events, passages, passage, onPassage, level, onLevel, way, onWay, onAnother, speed, onSpeed }: Props) {
  const avail = WAYS.filter((w) => wayAvailable(w.id, { events, level }).ok).map((w) => w.id);
  const idx = avail.indexOf(way);
  const go = (d: number) => onWay(avail[(Math.max(0, idx) + d + avail.length) % avail.length]);
  return (
    <div className="wp">
      {passages.length > 1 && (
        <div className="wp-row">
          <span className="wp-label">Pasaje</span>
          <div className="chip-row">
            {passages.map((p) => <button key={p.id} className={`chip ${p.id === passage ? 'on' : ''}`} onClick={() => onPassage(p.id)}>{p.label}</button>)}
          </div>
        </div>
      )}
      <div className="wp-row">
        <span className="wp-label">Nivel</span>
        <div className="wp-levels" role="radiogroup" aria-label="Nivel">
          {LEVELS.map((l) => (
            <button key={l.n} role="radio" aria-checked={l.n === level} className={`wp-level ${l.n === level ? 'on' : ''}`} onClick={() => onLevel(l.n)}>
              <b>{l.n}</b><small>{l.name}</small>
            </button>
          ))}
        </div>
      </div>
      <p className="small muted wp-level-text">{LEVELS[level - 1].text}</p>
      <div className="wp-ways">
        {WAY_GROUPS.map((g) => (
          <div key={g} className="wp-group">
            <span className="wp-label">{g}</span>
            <div className="wp-chips">
              {WAYS.filter((w) => w.group === g).map((w) => {
                const a = wayAvailable(w.id, { events, level });
                return (
                  <button key={w.id} className={`wp-way ${w.id === way ? 'on' : ''}`} disabled={!a.ok} title={a.ok ? w.short : a.reason} onClick={() => onWay(w.id)}>
                    <span aria-hidden="true">{w.icon}</span> {w.name}{!a.ok && <small> · {a.reason}</small>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="wp-nav">
        <button className="btn" onClick={() => go(-1)} aria-label="Forma anterior">◀ Anterior</button>
        <span className="wp-current"><b>{wayById(way).icon} {wayById(way).name}</b><small>{Math.max(0, idx) + 1} de {avail.length} formas</small></span>
        <button className="btn" onClick={() => go(1)} aria-label="Forma siguiente">Siguiente ▶</button>
        <button className="btn" onClick={onAnother}>🎲 Otra versión</button>
        <div className="segmented sm" role="radiogroup" aria-label="Velocidad">
          {(['lenta', 'normal', 'rapida'] as Speed[]).map((s) => (
            <button key={s} className={speed === s ? 'on' : ''} onClick={() => onSpeed(s)}>{s === 'lenta' ? '🐢 Lenta' : s === 'normal' ? '🚶 Normal' : '🏃 Rápida'}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

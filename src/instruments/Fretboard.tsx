import { GUITAR_TUNING_MIDI } from '../theory/instruments';

export type Role = 'root' | 'chord' | 'scale' | 'char' | 'target' | 'guide';
export interface Mark {
  label: string;
  role: Role;
}

interface Props {
  /** marcas por clase de altura (0–11) */
  marks: Map<number, Mark>;
  frets?: number;
  startFret?: number;
  only?: { string: number; fret: number }[]; // si se pasa, solo se iluminan estas posiciones
  question?: { string: number; fret: number };
  onPlay?: (midi: number) => void;
  activeMidi?: number | null;
}

const INLAYS = [3, 5, 7, 9, 15, 17];

export function Fretboard({ marks, frets = 15, startFret = 0, only, question, onPlay, activeMidi }: Props) {
  const fw = 52;
  const sh = 26;
  const left = 34;
  const top = 18;
  const width = left + (frets - startFret + 1) * fw + 10;
  const height = top + sh * 5 + 34;
  const strings = [5, 4, 3, 2, 1, 0]; // dibujar la 1ª cuerda arriba
  const x = (f: number) => left + (f - startFret) * fw + (f === 0 ? -fw / 2 + 10 : -fw / 2);
  return (
    <div className="scroll-x">
      <svg className="fretboard" viewBox={`0 0 ${width} ${height}`} style={{ minWidth: Math.min(width, 900) }} role="img" aria-label="Diapasón de guitarra">
        <rect x={left} y={top - 6} width={width - left - 10} height={sh * 5 + 12} rx="4" className="fb-wood" />
        {Array.from({ length: frets - startFret + 1 }, (_, i) => i + startFret).map((f) => (
          <g key={f}>
            <line x1={left + (f - startFret) * fw} x2={left + (f - startFret) * fw} y1={top - 6} y2={top + sh * 5 + 6} className={f === 0 ? 'fb-nut' : 'fb-fret'} />
            <text x={left + (f - startFret) * fw - fw / 2} y={height - 4} className="fb-num">{f > 0 ? f : ''}</text>
            {INLAYS.includes(f) && <circle cx={left + (f - startFret) * fw - fw / 2} cy={top + sh * 2.5} r="5" className="fb-inlay" />}
            {f === 12 && (<><circle cx={left + (f - startFret) * fw - fw / 2} cy={top + sh * 1.5} r="5" className="fb-inlay" /><circle cx={left + (f - startFret) * fw - fw / 2} cy={top + sh * 3.5} r="5" className="fb-inlay" /></>)}
          </g>
        ))}
        {strings.map((s, row) => (
          <g key={s}>
            <line x1={left} x2={width - 10} y1={top + row * sh} y2={top + row * sh} className="fb-string" strokeWidth={1 + (5 - row) * 0.35} />
            <text x={6} y={top + row * sh + 4} className="fb-num">{['E', 'A', 'D', 'G', 'B', 'e'][s]}</text>
            {Array.from({ length: frets - startFret + 1 }, (_, i) => i + startFret).map((f) => {
              const m = GUITAR_TUNING_MIDI[s] + f;
              const pc = m % 12;
              const mk = marks.get(pc);
              const allowed = !only || only.some((o) => o.string === s && o.fret === f);
              const isQ = question && question.string === s && question.fret === f;
              const cx = f === 0 ? left - 14 : x(f);
              const cy = top + row * sh;
              if (isQ) return <g key={f}><circle cx={cx} cy={cy} r="11" className="dot q" /><text x={cx} y={cy + 4} className="dot-label">?</text></g>;
              return (
                <g key={f} className="fb-cell" onClick={() => onPlay?.(m)}>
                  <rect x={cx - fw / 2 + 2} y={cy - sh / 2} width={fw - 4} height={sh} fill="transparent" />
                  {mk && allowed && !question && (
                    <>
                      <circle cx={cx} cy={cy} r="11" className={`dot ${mk.role} ${activeMidi === m ? 'active' : ''}`} />
                      <text x={cx} y={cy + 4} className="dot-label">{mk.label}</text>
                    </>
                  )}
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}

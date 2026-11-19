// Pentagrama en clave de sol (SVG propio). Muestra alturas con su ortografía exacta, alteraciones
// explícitas y líneas adicionales. Para saxofón recibe ya las alturas ESCRITAS (transpuestas).
import { Pitch, noteName } from '../theory/notes';

interface Props {
  pitches: Pitch[];
  /** duraciones en tiempos para mostrar figuras (opcional) */
  durations?: number[];
  labels?: string[];
  active?: number | null;
  title?: string;
  onNoteClick?: (i: number) => void;
}

const LINE = 10; // distancia entre líneas

export function Staff({ pitches, durations, labels, active, title, onNoteClick }: Props) {
  const stepOf = (p: Pitch) => p.octave * 7 + p.letter - (4 * 7 + 2); // 0 = E4 (1ª línea)
  const steps = pitches.map(stepOf);
  const minStep = Math.min(-2, ...steps);
  const maxStep = Math.max(10, ...steps);
  const top = 22 + Math.max(0, maxStep - 10) * (LINE / 2);
  const bottomY = top + 4 * LINE; // y de E4
  const height = bottomY + Math.max(0, -minStep) * (LINE / 2) + 34;
  const noteW = 34;
  const left = 54;
  const width = left + Math.max(pitches.length, 4) * noteW + 16;
  const yOf = (step: number) => bottomY - step * (LINE / 2);
  const acc = (a: number) => (a === 1 ? '♯' : a === -1 ? '♭' : a === 2 ? '𝄪' : a === -2 ? '𝄫' : '');
  return (
    <div className="scroll-x">
      {title && <div className="staff-title">{title}</div>}
      <svg className="staff" viewBox={`0 0 ${width} ${height}`} style={{ width: Math.round(width * 1.25), maxWidth: 'none' }} role="img" aria-label={`Notación: ${pitches.map((p) => noteName(p) + p.octave).join(' ')}`}>
        {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={6} x2={width - 6} y1={top + i * LINE} y2={top + i * LINE} className="staff-line" />)}
        <text x={8} y={bottomY + 9} className="clef">𝄞</text>
        {pitches.map((p, i) => {
          const s = steps[i];
          const cx = left + i * noteW + noteW / 2;
          const cy = yOf(s);
          const ledgers: number[] = [];
          for (let l = -2; l >= s; l -= 2) ledgers.push(l);
          for (let l = 10; l <= s; l += 2) ledgers.push(l);
          const d = durations?.[i];
          const filled = d === undefined ? false : d < 2;
          const stemUp = s < 4;
          return (
            <g key={i} className={`snote ${active === i ? 'active' : ''}`} onClick={() => onNoteClick?.(i)}>
              {ledgers.map((l) => <line key={l} x1={cx - 10} x2={cx + 10} y1={yOf(l)} y2={yOf(l)} className="staff-line" />)}
              <ellipse cx={cx} cy={cy} rx="6.2" ry="4.6" transform={`rotate(-20 ${cx} ${cy})`} className={filled ? 'head filled' : 'head'} />
              {d !== undefined && d < 4 && <line x1={stemUp ? cx + 5.6 : cx - 5.6} x2={stemUp ? cx + 5.6 : cx - 5.6} y1={cy} y2={stemUp ? cy - 30 : cy + 30} className="stem" />}
              {d !== undefined && d < 1 && <path d={stemUp ? `M${cx + 5.6} ${cy - 30} q 8 8 6 18` : `M${cx - 5.6} ${cy + 30} q 8 -8 6 -18`} className="flag" />}
              {p.acc !== 0 && <text x={cx - 17} y={cy + 5} className="acc">{acc(p.acc)}</text>}
              {labels?.[i] && <text x={cx} y={height - 6} className="slabel">{labels[i]}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

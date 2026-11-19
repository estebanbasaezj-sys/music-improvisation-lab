import { Chord, degreeInChord } from '../theory/chords';
import { Fingering, fretMidi } from '../theory/instruments';

export function ChordDiagram({ chord, f, onPlay }: { chord: Chord; f: Fingering; onPlay?: () => void }) {
  const frets = f.frets;
  const used = frets.filter((x): x is number => x !== null && x > 0);
  const maxF = used.length ? Math.max(...used) : 4;
  const base = maxF <= 4 ? 1 : f.baseFret;
  const rows = 5;
  const sw = 18;
  const fh = 22;
  const left = 22;
  const top = 26;
  return (
    <button className="chord-diagram" onClick={onPlay} title="Escuchar">
      <svg viewBox={`0 0 ${left + sw * 5 + 20} ${top + fh * rows + 30}`} width="130">
        {base > 1 && <text x={2} y={top + fh * 0.65} className="cd-base">{base}</text>}
        <line x1={left} x2={left + sw * 5} y1={top} y2={top} className={base === 1 ? 'cd-nut' : 'cd-fret'} />
        {Array.from({ length: rows }, (_, i) => <line key={i} x1={left} x2={left + sw * 5} y1={top + fh * (i + 1)} y2={top + fh * (i + 1)} className="cd-fret" />)}
        {Array.from({ length: 6 }, (_, s) => <line key={s} x1={left + s * sw} x2={left + s * sw} y1={top} y2={top + fh * rows} className="cd-string" />)}
        {frets.map((fr, s) => {
          const x = left + s * sw;
          if (fr === null) return <text key={s} x={x} y={top - 8} className="cd-x">×</text>;
          if (fr === 0) return <circle key={s} cx={x} cy={top - 11} r="5" className="cd-open" />;
          const y = top + fh * (fr - base) + fh / 2;
          const deg = degreeInChord(chord, fretMidi(s, fr) % 12) ?? '';
          return (
            <g key={s}>
              <circle cx={x} cy={y} r="8" className={`cd-dot ${deg === '1' ? 'root' : ''}`} />
              <text x={x} y={y + 3.5} className="cd-deg">{deg}</text>
            </g>
          );
        })}
        <text x={left + sw * 2.5} y={top + fh * rows + 20} className="cd-name">{f.shape.name}</text>
      </svg>
    </button>
  );
}

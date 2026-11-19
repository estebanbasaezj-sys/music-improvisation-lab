import { Mark } from './Fretboard';

interface Props {
  low?: number; // MIDI (debe ser Do)
  high?: number;
  /** marcas por MIDI exacto (voicings) */
  exact?: Map<number, Mark>;
  /** marcas por clase de altura (escalas) */
  marks?: Map<number, Mark>;
  question?: number;
  onPlay?: (midi: number) => void;
  activeMidi?: number | null;
}

const BLACK = new Set([1, 3, 6, 8, 10]);

export function Keyboard({ low = 48, high = 84, exact, marks, question, onPlay, activeMidi }: Props) {
  const whites: number[] = [];
  for (let m = low; m <= high; m++) if (!BLACK.has(m % 12)) whites.push(m);
  const ww = 30;
  const wh = 120;
  const bw = 19;
  const bh = 76;
  const width = whites.length * ww;
  const xOfWhite = (m: number) => whites.indexOf(m) * ww;
  const mk = (m: number): Mark | undefined => (exact ? exact.get(m) : marks?.get(m % 12));
  const label = (m: number, isBlack: boolean) => {
    const k = mk(m);
    if (question === m) return <text x={0} y={0} className="key-q">?</text>;
    if (!k) return m % 12 === 0 && !isBlack ? <text className="key-c">C{Math.floor(m / 12) - 1}</text> : null;
    return <text className="key-label">{k.label}</text>;
  };
  return (
    <div className="scroll-x">
      <svg className="keyboard" viewBox={`0 0 ${width} ${wh + 4}`} style={{ minWidth: Math.min(width * 1.1, 820) }} role="img" aria-label="Teclado de piano">
        {whites.map((m) => {
          const k = mk(m);
          const cls = `wkey ${k ? 'mk ' + k.role : ''} ${question === m ? 'mk q' : ''} ${activeMidi === m ? 'active' : ''}`;
          return (
            <g key={m} onClick={() => onPlay?.(m)} className="key">
              <rect x={xOfWhite(m)} y={0} width={ww} height={wh} className={cls} rx="3" />
              <g transform={`translate(${xOfWhite(m) + ww / 2}, ${wh - 12})`}>{label(m, false)}</g>
            </g>
          );
        })}
        {Array.from({ length: high - low + 1 }, (_, i) => low + i)
          .filter((m) => BLACK.has(m % 12))
          .map((m) => {
            const k = mk(m);
            const x = xOfWhite(m - 1) + ww - bw / 2;
            const cls = `bkey ${k ? 'mk ' + k.role : ''} ${question === m ? 'mk q' : ''} ${activeMidi === m ? 'active' : ''}`;
            return (
              <g key={m} onClick={() => onPlay?.(m)} className="key">
                <rect x={x} y={0} width={bw} height={bh} className={cls} rx="2" />
                <g transform={`translate(${x + bw / 2}, ${bh - 10})`}>{label(m, true)}</g>
              </g>
            );
          })}
      </svg>
    </div>
  );
}

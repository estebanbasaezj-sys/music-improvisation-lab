// Partitura con compases: cifrado encima, figuras rítmicas (corcheas unidas, negras, blancas, puntillos),
// silencios, alteraciones según la regla del compás y notas coloreadas según su función armónica.
import { useEffect, useRef, useState } from 'react';
import { NoteRole } from '../theory/line';
import { Pitch } from '../theory/notes';

export interface StaffNote {
  pitch: Pitch; // altura a mostrar (ya transpuesta si es saxo)
  start: number;
  dur: number;
  role?: NoteRole;
  label?: string; // texto bajo la nota (grado)
}
export interface StaffChord { start: number; beats: number; symbol: string }

interface Props {
  notes: StaffNote[];
  chords: StaffChord[];
  totalBeats: number;
  active?: number | null;
  highlight?: [number, number] | null;
  onNoteClick?: (i: number) => void;
  firstBarNumber?: number;
  showLabels?: boolean;
}

const LINE = 9;
const BEAT_W_BASE = 44;

export const ROLE_COLOR: Record<NoteRole, string> = {
  guide: '#0f9d8a',
  chord: '#2f6fdc',
  tension: '#8a5cf6',
  blue: '#3949ab',
  approach: '#e8590c',
  passing: '#5b6475',
  chromatic: '#c92a2a',
};

const stepOf = (p: Pitch) => p.octave * 7 + p.letter - (4 * 7 + 2); // 0 = Mi4 (1ª línea)

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((e) => setW(e[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function TimeStaff({ notes: notesIn, chords, totalBeats, active, highlight, onNoteClick, firstBarNumber = 1, showLabels = true }: Props) {
  const [ref, width] = useWidth();
  // notas muy agudas o graves se muestran con 8va / 8vb (convención estándar) para evitar líneas adicionales
  const rawSteps = notesIn.map((n) => stepOf(n.pitch)).sort((a, b) => a - b);
  const med = rawSteps.length ? rawSteps[Math.floor(rawSteps.length / 2)] : 4;
  const oct = med > 13 ? -1 : med < -6 ? 1 : 0;
  const notes = oct ? notesIn.map((n) => ({ ...n, pitch: { ...n.pitch, octave: n.pitch.octave + oct } })) : notesIn;
  const BEAT_W = notesIn.some((n) => n.dur < 0.5 - 1e-6) ? 64 : BEAT_W_BASE;
  const bars = Math.max(1, Math.ceil(totalBeats / 4 - 1e-9));
  const perLine = width < 480 ? 2 : width < 760 ? 3 : 4;
  const steps = notes.map((n) => stepOf(n.pitch));
  const maxStep = Math.max(10, ...steps);
  const minStep = Math.min(-2, ...steps);
  const top = 30 + (maxStep - 10) * (LINE / 2) + 8;
  const bottomY = top + 4 * LINE;
  const height = bottomY + (0 - minStep) * (LINE / 2) + (showLabels ? 34 : 20);
  const lines: number[] = [];
  for (let b = 0; b < bars; b += perLine) lines.push(b);
  return (
    <div className="tstaff" ref={ref}>
      {lines.map((fromBar) => {
        const nb = Math.min(perLine, bars - fromBar);
        const left = 34;
        const barW = BEAT_W * 4 + 14;
        const W = left + nb * barW + 6;
        const x0 = (bar: number) => left + (bar - fromBar) * barW;
        const xOf = (beat: number) => x0(Math.floor(beat / 4 + 1e-9)) + 14 + (beat % 4) * BEAT_W;
        const yOf = (s: number) => bottomY - s * (LINE / 2);
        const inLine = notes.map((n, i) => ({ n, i, s: steps[i] })).filter(({ n }) => n.start >= fromBar * 4 - 1e-9 && n.start < (fromBar + nb) * 4 - 1e-9);
        // alteraciones: se arrastran dentro del compás
        const accShown = new Map<number, string>();
        const barState = new Map<number, Map<string, number>>();
        inLine.forEach(({ n, i }) => {
          const bar = Math.floor(n.start / 4 + 1e-9);
          const st = barState.get(bar) ?? new Map<string, number>();
          barState.set(bar, st);
          const key = `${n.pitch.letter}${n.pitch.octave}`;
          const prev = st.get(key) ?? 0;
          if (n.pitch.acc !== prev) accShown.set(i, n.pitch.acc === 0 ? '♮' : n.pitch.acc === 1 ? '♯' : n.pitch.acc === -1 ? '♭' : n.pitch.acc === 2 ? '𝄪' : '𝄫');
          st.set(key, n.pitch.acc);
        });
        // corcheas y semicorcheas unidas por tiempo (barra principal y, entre semicorcheas, barra secundaria)
        type Grp = { idx: number[]; up: boolean; stemEnd: number };
        const groups: Grp[] = [];
        const beamed = new Map<number, Grp>();
        const byBeat = new Map<number, typeof inLine>();
        inLine.forEach((x) => { const b = Math.floor(x.n.start + 1e-9); byBeat.set(b, [...(byBeat.get(b) ?? []), x]); });
        for (const [, xs] of byBeat) {
          if (xs.length < 2) continue;
          const ok = xs.every((x, k) => x.n.dur <= 0.5 + 1e-6 && Math.abs(x.n.start * 4 - Math.round(x.n.start * 4)) < 1e-6 && (k === 0 || Math.abs(xs[k - 1].n.start + xs[k - 1].n.dur - x.n.start) < 1e-6) && x.n.start + x.n.dur <= Math.floor(xs[0].n.start + 1e-9) + 1 + 1e-6);
          if (!ok) continue;
          const up = xs.reduce((a, x) => a + x.s, 0) / xs.length < 4;
          const ys = xs.map((x) => bottomY - x.s * (LINE / 2));
          const g: Grp = { idx: xs.map((x) => x.i), up, stemEnd: up ? Math.min(...ys) - 26 : Math.max(...ys) + 26 };
          groups.push(g);
          g.idx.forEach((i) => beamed.set(i, g));
        }
        // silencios por compás
        const rests: { x: number; kind: 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth' }[] = [];
        for (let bar = fromBar; bar < fromBar + nb; bar++) {
          const bs = bar * 4;
          const occ = notes.filter((n) => n.start < bs + 4 - 1e-9 && n.start + n.dur > bs + 1e-9).map((n) => [Math.max(bs, n.start) - bs, Math.min(bs + 4, n.start + n.dur) - bs]);
          if (occ.length === 0) { rests.push({ x: x0(bar) + barW / 2 - 6, kind: 'whole' }); continue; }
          const isFree = (t: number) => t < 4 - 1e-9 && !occ.some(([a, b]) => t + 1e-9 >= a && t < b - 1e-9);
          for (let t = 0; t < 4 - 1e-9; t += 0.25) {
            if (!isFree(t)) continue;
            const span = (d: number) => [...Array(Math.round(d / 0.25)).keys()].every((k) => isFree(t + k * 0.25));
            if (Math.abs(t % 2) < 1e-9 && span(2)) { rests.push({ x: xOf(bs + t), kind: 'half' }); t += 1.75; }
            else if (Math.abs(t % 1) < 1e-9 && span(1)) { rests.push({ x: xOf(bs + t), kind: 'quarter' }); t += 0.75; }
            else if (Math.abs(t % 0.5) < 1e-9 && span(0.5)) { rests.push({ x: xOf(bs + t), kind: 'eighth' }); t += 0.25; }
            else rests.push({ x: xOf(bs + t), kind: 'sixteenth' });
          }
        }
        return (
          <svg key={fromBar} viewBox={`0 0 ${W} ${height}`} className="tstaff-svg" style={{ width: `${(W / (34 + perLine * (BEAT_W * 4 + 14) + 6)) * 100}%` }} role="img" aria-label={`Compases ${fromBar + firstBarNumber}–${fromBar + nb - 1 + firstBarNumber}`}>
            {highlight && highlight[1] > fromBar * 4 && highlight[0] < (fromBar + nb) * 4 && <rect x={xOf(Math.max(highlight[0], fromBar * 4)) - 8} y={top - 22} width={Math.max(0, xOf(Math.min(highlight[1], (fromBar + nb) * 4) - 0.001) - xOf(Math.max(highlight[0], fromBar * 4)) + 20)} height={height - top + 14} className="ts-hl" />}
            {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={4} x2={W - 4} y1={top + i * LINE} y2={top + i * LINE} className="staff-line" />)}
            <text x={4} y={bottomY + 7} className="clef small">𝄞</text>
            {oct !== 0 && <text x={6} y={oct < 0 ? top - 16 : bottomY + 26} className="ottava">{oct < 0 ? '8va' : '8vb'}</text>}
            {Array.from({ length: nb + 1 }, (_, k) => <line key={k} x1={x0(fromBar + k)} x2={x0(fromBar + k)} y1={top} y2={bottomY} className="barline" />)}
            {Array.from({ length: nb }, (_, k) => <text key={k} x={x0(fromBar + k) + 2} y={top - 4} className="barnum">{fromBar + k + firstBarNumber}</text>)}
            {chords.filter((c) => c.start >= fromBar * 4 - 1e-9 && c.start < (fromBar + nb) * 4 - 1e-9).map((c, k) => (
              <text key={k} x={xOf(c.start) - 4} y={16} className="ts-chord">{c.symbol.replace(/b(?=\d|$|m|M)/g, '♭').replace(/#/g, '♯')}</text>
            ))}
            {rests.map((r, k) => <Rest key={k} x={r.x} top={top} kind={r.kind} />)}
            {inLine.map(({ n, i, s }) => {
              const cx = xOf(n.start) + 4;
              const cy = yOf(s);
              const color = n.role ? ROLE_COLOR[n.role] : '#111';
              const filled = n.dur < 2;
              const ledgers: number[] = [];
              for (let l = -2; l >= s; l -= 2) ledgers.push(l);
              for (let l = 12; l <= s; l += 2) ledgers.push(l);
              const bm = beamed.get(i);
              const up = bm ? bm.up : s < 4;
              const stemX = up ? cx + 5.2 : cx - 5.2;
              const stemEnd = bm ? bm.stemEnd : up ? cy - 28 : cy + 28;
              const flags = n.dur <= 0.25 + 1e-6 ? 2 : n.dur <= 0.5 + 1e-6 ? 1 : 0;
              const dotted = Math.abs(n.dur - 1.5) < 1e-6 || Math.abs(n.dur - 3) < 1e-6 || Math.abs(n.dur - 0.75) < 1e-6;
              const isActive = active === i;
              return (
                <g key={i} className={`ts-note ${isActive ? 'active' : ''}`} onClick={() => onNoteClick?.(i)}>
                  <rect x={cx - 10} y={top - 10} width={20} height={height - top} fill="transparent" />
                  {ledgers.map((l) => <line key={l} x1={cx - 9} x2={cx + 9} y1={yOf(l)} y2={yOf(l)} className="staff-line" />)}
                  {accShown.has(i) && <text x={cx - 14} y={cy + 4.5} className="acc">{accShown.get(i)}</text>}
                  <ellipse cx={cx} cy={cy} rx="5.6" ry="4.1" transform={`rotate(-20 ${cx} ${cy})`} fill={filled ? color : '#fbfaf6'} stroke={color} strokeWidth={filled ? 1 : 1.8} className={isActive ? 'ts-active' : ''} />
                  {n.dur < 4 && <line x1={stemX} x2={stemX} y1={cy} y2={stemEnd} stroke={color} strokeWidth={1.3} />}
                  {!bm && [...Array(flags).keys()].map((k) => { const y0 = stemEnd + (up ? k * 6 : -k * 6); return <path key={k} d={up ? `M${stemX} ${y0} q 7 7 5 16` : `M${stemX} ${y0} q 7 -7 5 -16`} stroke={color} strokeWidth={1.3} fill="none" />; })}
                  {dotted && <circle cx={cx + 9} cy={cy - (s % 2 === 0 ? 3 : 0)} r="1.6" fill={color} />}
                  {showLabels && n.label && <text x={cx} y={height - 6} className="ts-label" fill={color}>{n.label}</text>}
                </g>
              );
            })}
            {groups.map((g, k) => {
              const xs = g.idx.map((i) => xOf(notes[i].start) + 4 + (g.up ? 5.2 : -5.2));
              const off = g.up ? 6 : -6;
              const sec: JSX.Element[] = [];
              g.idx.forEach((i, j) => {
                if (notes[i].dur > 0.25 + 1e-6) return;
                const nx = g.idx[j + 1];
                const pv = g.idx[j - 1];
                if (nx !== undefined && notes[nx].dur <= 0.25 + 1e-6) sec.push(<line key={`s${j}`} x1={xs[j]} x2={xs[j + 1]} y1={g.stemEnd + off} y2={g.stemEnd + off} stroke="#111" strokeWidth={3.4} />);
                else if (!(pv !== undefined && notes[pv].dur <= 0.25 + 1e-6)) {
                  const dir = nx !== undefined ? 1 : -1;
                  sec.push(<line key={`s${j}`} x1={xs[j]} x2={xs[j] + dir * 8} y1={g.stemEnd + off} y2={g.stemEnd + off} stroke="#111" strokeWidth={3.4} />);
                }
              });
              return <g key={`b${k}`}><line x1={xs[0]} x2={xs[xs.length - 1]} y1={g.stemEnd} y2={g.stemEnd} stroke="#111" strokeWidth={4} />{sec}</g>;
            })}
          </svg>
        );
      })}
    </div>
  );
}

function Rest({ x, top, kind }: { x: number; top: number; kind: 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth' }) {
  const y2 = top + LINE; // 4ª línea (desde abajo)
  const y3 = top + 2 * LINE; // 3ª línea
  if (kind === 'whole') return <rect x={x} y={y2} width={11} height={4.5} className="rest" />;
  if (kind === 'half') return <rect x={x} y={y3 - 4.5} width={11} height={4.5} className="rest" />;
  if (kind === 'quarter') return <path d={`M${x + 2} ${top + 3} l5 6 l-4 5 l5 6 q-6 -2 -4 5`} className="rest-stroke" />;
  if (kind === 'sixteenth') return (
    <g>
      <circle cx={x + 4} cy={y3 - 6} r="1.8" className="rest" />
      <circle cx={x + 2} cy={y3 + 1} r="1.8" className="rest" />
      <path d={`M${x + 4} ${y3 - 5} q4 1 6 -2 l-6 17 M${x + 2} ${y3 + 2} q4 1 6 -2`} className="rest-stroke" />
    </g>
  );
  return (
    <g>
      <circle cx={x + 3} cy={y3 - 2} r="2" className="rest" />
      <path d={`M${x + 3} ${y3 - 1} q4 1 6 -2 l-5 13`} className="rest-stroke" />
    </g>
  );
}

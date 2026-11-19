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
const BEAT_W = 44;

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
        // corcheas unidas por tiempo
        const beamed = new Map<number, { partner: number; up: boolean }>();
        for (let k = 0; k + 1 < inLine.length; k++) {
          const a = inLine[k];
          const b = inLine[k + 1];
          if (a.n.dur === 0.5 && b.n.dur === 0.5 && a.n.start % 1 === 0 && Math.abs(b.n.start - a.n.start - 0.5) < 1e-6) {
            const up = (a.s + b.s) / 2 < 4;
            beamed.set(a.i, { partner: b.i, up });
            beamed.set(b.i, { partner: a.i, up });
            k++;
          }
        }
        // silencios por compás
        const rests: { x: number; kind: 'whole' | 'half' | 'quarter' | 'eighth' }[] = [];
        for (let bar = fromBar; bar < fromBar + nb; bar++) {
          const bs = bar * 4;
          const occ = notes.filter((n) => n.start < bs + 4 - 1e-9 && n.start + n.dur > bs + 1e-9).map((n) => [Math.max(bs, n.start) - bs, Math.min(bs + 4, n.start + n.dur) - bs]);
          if (occ.length === 0) { rests.push({ x: x0(bar) + barW / 2 - 6, kind: 'whole' }); continue; }
          for (let t = 0; t < 4 - 1e-9; t += 0.5) {
            const free = !occ.some(([a, b]) => t + 1e-9 >= a && t < b - 1e-9);
            if (!free) continue;
            const nextFree = !occ.some(([a, b]) => t + 0.5 + 1e-9 >= a && t + 0.5 < b - 1e-9) && t + 0.5 < 4;
            if (t % 2 === 0 && [0, 0.5, 1, 1.5].every((d) => !occ.some(([a, b]) => t + d + 1e-9 >= a && t + d < b - 1e-9))) { rests.push({ x: xOf(bs + t), kind: 'half' }); t += 1.5; }
            else if (t % 1 === 0 && nextFree) { rests.push({ x: xOf(bs + t), kind: 'quarter' }); t += 0.5; }
            else rests.push({ x: xOf(bs + t), kind: 'eighth' });
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
              let stemEnd = up ? cy - 28 : cy + 28;
              if (bm) {
                const other = notes[bm.partner];
                const oy = yOf(stepOf(other.pitch));
                stemEnd = up ? Math.min(cy, oy) - 26 : Math.max(cy, oy) + 26;
              }
              const dotted = Math.abs(n.dur - 1.5) < 1e-6 || Math.abs(n.dur - 3) < 1e-6 || Math.abs(n.dur - 0.75) < 1e-6;
              const isFirstOfBeam = bm && n.start % 1 === 0;
              const isActive = active === i;
              return (
                <g key={i} className={`ts-note ${isActive ? 'active' : ''}`} onClick={() => onNoteClick?.(i)}>
                  <rect x={cx - 10} y={top - 10} width={20} height={height - top} fill="transparent" />
                  {ledgers.map((l) => <line key={l} x1={cx - 9} x2={cx + 9} y1={yOf(l)} y2={yOf(l)} className="staff-line" />)}
                  {accShown.has(i) && <text x={cx - 14} y={cy + 4.5} className="acc">{accShown.get(i)}</text>}
                  <ellipse cx={cx} cy={cy} rx="5.6" ry="4.1" transform={`rotate(-20 ${cx} ${cy})`} fill={filled ? color : '#fbfaf6'} stroke={color} strokeWidth={filled ? 1 : 1.8} className={isActive ? 'ts-active' : ''} />
                  {n.dur < 4 && <line x1={stemX} x2={stemX} y1={cy} y2={stemEnd} stroke={color} strokeWidth={1.3} />}
                  {n.dur <= 0.5 + 1e-6 && !bm && <path d={up ? `M${stemX} ${stemEnd} q 7 7 5 16` : `M${stemX} ${stemEnd} q 7 -7 5 -16`} stroke={color} strokeWidth={1.3} fill="none" />}
                  {isFirstOfBeam && (() => {
                    const o = notes[bm!.partner];
                    const ox = xOf(o.start) + 4 + (up ? 5.2 : -5.2);
                    return <line x1={stemX} x2={ox} y1={stemEnd} y2={stemEnd} stroke="#111" strokeWidth={4} />;
                  })()}
                  {dotted && <circle cx={cx + 9} cy={cy - (s % 2 === 0 ? 3 : 0)} r="1.6" fill={color} />}
                  {showLabels && n.label && <text x={cx} y={height - 6} className="ts-label" fill={color}>{n.label}</text>}
                </g>
              );
            })}
          </svg>
        );
      })}
    </div>
  );
}

function Rest({ x, top, kind }: { x: number; top: number; kind: 'whole' | 'half' | 'quarter' | 'eighth' }) {
  const y2 = top + LINE; // 4ª línea (desde abajo)
  const y3 = top + 2 * LINE; // 3ª línea
  if (kind === 'whole') return <rect x={x} y={y2} width={11} height={4.5} className="rest" />;
  if (kind === 'half') return <rect x={x} y={y3 - 4.5} width={11} height={4.5} className="rest" />;
  if (kind === 'quarter') return <path d={`M${x + 2} ${top + 3} l5 6 l-4 5 l5 6 q-6 -2 -4 5`} className="rest-stroke" />;
  return (
    <g>
      <circle cx={x + 3} cy={y3 - 2} r="2" className="rest" />
      <path d={`M${x + 3} ${y3 - 1} q4 1 6 -2 l-5 13`} className="rest-stroke" />
    </g>
  );
}

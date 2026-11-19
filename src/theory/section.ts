// Utilidades para trabajar con fragmentos de una progresión (frases, "repite después de mí", vocabulario).
import { chordSymbol } from './chords';
import { ChordEvent, keyInterval, parseChart, transposeEvents } from './progressions';
import { Note } from './notes';
import { LineNote, chordStarts } from './line';

/** Recorta la progresión al intervalo [from, to) (en tiempos), renumerando compases desde 0. */
export function sliceEvents(evts: ChordEvent[], from: number, to: number): ChordEvent[] {
  const st = chordStarts(evts);
  const out: ChordEvent[] = [];
  evts.forEach((e, i) => {
    const a = Math.max(from, st[i]);
    const b = Math.min(to, st[i] + e.beats);
    if (b - a > 1e-9) out.push({ ...e, beats: b - a, bar: Math.floor((a - from) / 4 + 1e-9) });
  });
  return out;
}

/** Repite una progresión n veces seguidas (compases consecutivos). */
export function repeatEvents(evts: ChordEvent[], times: number): ChordEvent[] {
  const bars = Math.ceil(evts.reduce((s, e) => s + e.beats, 0) / 4);
  const out: ChordEvent[] = [];
  for (let k = 0; k < times; k++) evts.forEach((e) => out.push({ ...e, bar: e.bar + k * bars }));
  return out;
}

export const sliceLine = (notes: LineNote[], from: number, to: number) =>
  notes.filter((n) => n.start >= from - 1e-9 && n.start < to - 1e-9).map((n) => ({ ...n, start: n.start - from, dur: Math.min(n.dur, to - n.start) }));

/** Serializa a cifrado tipo "Dm7 G7 | Cmaj7 |" (para guardar en el vocabulario). */
export function eventsToChart(evts: ChordEvent[]): string {
  const bars: string[][] = [];
  evts.forEach((e) => (bars[e.bar] ??= []).push(chordSymbol(e.chord)));
  return bars.map((b) => (b ?? []).join(' ')).join(' | ') + ' |';
}

/** Lleva una línea + su armonía a otra tonalidad, eligiendo la octava más cercana al rango deseado. */
export function transposeLineTo(notes: LineNote[], chart: string, fromKey: Note, toKey: Note, range: { lo: number; hi: number }) {
  const iv = keyInterval(fromKey, toKey);
  const events = transposeEvents(parseChart(chart), iv);
  let shifted = notes.map((n) => ({ ...n, midi: n.midi + iv.semitones }));
  const center = (range.lo + range.hi) / 2;
  const avg = shifted.reduce((s, n) => s + n.midi, 0) / Math.max(1, shifted.length);
  const oct = Math.round((center - avg) / 12) * 12;
  shifted = shifted.map((n) => ({ ...n, midi: n.midi + oct }));
  return { events, notes: shifted };
}

/** Lleva notas a un rango moviendo la frase entera por octavas (conserva el contorno). */
export function fitLine(notes: LineNote[], range: { lo: number; hi: number }): LineNote[] {
  if (!notes.length) return notes;
  const center = (range.lo + range.hi) / 2;
  const avg = notes.reduce((s, n) => s + n.midi, 0) / notes.length;
  const oct = Math.round((center - avg) / 12) * 12;
  return notes.map((n) => ({ ...n, midi: n.midi + oct }));
}

// Digitaciones de guitarra para una línea (escala o arpegio): en qué cuerda y traste se toca cada nota dentro
// de una posición de la mano (4 trastes + 1 de estiramiento). Sirve para iluminar en el diapasón solo las
// notas por donde pasa lo que suena, en lugar de todas las repeticiones de esas notas en el mástil.
import { GUITAR_TUNING_MIDI } from './instruments';

export interface FretPos { string: number; fret: number }
export interface Fingering {
  /** traste más bajo y más alto usados (para nombrar la posición) */
  from: number;
  to: number;
  /** posición de cada altura MIDI de la línea */
  at: Map<number, FretPos>;
}

/** Coloca las notas (ascendentes) en una posición que empieza en el traste `p`. */
function place(ms: number[], p: number, maxFret: number): Map<number, FretPos> | null {
  const span = p === 0 ? 4 : 3; // en posición abierta las cuerdas al aire ayudan
  const hi = Math.min(maxFret, p + span + 1); // +1 = estiramiento del meñique o del índice
  const at = new Map<number, FretPos>();
  let s = 0;
  for (const m of ms) {
    let pick: FretPos | null = null;
    for (let k = s; k < 6; k++) {
      const f = m - GUITAR_TUNING_MIDI[k];
      if (f < p || f > hi) continue;
      // si en esta cuerda haría falta estirar y en la siguiente cabe cómodo, se cambia de cuerda
      if (f > p + span && k + 1 < 6) {
        const f2 = m - GUITAR_TUNING_MIDI[k + 1];
        if (f2 >= p && f2 <= p + span) { pick = { string: k + 1, fret: f2 }; break; }
      }
      pick = { string: k, fret: f };
      break;
    }
    if (!pick) return null;
    at.set(m, pick);
    s = pick.string;
  }
  return at;
}

/** Posiciones posibles para tocar la línea, de la más grave a la más aguda del mástil. */
export function guitarFingerings(midis: number[], maxFret = 15): Fingering[] {
  const ms = [...new Set(midis)].sort((a, b) => a - b);
  if (!ms.length || ms[0] < GUITAR_TUNING_MIDI[0]) return [];
  const out: Fingering[] = [];
  const seen = new Set<string>();
  for (let p = 0; p <= maxFret - 3; p++) {
    const at = place(ms, p, maxFret);
    if (!at) continue;
    const key = ms.map((m) => `${at.get(m)!.string}:${at.get(m)!.fret}`).join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    const frets = [...at.values()].map((x) => x.fret);
    const from = Math.min(...frets);
    const to = Math.max(...frets);
    // descarta digitaciones casi iguales a otra ya elegida (la mitad o más de las notas en el mismo lugar)
    const same = (o: Fingering) => ms.filter((m) => { const a = o.at.get(m)!; const b = at.get(m)!; return a.string === b.string && a.fret === b.fret; }).length;
    if (out.some((o) => same(o) * 2 >= ms.length)) continue;
    out.push({ from, to, at });
  }
  return out;
}

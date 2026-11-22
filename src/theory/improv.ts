// Generador de solos de ejemplo, explicados frase a frase. Todo el material es original y generado
// a partir de reglas de lenguaje jazzístico (notas guía, aproximaciones, enclosures, arpegios,
// motivos, pregunta-respuesta), sobre CUALQUIER progresión y tonalidad.
import { rng } from '../audio/rng';
import { Chord, chordNotes, chordSymbol } from './chords';
import { ChordEvent } from './progressions';
import { IV, Note, noteName, pc, pitchFromMidi, transposeNote } from './notes';
import { scaleById, scaleNotes } from './scales';
import { LineNote, chordStarts, spellApproach } from './line';

export type IdeaId = 'guide' | 'targets' | 'arpeggios' | 'motif' | 'blues' | 'space' | 'bebop';

export interface Idea {
  id: IdeaId;
  name: string;
  short: string;
  method: string; // de dónde viene la idea (pedagogía)
  constraint: string; // reto para "tu turno"
  needsBlues?: boolean;
}

export const IDEAS: Idea[] = [
  { id: 'guide', name: 'Notas guía', short: 'Solo 3ªs y 7ªs, unidas por el movimiento más corto.', method: 'Esqueleto armónico usado por casi todos los métodos de jazz (líneas de notas guía): define cada acorde con dos notas.', constraint: 'Toca solo 3ªs y 7ªs, en blancas o redondas. Que cada cambio de acorde se oiga en tu línea.' },
  { id: 'targets', name: 'Líneas a notas objetivo', short: 'Corcheas que llegan a la 3ª o 7ª del acorde nuevo en el tiempo 1.', method: 'Notas guía adornadas con aproximaciones y enclosures (resoluciones entre acordes, como en los "outlines" de Bert Ligon).', constraint: 'Elige la 3ª de cada acorde como objetivo y llega a ella en el tiempo 1, desde medio tono abajo.' },
  { id: 'arpeggios', name: 'Arpegios desde la 3ª', short: '3-5-7-9 de cada acorde: suena "dentro" y moderno.', method: 'Arpegio desde la 3ª = acorde superior (Dm7 → Fmaj7): recurso clásico de líneas jazzísticas.', constraint: 'Arpegia cada acorde empezando por su 3ª y conecta con el siguiente por grado conjunto.' },
  { id: 'motif', name: 'Motivo y desarrollo', short: 'Una idea de 3–4 notas que se repite, se adapta y se transforma.', method: 'Improvisación temática: repetir, secuenciar, desplazar y extender un motivo.', constraint: 'Inventa un motivo de 3 notas y úsalo toda la vuelta: repítelo, cámbiale el final y desplázalo un tiempo.' },
  { id: 'blues', name: 'Pregunta y respuesta (blues)', short: 'Frases de pentatónica/escala blues con estructura AAB.', method: 'Lenguaje del blues: llamada y respuesta, la misma frase sobre I7 y IV7, respuesta que resuelve.', constraint: 'Pregunta de 2 compases, silencio de 2. Repite la pregunta sobre el IV7 y responde en los compases 9–10.', needsBlues: true },
  { id: 'space', name: 'Ritmo y espacio', short: 'Pocas notas, contratiempos y anticipaciones.', method: 'Fraseo rítmico (Hal Crook): empezar frases en cualquier tiempo o contratiempo y dejar espacio.', constraint: 'Máximo 4 notas cada 2 compases. Empieza cada frase en un contratiempo distinto.' },
  { id: 'bebop', name: 'Bebop', short: 'Líneas largas en corcheas con enclosures y escala bebop.', method: 'Vocabulario bebop: notas del acorde en tiempo fuerte, cromatismos en tiempo débil, enclosures.', constraint: 'Una línea de corcheas continua de 2 compases que caiga en una nota del acorde en cada tiempo 1 y 3.' },
];
export const ideaById = (id: IdeaId) => IDEAS.find((i) => i.id === id)!;

export interface Namer { note: (n: Note) => string; chord: (c: Chord) => string }
const DEFAULT_NAMER: Namer = { note: (n) => noteName(n, true), chord: (c) => chordSymbol(c) };
let NM: Namer = DEFAULT_NAMER;

export interface SoloRequest {
  /** cómo nombrar notas y acordes en las explicaciones (p. ej. transpuestos para saxo) */
  names?: Namer;
  events: ChordEvent[];
  keyRoot: Note;
  minor?: boolean;
  blues: boolean;
  range: { lo: number; hi: number };
  level: 1 | 2 | 3;
  seed: number;
  idea: IdeaId;
}
export interface SoloPhrase { start: number; end: number; title: string; text: string }
export interface Solo { idea: IdeaId; title: string; summary: string; notes: LineNote[]; phrases: SoloPhrase[] }

// ---------------------------------------------------------------- utilidades
interface Seg { i: number; start: number; end: number; chord: Chord; bar: number }
const segsOf = (evts: ChordEvent[]): Seg[] => {
  const st = chordStarts(evts);
  return evts.map((e, i) => ({ i, start: st[i], end: st[i] + e.beats, chord: e.chord, bar: e.bar }));
};
const segAt = (segs: Seg[], b: number) => segs.find((s) => b >= s.start - 1e-9 && b < s.end - 1e-9) ?? segs[segs.length - 1];
const mod12 = (n: number) => ((n % 12) + 12) % 12;
const sym = (c: Chord) => NM.chord(c);
const nn = (m: number, c?: Chord) => {
  if (c) {
    const hit = [...chordNotes(c), ...['9', '13', 'b9', '11'].map((d) => transposeNote(c.root, IV[d]))].find((x) => pc(x) === mod12(m));
    if (hit) return NM.note(hit);
  }
  return NM.note(pitchFromMidi(m));
};

function rolePc(c: Chord, role: string): number {
  const degs = c.quality.degrees;
  const notes = chordNotes(c);
  const find = (cands: string[]) => {
    const i = degs.findIndex((d) => cands.includes(d));
    return i >= 0 ? pc(notes[i]) : null;
  };
  switch (role) {
    case '1': return pc(c.root);
    case '3': return find(['3', 'b3', '4', '2']) ?? pc(c.root);
    case '5': return find(['5', 'b5', '#5']) ?? pc(transposeNote(c.root, IV['5']));
    case '7': return find(['7', 'b7', 'bb7', '6']) ?? pc(transposeNote(c.root, c.quality.id === 'maj' ? IV['7'] : IV.b7));
    case '9': return pc(transposeNote(c.root, c.quality.id === '7b9' ? IV.b9 : c.quality.id === 'm7b5' ? IV['11'] : IV['9']));
    case '13': return pc(transposeNote(c.root, c.quality.id === 'm7b5' ? IV.b13 : IV['13']));
  }
  return pc(c.root);
}
const guidePcs = (c: Chord) => [rolePc(c, '3'), rolePc(c, '7')];
const tonePcs = (c: Chord) => chordNotes(c).slice(0, 4).map(pc);
function scalePcsOf(c: Chord, req: SoloRequest): number[] {
  if (req.blues && ['7', '9', '13'].includes(c.quality.id)) return scaleNotes(c.root, scaleById('mixolydian')).map(pc);
  const id = c.quality.scales[0]?.id ?? 'major';
  return scaleNotes(c.root, scaleById(id)).map(pc);
}

export function nearestPc(pcs: number[], ref: number, lo: number, hi: number, dir = 0, avoidSame = false): number {
  let best = ref;
  let bd = Infinity;
  for (let m = lo; m <= hi; m++) {
    if (!pcs.includes(mod12(m))) continue;
    if (avoidSame && m === ref) continue;
    if (dir > 0 && m < ref) continue;
    if (dir < 0 && m > ref) continue;
    const d = Math.abs(m - ref);
    if (d < bd) { bd = d; best = m; }
  }
  if (bd < Infinity) return best;
  // sin candidatos: primero se relaja la dirección, luego «distinta de la actual» y por último el rango
  if (dir !== 0) return nearestPc(pcs, ref, lo, hi, 0, avoidSame);
  if (avoidSame) return nearestPc(pcs, ref, lo, hi, 0, false);
  if (!pcs.length || hi - lo > 48) return ref;
  return nearestPc(pcs, ref, lo - 12, hi + 12, 0, false);
}
export function step(m: number, pcs: number[], dir: number, lo: number, hi: number): number {
  for (let k = m + dir; k >= lo - 12 && k <= hi + 12; k += dir) if (pcs.includes(mod12(k))) return k;
  return m;
}

function finalize(notes: LineNote[], total: number, range: { lo: number; hi: number }): LineNote[] {
  const s = notes
    .filter((n) => n.start >= 0 && n.start < total - 1e-9)
    .map((n) => ({ ...n, midi: fold(n.midi, range) }))
    .sort((a, b) => a.start - b.start);
  for (let i = 0; i < s.length; i++) {
    const nx = s[i + 1];
    if (nx && s[i].start + s[i].dur > nx.start) s[i].dur = Math.max(0.25, nx.start - s[i].start);
    if (s[i].start + s[i].dur > total) s[i].dur = total - s[i].start;
  }
  // eliminar duplicados en el mismo instante
  return s.filter((n, i) => i === 0 || Math.abs(n.start - s[i - 1].start) > 1e-6);
}
function fold(m: number, r: { lo: number; hi: number }) {
  while (m < r.lo) m += 12;
  while (m > r.hi) m -= 12;
  return m;
}

// ---------------------------------------------------------------- generadores
function genGuide(req: SoloRequest): Solo {
  const segs = segsOf(req.events);
  const { lo, hi } = req.range;
  let cur = Math.round((lo + hi) / 2) + 2;
  const notes: LineNote[] = [];
  const steps: string[] = [];
  segs.forEach((s, k) => {
    const g = guidePcs(s.chord);
    // nota guía más cercana a la anterior (preferir movimiento de 0–2 semitonos)
    const first = nearestPc(g, cur, lo + 2, hi - 2);
    const beats = s.end - s.start;
    const two = req.level >= 2 && beats >= 4;
    notes.push({ midi: first, start: s.start, dur: two ? 2 : beats - (k % 4 === 3 ? 1 : 0), tech: 'guía' });
    let last = first;
    if (two) {
      const other = nearestPc(g.filter((x) => x !== mod12(first)), first, lo + 2, hi - 2);
      notes.push({ midi: other, start: s.start + 2, dur: 1.5, tech: 'guía' });
      last = other;
    }
    const nxt = segs[k + 1];
    if (nxt) {
      const target = nearestPc(guidePcs(nxt.chord), last, lo + 2, hi - 2);
      const d = target - last;
      const what = (m: number, c: Chord) => (mod12(m) === rolePc(c, '3') ? '3ª' : '7ª');
      if (Math.abs(d) <= 2) steps.push(`${nn(last, s.chord)} (${what(last, s.chord)} de ${sym(s.chord)}) → ${nn(target, nxt.chord)} (${what(target, nxt.chord)} de ${sym(nxt.chord)}): ${d === 0 ? 'nota común, se mantiene' : `se mueve ${Math.abs(d) === 1 ? 'medio tono' : 'un tono'}`}`);
    }
    cur = last;
  });
  const total = segs[segs.length - 1].end;
  const phrases = blockPhrases(segs, (from, to) => steps.filter((_, i) => segs[i].start >= from && segs[i].start < to).slice(0, 4).join('. ') || 'Notas guía de cada acorde.', 'Notas guía');
  return { idea: 'guide', title: 'Línea de notas guía', summary: 'Solo 3ªs y 7ªs. Observa que casi nunca hay saltos: la 7ª de un acorde suele bajar medio tono a la 3ª del siguiente (o mantenerse). Esa línea "canta" la armonía aunque no suene nada más.', notes: finalize(notes, total, req.range), phrases };
}

/** Bloques de 4 compases con un texto por bloque. */
function blockPhrases(segs: Seg[], text: (from: number, to: number) => string, title: string): SoloPhrase[] {
  const total = segs[segs.length - 1].end;
  const out: SoloPhrase[] = [];
  for (let b = 0; b < total; b += 16) out.push({ start: b, end: Math.min(total, b + 16), title: `${title} · compases ${b / 4 + 1}–${Math.min(total, b + 16) / 4}`, text: text(b, b + 16) });
  return out;
}

type Approach = 'below' | 'above' | 'enclosure' | 'double';
const APPROACH_NAME: Record<Approach, string> = { below: 'aproximación cromática desde abajo', above: 'nota de la escala desde arriba', enclosure: 'enclosure (arriba + abajo)', double: 'doble cromatismo desde abajo' };

function approachNotes(kind: Approach, target: number, scalePcs: number[]): number[] {
  const above = step(target, scalePcs, 1, 0, 127);
  switch (kind) {
    case 'below': return [target - 1];
    case 'above': return [above];
    case 'enclosure': return [above, target - 1];
    case 'double': return [target - 2, target - 1];
  }
}

/** Relleno en corcheas desde `from` hacia `goal` en k notas: elige la forma que acaba más cerca del objetivo. */
export function fillPath(from: number, goal: number, k: number, scalePcs: number[], tones: number[], r: () => number, lo: number, hi: number): number[] {
  if (k <= 0) return [];
  const cands: number[][] = [];
  for (const d of [1, -1]) {
    const run: number[] = []; let m = from;
    for (let j = 0; j < k; j++) { m = step(m, scalePcs, d, lo, hi); run.push(m); }
    cands.push(run);
    for (let a = 1; a < k; a++) {
      const arp: number[] = []; let x = from;
      for (let j = 0; j < a; j++) { x = step(x, tones, d, lo, hi); arp.push(x); }
      for (let j = a; j < k; j++) { x = step(x, scalePcs, -d, lo, hi); arp.push(x); }
      cands.push(arp);
    }
  }
  let best = cands[0]; let bs = Infinity;
  for (const c of cands) {
    const end = c[c.length - 1];
    const dd = Math.abs(end - goal);
    let s = dd === 0 ? 2 : dd <= 2 ? dd * 0.5 : dd;
    s += c.filter((m) => m < lo || m > hi).length * 6;
    c.forEach((m, j) => { if (j % 2 === 1 && !tones.includes(mod12(m))) s += 0.6; }); // tiempos fuertes: notas del acorde
    s += r() * 0.8;
    if (s < bs) { bs = s; best = c; }
  }
  return best;
}

function genTargets(req: SoloRequest, bebop: boolean): Solo {
  const r = rng(req.seed);
  const segs = segsOf(req.events);
  const total = segs[segs.length - 1].end;
  const { lo, hi } = req.range;
  const notes: LineNote[] = [];
  const phrases: SoloPhrase[] = [];
  const blockBars = 4;
  const activeBars = bebop || req.level >= 3 ? 3 : 2;
  let ref = Math.round((lo + hi) / 2);
  const approaches: Approach[] = req.level === 1 ? ['below', 'below', 'above'] : bebop ? ['enclosure', 'below', 'double', 'enclosure', 'above'] : ['below', 'enclosure', 'above', 'below'];
  for (let blk = 0; blk * blockBars * 4 < total; blk++) {
    const A = blk * blockBars * 4;
    const B = Math.min(total, A + activeBars * 4);
    if (A >= total) break;
    const texts: string[] = [];
    // objetivo inicial
    const s0 = segAt(segs, A);
    let cur = nearestPc(guidePcs(s0.chord), ref, lo + 3, hi - 3);
    const startOff = r() < 0.35 && req.level > 1 ? 0.5 : 0;
    notes.push({ midi: cur, start: A + startOff, dur: 0.5, tech: 'objetivo' });
    texts.push(`Empieza en ${nn(cur, s0.chord)}, ${mod12(cur) === rolePc(s0.chord, '3') ? '3ª' : '7ª'} de ${sym(s0.chord)}`);
    let t = A + startOff + 0.5;
    // fronteras de acorde dentro del bloque activo + aterrizaje en B
    const bounds = segs.filter((s) => s.start > A && s.start <= B).map((s) => s.start);
    if (!bounds.includes(B) && B < total) bounds.push(B);
    for (const bnd of bounds) {
      const segNow = segAt(segs, t);
      const tgtSeg = segAt(segs, Math.min(bnd, total - 0.01));
      const target = nearestPc(guidePcs(tgtSeg.chord), cur + (r() < 0.5 ? -2 : 2), lo + 3, hi - 3);
      const kind = approaches[Math.floor(r() * approaches.length)];
      const scale = scalePcsOf(segNow.chord, req);
      const appr = approachNotes(kind, target, scale);
      const slots = Math.round((bnd - t) / 0.5);
      const k = slots - appr.length;
      let path: number[];
      if (bebop && ['7', '9', '13', '7b9'].includes(segNow.chord.quality.id) && k >= 4) {
        // escala bebop descendente desde una nota del acorde
        const beb = [...scalePcs(segNow.chord), mod12(pc(segNow.chord.root) + 11)];
        const startTone = nearestPc(tonePcs(segNow.chord), cur + 1, lo + 4, hi - 1, 1);
        // la escala bebop solo funciona si la nota del acorde cae en tiempo fuerte:
        // si empezamos a contratiempo, entramos con un cromatismo desde arriba
        const off = Math.abs((t % 1) - 0.5) < 1e-6;
        path = off ? [startTone + 1, startTone] : [startTone];
        while (path.length < k) path.push(step(path[path.length - 1], beb, -1, lo, hi));
        path = path.slice(0, k);
        texts.push(`Sobre ${sym(segNow.chord)}: escala bebop descendente desde ${nn(startTone, segNow.chord)} (con la 7ª mayor de paso, las notas del acorde caen en los tiempos)`);
      } else path = fillPath(cur, appr[0], k, scale, tonePcs(segNow.chord), r, lo, hi);
      const isBeb = bebop && ['7', '9', '13', '7b9'].includes(segNow.chord.quality.id) && k >= 4;
      const majSeventh = mod12(pc(segNow.chord.root) + 11);
      [...path, ...appr].forEach((m, j) => notes.push({
        midi: m, start: t + j * 0.5, dur: 0.5,
        tech: j >= path.length ? kind : isBeb && j === 0 && Math.abs((t % 1) - 0.5) < 1e-6 ? 'above' : isBeb && mod12(m) === majSeventh ? 'bebop' : 'línea',
      }));
      const landDur = bnd === B ? (req.level === 1 ? 2 : 1.5) : 0.5;
      notes.push({ midi: target, start: bnd, dur: Math.min(landDur, total - bnd), tech: 'objetivo' });
      texts.push(`a ${nn(target, tgtSeg.chord)} (${mod12(target) === rolePc(tgtSeg.chord, '3') ? '3ª' : '7ª'} de ${sym(tgtSeg.chord)}) con ${APPROACH_NAME[kind]} ${appr.map((m) => NM.note(spellApproach(m, target))).join('–')}`);
      cur = target;
      t = bnd + 0.5;
    }
    // anacrusa hacia el siguiente bloque
    const nextA = A + blockBars * 4;
    if (nextA < total && req.level >= 2) {
      const ns = segAt(segs, nextA);
      const tgt = nearestPc(guidePcs(ns.chord), cur, lo + 3, hi - 3);
      notes.push({ midi: tgt - 1, start: nextA - 0.5, dur: 0.5, tech: 'below' });
    }
    ref = cur;
    phrases.push({ start: A, end: Math.min(total, B + 2), title: `Frase ${blk + 1} · compases ${A / 4 + 1}–${Math.min(total, B + 2) / 4 | 0}`, text: texts.join('; ') + '. Luego respira: el silencio también es parte de la frase.' });
  }
  return {
    idea: bebop ? 'bebop' : 'targets',
    title: bebop ? 'Línea bebop' : 'Líneas hacia notas objetivo',
    summary: bebop
      ? 'Corcheas continuas: notas del acorde en tiempo fuerte y cromatismos en tiempo débil. Cada cambio de acorde se "anuncia" con un enclosure o una aproximación.'
      : 'Cada frase va de nota guía a nota guía. Las corcheas intermedias son de la escala del acorde; justo antes del cambio, una aproximación (cromática, desde arriba o un enclosure) "apunta" a la 3ª o 7ª del acorde nuevo, que cae en el tiempo 1.',
    notes: finalize(notes, total, req.range),
    phrases,
  };
}
const scalePcs = (c: Chord) => scaleNotes(c.root, scaleById('mixolydian')).map(pc);

function arpRoles(c: Chord): string[] {
  const q = c.quality.id;
  if (q === 'm7b5' || q === 'dim7') return ['3', '5', '7', '1'];
  if (['maj', 'm', 'dim', 'aug', 'sus2', 'sus4'].includes(q)) return ['3', '5', '1', '9'];
  return ['3', '5', '7', '9'];
}
function genArpeggios(req: SoloRequest): Solo {
  const r = rng(req.seed);
  const segs = segsOf(req.events);
  const total = segs[segs.length - 1].end;
  const { lo, hi } = req.range;
  const notes: LineNote[] = [];
  const texts = new Map<number, string[]>();
  let cur = Math.round((lo + hi) / 2) - 2;
  segs.forEach((s, k) => {
    const roles = arpRoles(s.chord);
    const pcs = roles.map((x) => rolePc(s.chord, x));
    const beats = s.end - s.start;
    const restBar = req.level === 1 ? s.bar % 2 === 1 : s.bar % 4 === 3;
    // ascendente desde la 3ª si cabe; si no, descendente desde arriba
    let first = nearestPc([pcs[0]], cur, lo, hi);
    let up = true;
    const tops: number[] = [first];
    for (let j = 1; j < 4; j++) tops.push(nearestPc([pcs[j]], tops[j - 1], tops[j - 1] + 1, tops[j - 1] + 12, 1));
    let arp = tops;
    if (tops[3] > hi - 1) {
      up = false;
      first = nearestPc([pcs[3]], cur, lo, hi);
      arp = [first];
      for (let j = 2; j >= 0; j--) arp.push(nearestPc([pcs[j]], arp[arp.length - 1], arp[arp.length - 1] - 12, arp[arp.length - 1] - 1, -1));
    }
    const rhythm = req.level === 1 ? 1 : 0.5;
    const n = Math.min(4, Math.floor(beats / rhythm));
    arp.slice(0, n).forEach((m, j) => notes.push({ midi: m, start: s.start + j * rhythm, dur: rhythm, tech: 'arpegio' }));
    let last = arp[n - 1];
    const used = n * rhythm;
    const nxt = segs[k + 1];
    if (!restBar && nxt && beats - used >= 1) {
      const goal = nearestPc([rolePc(nxt.chord, '3')], last, lo, hi);
      const k2 = Math.round((beats - used) / 0.5);
      const path = fillPath(last, goal + (goal > last ? -1 : 1), k2, scalePcsOf(s.chord, req), tonePcs(s.chord), r, lo, hi);
      path.forEach((m, j) => notes.push({ midi: m, start: s.start + used + j * 0.5, dur: 0.5, tech: 'escala' }));
      last = path[path.length - 1] ?? last;
    }
    cur = last;
    const sup = roles.join('-') === '3-5-7-9' ? ` = arpegio de ${nn(arp[up ? 0 : 3], s.chord)}${s.chord.quality.id === 'm7' ? 'maj7' : s.chord.quality.id === 'maj7' ? 'm7' : s.chord.quality.id.startsWith('7') || ['9', '13'].includes(s.chord.quality.id) ? 'm7b5' : ''} sobre ${sym(s.chord)}` : '';
    const blk = Math.floor(s.start / 16);
    texts.set(blk, [...(texts.get(blk) ?? []), `${sym(s.chord)}: ${roles.join('-')} ${up ? '↑' : '↓'} (${arp.map((m) => nn(m, s.chord)).join(' ')})${sup}`]);
  });
  const phrases: SoloPhrase[] = [];
  for (const [blk, t] of texts) phrases.push({ start: blk * 16, end: Math.min(total, blk * 16 + 16), title: `Compases ${blk * 4 + 1}–${Math.min(total, blk * 16 + 16) / 4}`, text: t.join(' · ') });
  return { idea: 'arpeggios', title: 'Arpegios desde la 3ª', summary: 'Empezar el arpegio en la 3ª (3-5-7-9) evita la fundamental, que ya toca el bajo, y añade la 9ª: suena a jazz al instante. Fíjate en que 3-5-7-9 de un acorde es otro acorde completo (el "acorde superior").', notes: finalize(notes, total, req.range), phrases };
}

interface Motif { rhythm: [number, number][]; roles: string[]; name: string }
const MOTIFS: Motif[] = [
  { rhythm: [[0, 0.5], [0.5, 0.5], [1, 1.5]], roles: ['5', '3', '1'], name: '5-3-1 (descendente)' },
  { rhythm: [[0.5, 0.5], [1, 0.5], [1.5, 1.5]], roles: ['3', '5', '9'], name: '3-5-9 (ascendente, con tensión)' },
  { rhythm: [[0, 1], [1, 0.5], [1.5, 1.5]], roles: ['7', '5', '3'], name: '7-5-3' },
  { rhythm: [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 1.5]], roles: ['5', '13', '5', '3'], name: '5-13-5-3 (bordado)' },
];
function genMotif(req: SoloRequest): Solo {
  const r = rng(req.seed);
  const segs = segsOf(req.events);
  const total = segs[segs.length - 1].end;
  const { lo, hi } = req.range;
  const motif = MOTIFS[Math.floor(r() * MOTIFS.length)];
  const notes: LineNote[] = [];
  const phrases: SoloPhrase[] = [];
  let anchor = Math.round((lo + hi) / 2);
  const place = (at: number, roles: string[], rhythm: [number, number][], tech: string) => {
    let prev = anchor;
    const out: number[] = [];
    rhythm.forEach(([o, d], j) => {
      const s = segAt(segs, at + o);
      const m = nearestPc([rolePc(s.chord, roles[j])], prev, lo + 1, hi - 1);
      notes.push({ midi: m, start: at + o, dur: d, tech });
      out.push(m);
      prev = m;
    });
    anchor = out[0];
    return out;
  };
  const totalBars = total / 4;
  for (let bar = 0; bar < totalBars; bar++) {
    const at = bar * 4;
    const s = segAt(segs, at);
    const block = Math.floor(bar / 4);
    const pos = bar % 4;
    const roles = block % 2 === 1 && req.level > 1 ? [...motif.roles.slice(0, -1), motif.roles[motif.roles.length - 1] === '9' ? '7' : '9'] : motif.roles;
    let txt = '';
    if (pos === 0) {
      const ms = place(at, roles, motif.rhythm, 'motivo');
      txt = block === 0 ? `Exposición del motivo ${motif.name} sobre ${sym(s.chord)}: ${ms.map((m) => nn(m, s.chord)).join('–')}.` : `Vuelve el motivo${roles !== motif.roles ? ' con el final cambiado a otra nota del acorde/tensión (variación)' : ''}: ${ms.map((m) => nn(m, s.chord)).join('–')} sobre ${sym(s.chord)}.`;
    } else if (pos === 1) {
      const ms = place(at, roles, motif.rhythm, 'motivo');
      txt = `Repetición adaptada a ${sym(s.chord)}: mismas funciones (${roles.join('-')}), ahora ${ms.map((m) => nn(m, s.chord)).join('–')}. Mismo ritmo + misma forma = el oyente reconoce la idea.`;
    } else if (pos === 2) {
      if (req.level === 1) { txt = 'Silencio: deja que la idea respire.'; }
      else {
        const shifted = motif.rhythm.map(([o, d]) => [o + 1, d] as [number, number]).filter(([o]) => o < 4);
        const ms = place(at, roles, shifted, 'desplazado');
        txt = `Desplazamiento rítmico: el motivo empieza un tiempo más tarde (${ms.map((m) => nn(m)).join('–')}). Mismas notas, otro acento.`;
      }
    } else {
      const nextS = segAt(segs, Math.min(total - 0.01, at + 4));
      if (req.level >= 2 && at + 4 < total) {
        const head = place(at, roles.slice(0, 2), motif.rhythm.slice(0, 2), 'extensión');
        const tgt = nearestPc([rolePc(nextS.chord, '3')], head[head.length - 1], lo + 1, hi - 1);
        const k = Math.round((4 - (motif.rhythm[1][0] + 0.5)) / 0.5) - 1;
        const path = fillPath(head[head.length - 1], tgt + (tgt > head[1] ? -1 : 1), Math.max(0, k), scalePcsOf(s.chord, req), tonePcs(s.chord), r, lo, hi);
        path.forEach((m, j) => notes.push({ midi: m, start: at + motif.rhythm[1][0] + 0.5 + j * 0.5, dur: 0.5, tech: 'extensión' }));
        txt = `Extensión: empieza como el motivo y continúa en corcheas hasta ${nn(tgt, nextS.chord)}, 3ª de ${sym(nextS.chord)} (compás siguiente).`;
      } else txt = 'Silencio.';
    }
    const blockStart = block * 16;
    let ph = phrases.find((p) => p.start === blockStart);
    if (!ph) { ph = { start: blockStart, end: Math.min(total, blockStart + 16), title: `Bloque ${block + 1} · compases ${block * 4 + 1}–${Math.min(totalBars, block * 4 + 4)}`, text: '' }; phrases.push(ph); }
    ph.text += `${ph.text ? ' ' : ''}C${bar + 1}: ${txt}`;
  }
  return { idea: 'motif', title: 'Motivo y desarrollo', summary: `Una sola idea (${motif.name}) desarrollada: exposición, repetición adaptada al acorde, desplazamiento y extensión. Es lo que hace que un solo "cuente una historia" en lugar de encadenar notas.`, notes: finalize(notes, total, req.range), phrases };
}

type Cell = [string, number, number, number][];
const CALLS: Cell[] = [
  [['5', 0, 0, 0.5], ['b7', 0, 0.5, 0.5], ['1', 1, 1, 1.5], ['b7', 0, 3, 0.5], ['5', 0, 3.5, 1]],
  [['b3', 0, 0.5, 0.5], ['3', 0, 1, 0.5], ['5', 0, 1.5, 0.5], ['b7', 0, 2, 1], ['5', 0, 3, 0.5], ['b3', 0, 3.5, 0.5], ['1', 0, 4, 2]],
  [['1', 1, 0, 1], ['b7', 0, 1, 0.5], ['5', 0, 1.5, 0.5], ['b5', 0, 2, 0.5], ['4', 0, 2.5, 0.5], ['b3', 0, 3, 0.5], ['1', 0, 3.5, 2]],
  [['1', 0, 0, 0.5], ['b3', 0, 0.5, 0.5], ['4', 0, 1, 0.5], ['b3', 0, 1.5, 0.5], ['1', 0, 2, 1], ['b7', -1, 3, 0.5], ['1', 0, 3.5, 1.5]],
];
const ANSWERS: Cell[] = [
  [['4', 0, 0, 0.5], ['b5', 0, 0.5, 0.5], ['4', 0, 1, 0.5], ['b3', 0, 1.5, 0.5], ['1', 0, 2, 0.5], ['b7', -1, 2.5, 0.5], ['5', -1, 3, 1], ['1', 0, 4, 2]],
  [['b7', 0, 0.5, 0.5], ['1', 1, 1, 0.5], ['b7', 0, 1.5, 0.5], ['5', 0, 2, 0.5], ['b3', 0, 2.5, 0.5], ['1', 0, 3, 2]],
  [['5', 0, 0, 1], ['b3', 0, 1, 0.5], ['3', 0, 1.5, 1.5], ['1', 0, 3, 1.5]],
];
function genBlues(req: SoloRequest): Solo {
  const r = rng(req.seed);
  const segs = segsOf(req.events);
  const total = segs[segs.length - 1].end;
  const bars = total / 4;
  const { lo, hi } = req.range;
  const fix = (cell: Cell): Cell => (req.minor ? cell.map(([d, o, s, du]) => [d === '3' ? 'b3' : d, o, s, du]) : cell);
  const call = fix(CALLS[Math.floor(r() * CALLS.length)]);
  const ans = fix(ANSWERS[Math.floor(r() * ANSWERS.length)]);
  // octava de la tónica para centrar la frase en el rango
  let best = 4; let bs = Infinity;
  for (let o = 1; o <= 6; o++) {
    const base = (o + 1) * 12 + pc(req.keyRoot);
    const ms = [...call, ...ans].map(([d, oo]) => base + IV[d].semitones + 12 * oo);
    const s = Math.max(0, lo - Math.min(...ms)) + Math.max(0, Math.max(...ms) - hi) + Math.abs((Math.min(...ms) + Math.max(...ms)) / 2 - (lo + hi) / 2) * 0.01;
    if (s < bs) { bs = s; best = o; }
  }
  void best;
  const tonicFor = (cell: Cell) => {
    let bo = 4; let sc = Infinity;
    for (let o = 1; o <= 6; o++) {
      const base = (o + 1) * 12 + pc(req.keyRoot);
      const ms = cell.map(([d, oo]) => base + IV[d].semitones + 12 * oo);
      const s = Math.max(0, lo - Math.min(...ms)) * 3 + Math.max(0, Math.max(...ms) - hi) * 3 + Math.abs((Math.min(...ms) + Math.max(...ms)) / 2 - (lo + hi) / 2) * 0.05;
      if (s < sc) { sc = s; bo = o; }
    }
    return (bo + 1) * 12 + pc(req.keyRoot);
  };
  const notes: LineNote[] = [];
  const put = (cell: Cell, at: number, tech: string) => { const tonic = tonicFor(cell); cell.forEach(([d, o, s, du]) => { if (at + s < total) notes.push({ midi: tonic + IV[d].semitones + 12 * o, start: at + s, dur: du, tech }); }); };
  const phrases: SoloPhrase[] = [];
  const kname = NM.note(req.keyRoot);
  const colorText = (cell: Cell, at: number) => {
    const s = segAt(segs, at);
    const bits = cell.slice(0, 4).map(([d]) => {
      const p = mod12(pc(req.keyRoot) + IV[d].semitones);
      const rel = mod12(p - pc(s.chord.root));
      const nm = ['1', 'b9', '9', '#9/b3', '3', '11', '#11/b5', '5', 'b13', '13', 'b7', '7'][rel];
      return `${NM.note(transposeNote(req.keyRoot, IV[d]))} = ${nm} de ${sym(s.chord)}`;
    });
    return Array.from(new Set(bits)).join(', ');
  };
  const is12 = bars === 12;
  const plan: [number, 'call' | 'ans'][] = is12 ? [[0, 'call'], [4, 'call'], [8, 'ans']] : Array.from({ length: Math.ceil(bars / 4) }, (_, i) => [i * 4, i % 2 ? 'ans' : 'call'] as [number, 'call' | 'ans']);
  plan.forEach(([bar, kind], i) => {
    const at = bar * 4;
    const cell = kind === 'call' ? call : ans;
    put(cell, at, kind === 'call' ? 'pregunta' : 'respuesta');
    const s = segAt(segs, at);
    let text = '';
    if (kind === 'call' && i === 0) text = `Pregunta en ${kname} pentatónica/blues sobre ${sym(s.chord)}. ${colorText(cell, at)}. Luego 2 compases de silencio: escucha al grupo.`;
    else if (kind === 'call') text = `La MISMA frase ahora sobre ${sym(s.chord)}: las notas no cambian, pero su función sí (${colorText(cell, at)}). Por eso la pentatónica menor funciona en todo el blues.`;
    else text = `Respuesta que resuelve en la tónica ${kname}. ${colorText(cell, at)}.`;
    if (req.level >= 3 && at + 10 < total) {
      put([['b3', 0, 0.5, 0.5], ['1', 0, 1, 1]], at + 8, 'relleno');
      text += ' Relleno corto en el compás 3 (pregunta-respuesta dentro de la frase).';
    }
    phrases.push({ start: at, end: Math.min(total, at + 16), title: `${kind === 'call' ? 'Pregunta' : 'Respuesta'} · compases ${bar + 1}–${bar + 2}`, text });
  });
  return { idea: 'blues', title: 'Pregunta y respuesta en el blues', summary: `Estructura AAB del blues vocal: una pregunta (compases 1–2), la misma pregunta sobre el IV7 (5–6) y una respuesta que resuelve (9–10). Todas las notas salen de ${kname} pentatónica menor / escala blues${req.minor ? '' : ', con la 3ª mayor como "nota dulce"'}.`, notes: finalize(notes, total, req.range), phrases };
}

function genSpace(req: SoloRequest): Solo {
  const r = rng(req.seed);
  const segs = segsOf(req.events);
  const total = segs[segs.length - 1].end;
  const { lo, hi } = req.range;
  const CELLS: [number, number][][] = [
    [[0.5, 1], [1.5, 0.5], [2, 1.5]],
    [[1.5, 0.5], [2, 1], [3.5, 1.5]],
    [[0, 0.5], [0.5, 1.5], [3.5, 1]],
    [[2.5, 0.5], [3, 0.5], [3.5, 2]],
    [[1, 1], [2.5, 1.5]],
  ];
  const notes: LineNote[] = [];
  const phrases: SoloPhrase[] = [];
  let cur = Math.round((lo + hi) / 2);
  for (let at = 0; at < total; at += 8) {
    const cell = CELLS[Math.floor(r() * CELLS.length)];
    const bits: string[] = [];
    cell.forEach(([o, d]) => {
      const t = at + o;
      if (t >= total) return;
      let s = segAt(segs, t);
      let ant = false;
      const nxt = segs[s.i + 1];
      if (nxt && nxt.start - t === 0.5 && t + d > nxt.start) { s = nxt; ant = true; }
      const m = nearestPc(req.level === 1 ? guidePcs(s.chord) : tonePcs(s.chord), cur + (r() < 0.5 ? 2 : -2), lo + 2, hi - 2, 0, true);
      notes.push({ midi: m, start: t, dur: d, tech: ant ? 'anticipación' : 'ritmo' });
      cur = m;
      const beatName = (x: number) => (x % 1 === 0 ? `tiempo ${(x % 4) + 1}` : `contratiempo del ${Math.floor(x % 4) + 1}`);
      bits.push(`${nn(m, s.chord)} en el ${beatName(o % 4)}${ant ? ` (anticipación de ${sym(s.chord)})` : ''}`);
    });
    phrases.push({ start: at, end: Math.min(total, at + 8), title: `Compases ${at / 4 + 1}–${Math.min(total, at + 8) / 4}`, text: `${bits.join(', ')}. Pocas notas, colocadas con intención: el ritmo y el silencio hacen el trabajo.` });
  }
  return { idea: 'space', title: 'Ritmo y espacio', summary: 'Notas del acorde, pero muy pocas y en lugares inesperados: contratiempos y anticipaciones (la nota del acorde siguiente llega medio tiempo antes). Escucha cómo el swing aparece por la colocación, no por la cantidad.', notes: finalize(notes, total, req.range), phrases };
}

export function generateSolo(req: SoloRequest): Solo {
  NM = req.names ?? DEFAULT_NAMER;
  try {
    return generateSoloInner(req);
  } finally {
    NM = DEFAULT_NAMER;
  }
}
function generateSoloInner(req: SoloRequest): Solo {
  switch (req.idea) {
    case 'guide': return genGuide(req);
    case 'targets': return genTargets(req, false);
    case 'bebop': return genTargets({ ...req, level: 3 }, true);
    case 'arpeggios': return genArpeggios(req);
    case 'motif': return genMotif(req);
    case 'blues': return genBlues(req);
    case 'space': return genSpace(req);
  }
}

/** Ideas recomendadas para una progresión (el blues admite la idea de pregunta-respuesta). */
export function ideasFor(blues: boolean): IdeaId[] {
  return IDEAS.filter((i) => blues || !i.needsBlues).map((i) => i.id);
}

import { IV, Interval, Note, Pitch, midi, noteName, parseNote, pc, pitchFromMidi, transposeNote, transposePitch } from './notes';

export interface ChordQuality {
  id: string; // sufijo canónico
  name: string;
  degrees: string[];
  aliases: string[];
  /** escalas sugeridas (ids) en orden de prioridad + explicación */
  scales: { id: string; why: string }[];
}

const d = (s: string) => s.split(' ');

export const QUALITIES: ChordQuality[] = [
  { id: 'maj', name: 'Tríada mayor', degrees: d('1 3 5'), aliases: ['', 'M', 'maj'],
    scales: [{ id: 'major', why: 'Contiene 1-3-5; las demás notas son tensiones o notas de paso.' }, { id: 'pentMajor', why: 'Sin la 4ª ni la 7ª: nada choca.' }] },
  { id: 'm', name: 'Tríada menor', degrees: d('1 b3 5'), aliases: ['m', 'min', '-'],
    scales: [{ id: 'pentMinor', why: 'Las 5 notas son consonantes con un acorde menor.' }, { id: 'dorian', why: 'Menor con 6ª mayor: color más luminoso.' }, { id: 'aeolian', why: 'Menor natural: más melancólico.' }] },
  { id: 'dim', name: 'Tríada disminuida', degrees: d('1 b3 b5'), aliases: ['dim', '°', 'o'],
    scales: [{ id: 'locrian', why: 'Contiene b3 y b5.' }] },
  { id: 'aug', name: 'Tríada aumentada', degrees: d('1 3 #5'), aliases: ['aug', '+'],
    scales: [] },
  { id: 'sus2', name: 'Suspendido 2', degrees: d('1 2 5'), aliases: ['sus2'], scales: [{ id: 'mixolydian', why: 'Sin 3ª: neutro.' }] },
  { id: 'sus4', name: 'Suspendido 4', degrees: d('1 4 5'), aliases: ['sus4', 'sus'], scales: [{ id: 'mixolydian', why: 'La 4ª sustituye a la 3ª.' }] },
  { id: '6', name: 'Sexta', degrees: d('1 3 5 6'), aliases: ['6'], scales: [{ id: 'major', why: 'Acorde de tónica mayor en swing.' }, { id: 'pentMajor', why: 'Contiene 1-3-5-6.' }] },
  { id: 'm6', name: 'Menor sexta', degrees: d('1 b3 5 6'), aliases: ['m6', '-6'], scales: [{ id: 'dorian', why: 'La 6ª mayor del acorde es la nota característica del dórico.' }, { id: 'harmonicMinor', why: 'Tónica menor.' }] },
  { id: 'maj7', name: 'Séptima mayor', degrees: d('1 3 5 7'), aliases: ['maj7', 'M7', 'Δ7', 'Δ'],
    scales: [{ id: 'ionian', why: 'Acorde de tónica (I) en mayor: notas del acorde = 1-3-5-7 del jónico.' }, { id: 'lydian', why: 'Sobre IV maj7, o para evitar el choque de la 4ª natural.' }, { id: 'pentMajor', why: 'Opción "segura" sin notas a evitar.' }] },
  { id: 'm7', name: 'Menor séptima', degrees: d('1 b3 5 b7'), aliases: ['m7', 'min7', '-7'],
    scales: [{ id: 'dorian', why: 'En un ii-V-I el ii m7 pertenece a la tonalidad del I: eso es el dórico.' }, { id: 'pentMinor', why: 'Subconjunto seguro.' }, { id: 'aeolian', why: 'Si funciona como vi o como tónica menor.' }] },
  { id: '7', name: 'Dominante séptima', degrees: d('1 3 5 b7'), aliases: ['7', 'dom7'],
    scales: [{ id: 'mixolydian', why: 'Contiene 1-3-5-b7: es la escala "nativa" del dominante.' }, { id: 'blues', why: 'En blues: la b3 contra la 3 del acorde es la tensión típica.' }, { id: 'bebopDominant', why: 'Para líneas en corcheas con las notas del acorde en tiempo fuerte.' }] },
  { id: 'm7b5', name: 'Semidisminuido', degrees: d('1 b3 b5 b7'), aliases: ['m7b5', 'ø', 'ø7', '-7b5'],
    scales: [{ id: 'locrian', why: 'Único modo diatónico con b3, b5 y b7.' }] },
  { id: 'dim7', name: 'Disminuido séptima', degrees: d('1 b3 b5 bb7'), aliases: ['dim7', '°7', 'o7'],
    scales: [{ id: 'dimHW', why: 'Acorde simétrico: se trata como dominante b9 sin fundamental.' }] },
  { id: 'mMaj7', name: 'Menor con 7ª mayor', degrees: d('1 b3 5 7'), aliases: ['mMaj7', 'm(maj7)', '-Δ7'], scales: [{ id: 'harmonicMinor', why: 'Contiene b3 y 7.' }] },
  { id: '7sus4', name: 'Dominante sus4', degrees: d('1 4 5 b7'), aliases: ['7sus4', '7sus'], scales: [{ id: 'mixolydian', why: 'La 4ª ya no choca: es nota del acorde.' }] },
  { id: 'maj9', name: 'Mayor novena', degrees: d('1 3 5 7 9'), aliases: ['maj9', 'M9', 'Δ9'], scales: [{ id: 'ionian', why: 'Tensión 9 natural.' }] },
  { id: 'm9', name: 'Menor novena', degrees: d('1 b3 5 b7 9'), aliases: ['m9', '-9'], scales: [{ id: 'dorian', why: '9 natural y 6 mayor disponibles.' }] },
  { id: '9', name: 'Dominante novena', degrees: d('1 3 5 b7 9'), aliases: ['9'], scales: [{ id: 'mixolydian', why: 'Tensión 9 natural.' }, { id: 'blues', why: 'En contexto de blues.' }] },
  { id: '13', name: 'Dominante trecena', degrees: d('1 3 5 b7 9 13'), aliases: ['13'], scales: [{ id: 'mixolydian', why: 'Tensiones 9 y 13 naturales.' }] },
  { id: '7b9', name: 'Dominante b9', degrees: d('1 3 5 b7 b9'), aliases: ['7b9'],
    scales: [{ id: 'phrygianDominant', why: 'Resuelve a un acorde menor: b9 y b13 de la menor armónica.' }, { id: 'dimHW', why: 'Alternativa simétrica con b9, #9, #11, 13.' }] },
  { id: '7#9', name: 'Dominante #9', degrees: d('1 3 5 b7 #9'), aliases: ['7#9'], scales: [{ id: 'blues', why: 'La #9 suena como la b3 del blues.' }, { id: 'dimHW', why: 'Contiene #9.' }] },
];

export const qualityById = (id: string) => {
  const q = QUALITIES.find((x) => x.id === id);
  if (!q) throw new Error(`Calidad desconocida ${id}`);
  return q;
};

export interface Chord {
  root: Note;
  quality: ChordQuality;
}

export function chordSymbol(c: Chord): string {
  const suffix = c.quality.id === 'maj' ? '' : c.quality.id;
  return noteName(c.root) + suffix;
}

export function parseChord(sym: string): Chord {
  const m = /^([A-G](?:#|b)?)(.*)$/.exec(sym.trim());
  if (!m) throw new Error(`Acorde inválido: ${sym}`);
  const root = parseNote(m[1]);
  const rest = m[2];
  // alias más largo primero para evitar que "m" capture "m7b5"
  const all = QUALITIES.flatMap((q) => q.aliases.map((a) => ({ a, q }))).sort((x, y) => y.a.length - x.a.length);
  const hit = all.find((x) => x.a === rest);
  if (!hit) throw new Error(`Calidad no reconocida en ${sym}`);
  return { root, quality: hit.q };
}

export const chordIntervals = (c: Chord): Interval[] => c.quality.degrees.map((g) => IV[g]);
export const chordNotes = (c: Chord): Note[] => chordIntervals(c).map((iv) => transposeNote(c.root, iv));
export const chordPcs = (c: Chord) => chordNotes(c).map(pc);

/** Acorde en posición fundamental sobre una octava dada. */
export function chordPitches(c: Chord, octave = 4): Pitch[] {
  const root: Pitch = { ...c.root, octave };
  return chordIntervals(c).map((iv) => transposePitch(root, iv));
}

/** Grado (string) de una clase de altura dentro del acorde, si pertenece. */
export function degreeInChord(c: Chord, pitchClass: number): string | undefined {
  const idx = chordPcs(c).indexOf(pitchClass);
  return idx >= 0 ? c.quality.degrees[idx] : undefined;
}

export const thirdOf = (c: Chord): Note | undefined => {
  const i = c.quality.degrees.findIndex((g) => g === '3' || g === 'b3' || g === '4' || g === '2');
  return i >= 0 ? chordNotes(c)[i] : undefined;
};
export const seventhOf = (c: Chord): Note | undefined => {
  const i = c.quality.degrees.findIndex((g) => g === '7' || g === 'b7' || g === 'bb7' || g === '6');
  return i >= 0 ? chordNotes(c)[i] : undefined;
};

// ---------- Voicings (piano) ----------

export type VoicingType = 'root' | 'inv1' | 'inv2' | 'inv3' | 'shell137' | 'shell173' | 'rootlessA' | 'rootlessB';

export const VOICING_LABELS: Record<VoicingType, string> = {
  root: 'Fundamental',
  inv1: '1ª inversión',
  inv2: '2ª inversión',
  inv3: '3ª inversión',
  shell137: 'Shell 1-3-7',
  shell173: 'Shell 1-7-3',
  rootlessA: 'Sin fundamental A (3-5-7-9)',
  rootlessB: 'Sin fundamental B (7-9-3-5)',
};

/** Las notas de séptima (o 4 notas) del acorde con ortografía, para voicings. */
function basicTones(c: Chord): Note[] {
  const ns = chordNotes(c);
  return ns.slice(0, Math.min(4, ns.length));
}

/** Construye un voicing ascendente a partir de una lista de notas, empezando cerca de `lowMidi`. */
export function stackUp(notes: Note[], lowMidi: number): Pitch[] {
  const out: Pitch[] = [];
  let prev = lowMidi - 1;
  for (const n of notes) {
    let m = prev + 1;
    while (((m % 12) + 12) % 12 !== pc(n)) m++;
    out.push(pitchFromMidi(m, n));
    prev = m;
  }
  return out;
}

export function voicing(c: Chord, type: VoicingType, lowMidi = 52): Pitch[] {
  const t = basicTones(c);
  const iv = (g: string) => transposeNote(c.root, IV[g]);
  const third = thirdOf(c) ?? t[1];
  const seventh = seventhOf(c) ?? t[t.length - 1];
  const fifth = t[2];
  const ninth = c.quality.degrees.includes('b9') ? iv('b9') : c.quality.id === 'm7b5' ? fifth : iv('9');
  switch (type) {
    case 'root': return stackUp(t, lowMidi);
    case 'inv1': return stackUp([...t.slice(1), t[0]], lowMidi);
    case 'inv2': return stackUp([...t.slice(2), ...t.slice(0, 2)], lowMidi);
    case 'inv3': return t.length < 4 ? stackUp(t, lowMidi) : stackUp([t[3], ...t.slice(0, 3)], lowMidi);
    case 'shell137': return stackUp([c.root, third, seventh], lowMidi - 12);
    case 'shell173': return stackUp([c.root, seventh, third], lowMidi - 12);
    case 'rootlessA': return stackUp(c.quality.id === 'm7b5' ? [third, fifth, seventh, c.root] : [third, fifth, seventh, ninth], lowMidi);
    case 'rootlessB': return stackUp(c.quality.id === 'm7b5' ? [seventh, c.root, third, fifth] : [seventh, ninth, third, fifth], lowMidi);
  }
}

/** Todas las inversiones cerradas del acorde, transpuestas a varias octavas, para conducción de voces. */
function candidateVoicings(c: Chord, lo: number, hi: number): Pitch[][] {
  const t = basicTones(c);
  const out: Pitch[][] = [];
  for (let r = 0; r < t.length; r++) {
    const order = [...t.slice(r), ...t.slice(0, r)];
    for (let base = lo; base <= hi; base++) {
      const v = stackUp(order, base);
      if (midi(v[0]) === base && midi(v[v.length - 1]) <= hi + 12) out.push(v);
    }
  }
  return out;
}

const centroid = (v: Pitch[]) => v.reduce((s, p) => s + midi(p), 0) / v.length;

/** Distancia de conducción: suma de movimientos mínimos (emparejando notas en orden). */
export function voiceDistance(a: Pitch[], b: Pitch[]): number {
  const am = a.map(midi).sort((x, y) => x - y);
  const bm = b.map(midi).sort((x, y) => x - y);
  const n = Math.min(am.length, bm.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += Math.abs(am[i] - bm[i]);
  return s + Math.abs(am.length - bm.length) * 3;
}

/** Conducción de voces mínima: elige, para cada acorde, la inversión más cercana a la anterior. */
export function voiceLead(chords: Chord[], startMidi = 55): Pitch[][] {
  const out: Pitch[][] = [];
  let prev: Pitch[] | null = null;
  for (const c of chords) {
    const cands = candidateVoicings(c, 50, 62);
    let best = cands[0];
    let bestScore = Infinity;
    for (const v of cands) {
      const score: number = prev ? voiceDistance(prev, v) + Math.abs(centroid(v) - (startMidi + 5)) * 0.15 : Math.abs(midi(v[0]) - startMidi);
      if (score < bestScore) { bestScore = score; best = v; }
    }
    out.push(best);
    prev = best;
  }
  return out;
}

/** Línea de notas guía (3ª y 7ª) con movimiento mínimo. Devuelve dos voces. */
export function guideToneLines(chords: Chord[], startMidi = 64): { upper: Pitch[]; lower: Pitch[] } {
  const upper: Pitch[] = [];
  const lower: Pitch[] = [];
  let prevU = startMidi + 4;
  let prevL = startMidi - 2;
  for (const c of chords) {
    const g = [thirdOf(c)!, seventhOf(c)!].filter(Boolean);
    const closest = (n: Note, target: number) => {
      let best = 0;
      let bd = Infinity;
      for (let m = target - 7; m <= target + 7; m++) {
        if (((m % 12) + 12) % 12 === pc(n) && Math.abs(m - target) < bd) { bd = Math.abs(m - target); best = m; }
      }
      return best;
    };
    // decidir qué nota guía va arriba minimizando movimiento total
    const optA = [closest(g[0], prevU), closest(g[1], prevL)];
    const optB = [closest(g[1], prevU), closest(g[0], prevL)];
    // movimiento mínimo, voces sin cruzarse y una leve atracción al registro inicial para no 'derivar'
    const cost = (o: number[]) => Math.abs(o[0] - prevU) + Math.abs(o[1] - prevL) + (o[0] <= o[1] ? 20 : 0) + Math.abs(o[0] - (startMidi + 4)) * 0.35;
    const pick = cost(optA) <= cost(optB) ? { u: optA[0], l: optA[1], un: g[0], ln: g[1] } : { u: optB[0], l: optB[1], un: g[1], ln: g[0] };
    upper.push(pitchFromMidi(pick.u, pick.un));
    lower.push(pitchFromMidi(pick.l, pick.ln));
    prevU = pick.u;
    prevL = pick.l;
  }
  return { upper, lower };
}

/** Acordes diatónicos de séptima de la escala mayor. */
export function diatonicSevenths(key: Note): Chord[] {
  const q = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'];
  const degs = ['1', '2', '3', '4', '5', '6', '7'];
  return degs.map((g, i) => ({ root: transposeNote(key, IV[g]), quality: qualityById(q[i]) }));
}
export function diatonicTriads(key: Note): Chord[] {
  const q = ['maj', 'm', 'm', 'maj', 'maj', 'm', 'dim'];
  const degs = ['1', '2', '3', '4', '5', '6', '7'];
  return degs.map((g, i) => ({ root: transposeNote(key, IV[g]), quality: qualityById(q[i]) }));
}
export const ROMAN_MAJOR = ['Imaj7', 'ii m7', 'iii m7', 'IVmaj7', 'V7', 'vi m7', 'viiø'];

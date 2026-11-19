// Análisis de líneas melódicas: para cada nota, qué es respecto al acorde que suena en ese momento.
// Es la base de las explicaciones ("esta nota es la 3ª de G7", "aproximación cromática a…") y de la
// validación de cualquier solo (generado por el algoritmo, por la IA o guardado por el usuario).
import { Chord, chordNotes, chordSymbol } from './chords';
import { ChordEvent } from './progressions';
import { IV, LETTERS, Note, Pitch, midi as midiOf, noteName, pc, pitchFromMidi, transposeNote } from './notes';
import { scaleById, scaleNotes } from './scales';

export interface LineNote {
  midi: number;
  start: number; // tiempo (negras) desde el inicio de la progresión
  dur: number;
  tech?: string; // técnica que la generó (para la explicación)
}

export type NoteRole = 'guide' | 'chord' | 'tension' | 'blue' | 'approach' | 'passing' | 'chromatic';
export const ROLE_LABEL: Record<NoteRole, string> = {
  guide: 'Nota guía (3ª/7ª)',
  chord: 'Nota del acorde',
  tension: 'Tensión (9, 11, 13)',
  blue: 'Blue note',
  approach: 'Aproximación cromática',
  passing: 'Nota de paso (escala)',
  chromatic: 'Cromatismo',
};

export interface AnnotatedNote extends LineNote {
  pitch: Pitch;
  chordIdx: number;
  degree: string; // grado respecto al acorde: "3", "b7", "9", "b3"…
  role: NoteRole;
  label: string; // explicación corta en español
  anticipation?: boolean;
}

export function chordStarts(evts: ChordEvent[]): number[] {
  const s: number[] = [];
  let acc = 0;
  for (const e of evts) { s.push(acc); acc += e.beats; }
  return s;
}
export function chordIndexAt(evts: ChordEvent[], beat: number, starts = chordStarts(evts)): number {
  let i = 0;
  while (i + 1 < starts.length && starts[i + 1] <= beat + 1e-9) i++;
  return i;
}

const SEMI_TO_TENSION: Record<number, string> = { 1: 'b9', 2: '9', 3: '#9', 5: '11', 6: '#11', 8: 'b13', 9: '13' };

export function chordToneDegree(c: Chord, p: number): string | undefined {
  const ns = chordNotes(c);
  const i = ns.findIndex((n) => pc(n) === p);
  return i >= 0 ? c.quality.degrees[i] : undefined;
}
const isGuideDeg = (d: string) => ['3', 'b3', '7', 'b7', 'bb7', '6'].includes(d);

/** Tensiones disponibles (no "a evitar") según la calidad del acorde. */
export function availableTensions(c: Chord): string[] {
  const q = c.quality.id;
  if (['7', '9', '13', '7b9', '7#9'].includes(q)) return ['b9', '9', '#9', '#11', 'b13', '13'];
  if (['maj7', '6', 'maj9', 'maj'].includes(q)) return ['9', '#11', '13'];
  if (['m7', 'm9', 'm6', 'm', 'mMaj7'].includes(q)) return ['9', '11', '13'];
  if (q === 'm7b5') return ['9', '11', 'b13'];
  if (q === 'dim7') return ['9', '11', 'b13', '7'];
  return ['9'];
}

/** Escala de referencia del acorde (para decidir si una nota no-del-acorde es "de paso"). */
export function chordScalePcs(c: Chord, keyRoot?: Note, blues = false): number[] {
  const sc = c.quality.scales[0]?.id ?? 'major';
  const base = scaleNotes(c.root, scaleById(sc)).map(pc);
  if (blues && keyRoot) base.push(...scaleNotes(keyRoot, scaleById('blues')).map(pc));
  return base;
}

const NATURAL = [0, 2, 4, 5, 7, 9, 11];
/** Ortografía de una nota de aproximación: desde abajo, letra inferior alterada (D♯→E); desde arriba, letra superior (B♭→A). */
export function spellApproach(m: number, target: number): Note {
  const p = ((m % 12) + 12) % 12;
  const tl = pitchFromMidi(target).letter;
  const dist = Math.abs(target - m);
  const letter = target > m ? (tl + 7 - (dist > 2 ? 2 : 1)) % 7 : (tl + (dist > 2 ? 2 : 1)) % 7;
  return spellWithLetter(p, letter) ?? spellWithLetter(p, target > m ? (tl + 6) % 7 : (tl + 1) % 7) ?? pitchFromMidi(m);
}
function spellWithLetter(p: number, letter: number): Note | null {
  let acc = (((p - NATURAL[letter]) % 12) + 12) % 12;
  if (acc > 6) acc -= 12;
  return Math.abs(acc) <= 1 ? { letter, acc } : null;
}

export const degreeName = (d: string) => ({ '1': 'fundamental', '3': '3ª', b3: '3ª (menor)', '5': '5ª', b5: '5ª disminuida', '#5': '5ª aumentada', '7': '7ª mayor', b7: '7ª', bb7: '7ª disminuida', '6': '6ª', '4': '4ª', '2': '2ª' } as Record<string, string>)[d] ?? d;

/** Analiza (y deletrea) cada nota de una línea respecto a la armonía. */
export interface LineNamer { note: (n: Note) => string; chord: (c: Chord) => string }

export function analyzeLine(notes: LineNote[], evts: ChordEvent[], opts: { keyRoot?: Note; blues?: boolean; names?: LineNamer } = {}): AnnotatedNote[] {
  const NM: LineNamer = opts.names ?? { note: (n) => noteName(n, true), chord: (c) => chordSymbol(c) };
  const starts = chordStarts(evts);
  const sorted = [...notes].sort((a, b) => a.start - b.start);
  const out: AnnotatedNote[] = [];
  const classify = (m: number, c: Chord) => {
    const semis = (((m - pc(c.root)) % 12) + 12) % 12;
    const deg = chordToneDegree(c, ((m % 12) + 12) % 12);
    if (deg) return { kind: isGuideDeg(deg) ? ('guide' as const) : ('chord' as const), deg };
    const t = SEMI_TO_TENSION[semis];
    if (t && availableTensions(c).includes(t)) return { kind: 'tension' as const, deg: t };
    return null;
  };
  sorted.forEach((n, i) => {
    let ci = chordIndexAt(evts, n.start, starts);
    let c = evts[ci].chord;
    let cls = classify(n.midi, c);
    let anticipation = false;
    // anticipación: nota a contratiempo justo antes del cambio que pertenece al acorde siguiente
    const nextStart = starts[ci + 1];
    if (nextStart !== undefined && nextStart - n.start <= 0.5 + 1e-9 && n.start % 1 !== 0) {
      const nc = evts[ci + 1].chord;
      const ncls = classify(n.midi, nc);
      if (ncls && (!cls || cls.kind === 'tension') && n.start + n.dur > nextStart) {
        ci += 1; c = nc; cls = ncls; anticipation = true;
      }
    }
    const sym = NM.chord(c);
    const next = sorted[i + 1];
    const pcN = ((n.midi % 12) + 12) % 12;
    const keyRelN = opts.keyRoot ? (((pcN - pc(opts.keyRoot)) % 12) + 12) % 12 : -1;
    if (opts.blues && opts.keyRoot && (keyRelN === 3 || keyRelN === 6) && cls && cls.kind === 'tension' && ['7', '9', '13', '7#9'].includes(c.quality.id)) cls = null;
    // si el generador marcó la nota como aproximación y no es nota del acorde, es una aproximación
    const apprTech = n.tech && ['below', 'above', 'enclosure', 'double'].includes(n.tech);
    if (apprTech && cls && cls.kind === 'tension' && next) cls = null;
    let role: NoteRole;
    let degree: string;
    let label: string;
    let spelled: Note | null = null;
    if (cls) {
      role = cls.kind;
      degree = cls.deg;
      spelled = transposeNote(c.root, IV[cls.deg] ?? IV['1']);
      label = role === 'tension' ? `${degree} (tensión) de ${sym}` : `${degreeName(degree)} de ${sym}${role === 'guide' ? ' — nota guía' : ''}`;
      if (anticipation) label = `anticipación: ${label}`;
    } else {
      const p = ((n.midi % 12) + 12) % 12;
      const keyRel = opts.keyRoot ? (((p - pc(opts.keyRoot)) % 12) + 12) % 12 : -1;
      const semis = (((n.midi - pc(c.root)) % 12) + 12) % 12;
      degree = SEMI_TO_TENSION[semis] ?? ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'][semis];
      const nextIsTarget = next && Math.abs(next.midi - n.midi) <= 2 && next.start - (n.start + n.dur) < 0.26 && classify(next.midi, evts[chordIndexAt(evts, next.start, starts)].chord);
      const inScale = chordScalePcs(c).includes(p);
      if (opts.blues && opts.keyRoot && (keyRel === 3 || keyRel === 6)) {
        role = 'blue';
        degree = keyRel === 3 ? 'b3' : 'b5';
        spelled = transposeNote(opts.keyRoot, keyRel === 3 ? IV.b3 : IV.b5);
        label = `blue note: ${keyRel === 3 ? 'b3' : 'b5'} de ${NM.note(opts.keyRoot)} sobre ${sym}${keyRel === 3 && ['7', '9', '13'].includes(c.quality.id) ? ' (roza la 3ª mayor del acorde)' : ''}`;
      } else if (n.tech === 'bebop') {
        role = 'passing';
        spelled = transposeNote(c.root, IV['7']);
        label = 'nota de paso de la escala bebop (7ª mayor sobre un dominante)';
      } else if (apprTech && next) {
        role = 'approach';
        spelled = spellApproach(n.midi, next.midi);
        label = n.tech === 'enclosure' || n.tech === 'above' ? (next.midi < n.midi ? 'enclosure: nota de arriba que rodea al objetivo' : 'enclosure: nota de abajo que rodea al objetivo') : `aproximación ${Math.abs(next.midi - n.midi) === 1 ? 'cromática' : 'doble cromática'} ${next.midi > n.midi ? 'desde abajo' : 'desde arriba'} a la nota objetivo`;
      } else if (nextIsTarget && Math.abs(next.midi - n.midi) === 1 && !inScale) {
        role = 'approach';
        const tgtLetter = pitchFromMidi(next.midi).letter;
        spelled = spellWithLetter(p, next.midi > n.midi ? (tgtLetter + 6) % 7 : (tgtLetter + 1) % 7);
        label = `aproximación cromática ${next.midi > n.midi ? 'desde abajo' : 'desde arriba'} a la nota siguiente`;
      } else if (inScale) {
        role = 'passing';
        const sc = c.quality.scales[0]?.id ?? 'major';
        spelled = scaleNotes(c.root, scaleById(sc)).find((x) => pc(x) === p) ?? null;
        label = `nota de paso de ${NM.note(c.root)} ${scaleById(sc).name.toLowerCase()}`;
      } else if (nextIsTarget) {
        role = 'approach';
        const tgtLetter = pitchFromMidi(next.midi).letter;
        spelled = spellWithLetter(p, next.midi > n.midi ? (tgtLetter + 6) % 7 : (tgtLetter + 1) % 7);
        label = 'nota de aproximación a la nota siguiente';
      } else {
        role = 'chromatic';
        label = `cromatismo (${degree} sobre ${sym})`;
      }
    }
    if (!spelled) {
      const semis = (((n.midi - pc(c.root)) % 12) + 12) % 12;
      const deg = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'][semis];
      spelled = transposeNote(c.root, IV[deg]);
      if (Math.abs(spelled.acc) > 1) spelled = null;
    }
    const pitch = pitchFromMidi(n.midi, spelled ?? undefined);
    out.push({ ...n, pitch, chordIdx: ci, degree, role, label, anticipation });
  });
  return out;
}

/** Explicación compacta de una frase a partir de su análisis (para frases que no la traen). */
export function describeNotes(an: AnnotatedNote[], evts: ChordEvent[]): string {
  const parts: string[] = [];
  const byChord = new Map<number, AnnotatedNote[]>();
  an.forEach((n) => byChord.set(n.chordIdx, [...(byChord.get(n.chordIdx) ?? []), n]));
  for (const [ci, ns] of byChord) {
    const sym = chordSymbol(evts[ci].chord);
    const guides = ns.filter((n) => n.role === 'guide').map((n) => noteName(n.pitch));
    const blues = ns.filter((n) => n.role === 'blue').map((n) => noteName(n.pitch));
    const appr = ns.filter((n) => n.role === 'approach').length;
    const bits = [];
    if (guides.length) bits.push(`notas guía ${Array.from(new Set(guides)).join(', ')}`);
    if (blues.length) bits.push(`blue notes ${Array.from(new Set(blues)).join(', ')}`);
    if (appr) bits.push(`${appr} aproximación(es) cromática(s)`);
    if (bits.length) parts.push(`${sym}: ${bits.join('; ')}`);
  }
  return parts.join(' · ');
}

export function lineEnd(notes: LineNote[]) {
  return notes.reduce((m, n) => Math.max(m, n.start + n.dur), 0);
}

export const pitchLabel = (p: Pitch) => `${LETTERS[p.letter]}${p.acc > 0 ? '♯'.repeat(p.acc) : '♭'.repeat(-p.acc)}${p.octave}`;
export { midiOf };

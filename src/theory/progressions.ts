import { Chord, chordSymbol, parseChord, qualityById } from './chords';
import { IV, Interval, Note, intervalBetween, noteName, pc, simplify, transposeNote } from './notes';

/** Un acorde dentro de una progresión, con su duración en tiempos (negras). */
export interface ChordEvent {
  chord: Chord;
  beats: number;
  bar: number; // índice del compás (0-based) donde empieza
  roman?: string;
}

export interface ProgressionTemplate {
  id: string;
  name: string;
  minor?: boolean;
  /** compases: cada compás tiene uno o dos acordes como [grado, calidad, romano] */
  bars: [string, string, string][][];
  description: string;
  level: 1 | 2 | 3;
}

const B = (g: string, q: string, r: string): [string, string, string] => [g, q, r];

export const PROGRESSIONS: ProgressionTemplate[] = [
  {
    id: 'blues12', name: 'Blues de 12 compases (dominante)', level: 1,
    description: 'La forma más importante de la música popular del siglo XX. Tres acordes dominantes: I7, IV7, V7. Cambio rápido al IV en el compás 2.',
    bars: [
      [B('1', '7', 'I7')], [B('4', '7', 'IV7')], [B('1', '7', 'I7')], [B('1', '7', 'I7')],
      [B('4', '7', 'IV7')], [B('4', '7', 'IV7')], [B('1', '7', 'I7')], [B('1', '7', 'I7')],
      [B('5', '7', 'V7')], [B('4', '7', 'IV7')], [B('1', '7', 'I7')], [B('5', '7', 'V7')],
    ],
  },
  {
    id: 'jazzBlues', name: 'Blues jazzístico', level: 2,
    description: 'El blues con ii-V y dominantes secundarios: IV7 en el compás 2, #iv° (disminuido de paso), VI7 hacia el ii, y turnaround final.',
    bars: [
      [B('1', '7', 'I7')], [B('4', '7', 'IV7')], [B('1', '7', 'I7')], [B('5', 'm7', 'v m7'), B('1', '7', 'I7')],
      [B('4', '7', 'IV7')], [B('#4', 'dim7', '#iv°7')], [B('1', '7', 'I7')], [B('3', 'm7', 'iii m7'), B('6', '7', 'VI7')],
      [B('2', 'm7', 'ii m7')], [B('5', '7', 'V7')], [B('1', '7', 'I7'), B('6', '7', 'VI7')], [B('2', 'm7', 'ii m7'), B('5', '7', 'V7')],
    ],
  },
  {
    id: 'minorBlues', name: 'Blues menor', minor: true, level: 2,
    description: 'Blues de 12 compases en menor: i m7, iv m7 y un final bVI7–V7 que da mucho color.',
    bars: [
      [B('1', 'm7', 'i m7')], [B('1', 'm7', 'i m7')], [B('1', 'm7', 'i m7')], [B('1', 'm7', 'i m7')],
      [B('4', 'm7', 'iv m7')], [B('4', 'm7', 'iv m7')], [B('1', 'm7', 'i m7')], [B('1', 'm7', 'i m7')],
      [B('b6', '7', 'bVI7')], [B('5', '7', 'V7')], [B('1', 'm7', 'i m7')], [B('5', '7', 'V7')],
    ],
  },
  {
    id: 'I-IV-V', name: 'I – IV – V – I', level: 1,
    description: 'Las tres funciones básicas: tónica (reposo), subdominante (alejamiento) y dominante (tensión que pide volver).',
    bars: [[B('1', 'maj', 'I')], [B('4', 'maj', 'IV')], [B('5', 'maj', 'V')], [B('1', 'maj', 'I')]],
  },
  {
    id: 'I-vi-ii-V', name: 'I – vi – ii – V (turnaround)', level: 1,
    description: 'El "turnaround" que vuelve al principio. Base de Rhythm Changes y de cientos de canciones.',
    bars: [[B('1', 'maj7', 'Imaj7')], [B('6', 'm7', 'vi m7')], [B('2', 'm7', 'ii m7')], [B('5', '7', 'V7')]],
  },
  {
    id: 'iiVI', name: 'ii – V – I mayor', level: 1,
    description: 'La célula del jazz: subdominante (ii m7) → dominante (V7) → tónica (Imaj7). Las raíces se mueven por cuartas.',
    bars: [[B('2', 'm7', 'ii m7')], [B('5', '7', 'V7')], [B('1', 'maj7', 'Imaj7')], [B('1', 'maj7', 'Imaj7')]],
  },
  {
    id: 'iiVImin', name: 'ii – V – i menor', minor: true, level: 2,
    description: 'Versión menor: iiø (m7b5) → V7b9 → i m. La b9 del dominante es la b6 de la tonalidad menor.',
    bars: [[B('2', 'm7b5', 'iiø')], [B('5', '7b9', 'V7b9')], [B('1', 'm6', 'i m6')], [B('1', 'm6', 'i m6')]],
  },
  {
    id: 'iiVIshort', name: 'ii – V – I en 2 compases', level: 2,
    description: 'ii y V comparten compás, como en la mayoría de standards: los cambios llegan más rápido.',
    bars: [[B('2', 'm7', 'ii m7'), B('5', '7', 'V7')], [B('1', 'maj7', 'Imaj7')]],
  },
  {
    id: 'secDom', name: 'Dominantes secundarios (I–VI7–ii–V7)', level: 2,
    description: 'El vi m7 se convierte en VI7: un "V7 del ii". Cambia una nota (la 3ª) y crea atracción hacia el ii.',
    bars: [[B('1', 'maj7', 'Imaj7')], [B('6', '7', 'VI7 (V/ii)')], [B('2', 'm7', 'ii m7')], [B('5', '7', 'V7')]],
  },
  {
    id: 'rhythmA', name: 'Rhythm Changes (sección A)', level: 3,
    description: 'Basada en la armonía de "I Got Rhythm": turnarounds rápidos I-vi-ii-V. Vocabulario bebop esencial.',
    bars: [
      [B('1', 'maj7', 'I'), B('6', '7', 'VI7')], [B('2', 'm7', 'ii m7'), B('5', '7', 'V7')],
      [B('1', 'maj7', 'I'), B('6', '7', 'VI7')], [B('2', 'm7', 'ii m7'), B('5', '7', 'V7')],
      [B('1', '7', 'I7')], [B('4', 'maj7', 'IV'), B('#4', 'dim7', '#iv°')],
      [B('1', 'maj7', 'I'), B('6', '7', 'VI7')], [B('2', 'm7', 'ii m7'), B('5', '7', 'V7')],
    ],
  },
  {
    id: 'dorianVamp', name: 'Vamp modal dórico (i m7 – IV7)', minor: true, level: 2,
    description: 'Dos acordes que repiten: i m7 y IV7. El IV7 contiene la 6ª mayor del dórico: así se oye el modo.',
    bars: [[B('1', 'm7', 'i m7')], [B('4', '7', 'IV7')]],
  },
];

export const progressionById = (id: string) => {
  const p = PROGRESSIONS.find((x) => x.id === id);
  if (!p) throw new Error(`Progresión desconocida ${id}`);
  return p;
};

export function realize(p: ProgressionTemplate, key: Note, beatsPerBar = 4): ChordEvent[] {
  const out: ChordEvent[] = [];
  p.bars.forEach((bar, bi) => {
    const each = beatsPerBar / bar.length;
    bar.forEach(([g, q, r]) => {
      out.push({ chord: { root: simplify(transposeNote(key, IV[g])), quality: qualityById(q) }, beats: each, bar: bi, roman: r });
    });
  });
  return out;
}

/** Interpreta un cifrado tipo "Cm7 | F7 | Bbmaj7 Ebmaj7 |". Dos acordes en un compás = 2 tiempos cada uno. */
export function parseChart(chart: string, beatsPerBar = 4): ChordEvent[] {
  const bars = chart.split('|').map((b) => b.trim()).filter(Boolean);
  const out: ChordEvent[] = [];
  bars.forEach((bar, bi) => {
    const syms = bar.split(/\s+/).filter(Boolean);
    const each = beatsPerBar / syms.length;
    syms.forEach((s) => out.push({ chord: parseChord(s), beats: each, bar: bi }));
  });
  return out;
}

export function transposeEvents(evts: ChordEvent[], iv: Interval): ChordEvent[] {
  return evts.map((e) => ({ ...e, chord: { ...e.chord, root: simplify(transposeNote(e.chord.root, iv)) } }));
}

/** Intervalo (ascendente, dentro de la octava) entre dos tónicas. */
export function keyInterval(from: Note, to: Note): Interval {
  const a = { ...from, octave: 4 };
  let b = { ...to, octave: 4 };
  let iv = intervalBetween(a, b);
  if (iv.semitones < 0) { b = { ...to, octave: 5 }; iv = intervalBetween(a, b); }
  return iv;
}

export const totalBeats = (evts: ChordEvent[]) => evts.reduce((s, e) => s + e.beats, 0);

export interface AnalysisMark {
  start: number; // índice de evento
  length: number;
  label: string;
  target: string; // tonalidad de resolución
}

/** Detecta ii-V(-I) mayores y menores, y dominantes secundarios, en una secuencia de acordes. */
export function analyze(evts: ChordEvent[]): AnalysisMark[] {
  const marks: AnalysisMark[] = [];
  const isFourthUp = (a: Note, b: Note) => (pc(b) - pc(a) + 12) % 12 === 5;
  const fam = (q: string) => (['7', '9', '13', '7b9', '7#9', '7sus4'].includes(q) ? 'dom' : ['maj7', '6', 'maj9', 'maj'].includes(q) ? 'maj' : ['m7', 'm9', 'm6', 'm', 'mMaj7'].includes(q) ? 'min' : q === 'm7b5' ? 'half' : 'other');
  for (let i = 0; i < evts.length - 1; i++) {
    const a = evts[i].chord;
    const b = evts[i + 1].chord;
    const fa = fam(a.quality.id);
    const fb = fam(b.quality.id);
    if ((fa === 'min' || fa === 'half') && fb === 'dom' && isFourthUp(a.root, b.root)) {
      const c = evts[i + 2]?.chord;
      const resolves = c && isFourthUp(b.root, c.root) && (fam(c.quality.id) === 'maj' || fam(c.quality.id) === 'min');
      const minor = fa === 'half' || (c && fam(c.quality.id) === 'min');
      const target = transposeNote(b.root, IV['4']);
      marks.push({
        start: i, length: resolves ? 3 : 2,
        label: `${minor ? 'ii-V-i menor' : 'ii-V-I'}${resolves ? '' : ' (sin resolver)'} → ${noteName(target)}${minor ? 'm' : ''}`,
        target: noteName(target),
      });
    }
  }
  // dominantes que resuelven una 4ª arriba sin ii previo
  for (let i = 0; i < evts.length - 1; i++) {
    const a = evts[i].chord;
    const b = evts[i + 1].chord;
    if (fam(a.quality.id) === 'dom' && isFourthUp(a.root, b.root) && !marks.some((m) => i >= m.start && i < m.start + m.length)) {
      marks.push({ start: i, length: 2, label: `${chordSymbol(a)} es V7 de ${chordSymbol(b)}`, target: noteName(b.root) });
    }
  }
  return marks.sort((x, y) => x.start - y.start);
}

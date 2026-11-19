// Generador de preguntas con respuesta verificable (no hay puntuaciones inventadas: o aciertas o no).
import { chordNotes, chordPitches, chordSymbol, Chord, qualityById, seventhOf, thirdOf } from '../theory/chords';
import { IV, INTERVAL_NAMES_ES, KEYS_MAJOR, midi, noteName, parseNote, pitchFromMidi, transposeNote, transposePitch } from '../theory/notes';
import { realize, progressionById } from '../theory/progressions';
import { scaleById, scaleNotes, scalePitches } from '../theory/scales';
import { GUITAR_TUNING_MIDI, SaxType, concertToWrittenNote } from '../theory/instruments';
import { QuizKind } from './types';
import { SkillId } from '../progress/store';

export interface Question {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  /** qué reproducir (MIDI de concierto) */
  audio?: { midis: number[][]; mode: 'melodic' | 'harmonic' | 'chords'; voice?: 'piano' | 'guitar' | 'sax' };
  highlight?: { fret?: { string: number; fret: number }; keyMidi?: number };
}

const rnd = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
function shuffleWithAnswer(correct: string, wrong: string[]): { options: string[]; answer: number } {
  const uniq = Array.from(new Set(wrong.filter((w) => w !== correct))).slice(0, 3);
  const opts = [correct, ...uniq].sort(() => Math.random() - 0.5);
  return { options: opts, answer: opts.indexOf(correct) };
}
const ROOTS = ['C', 'D', 'Eb', 'E', 'F', 'G', 'Ab', 'A', 'Bb'];

export const QUIZ_SKILLS: Record<QuizKind, SkillId[]> = {
  'interval-ear': ['oido'], 'chord-ear': ['oido', 'acordes'], 'triad-ear': ['oido', 'acordes'], 'chord-notes': ['acordes', 'armonia'],
  'scale-for-chord': ['armonia', 'escalas'], 'fret-note': ['g_diapason'], 'key-note': ['acordes'], 'sax-transpose': ['s_resolucion', 'armonia'],
  'progression-ear': ['oido', 'armonia'], degree: ['escalas', 'armonia'], 'guide-tone': ['armonia'], 'mode-ear': ['oido', 'escalas'], 'scale-notes': ['escalas'],
};

export const QUIZ_LABEL: Record<QuizKind, string> = {
  'interval-ear': 'Intervalos de oído', 'chord-ear': 'Acordes de séptima de oído', 'triad-ear': 'Tríadas de oído', 'chord-notes': 'Notas de un acorde',
  'scale-for-chord': 'Escala para un acorde', 'fret-note': 'Notas en el diapasón', 'key-note': 'Notas en el teclado', 'sax-transpose': 'Transposición para saxofón',
  'progression-ear': 'Progresiones de oído', degree: 'Grados de la escala', 'guide-tone': 'Notas guía (3ª y 7ª)', 'mode-ear': 'Modos de oído', 'scale-notes': 'Notas de escalas',
};

export function makeQuestion(kind: QuizKind, ctx: { sax: SaxType }): Question {
  switch (kind) {
    case 'interval-ear': {
      const pool = INTERVAL_NAMES_ES.filter((i) => i.iv.semitones > 0);
      const it = rnd(pool);
      const base = 55 + Math.floor(Math.random() * 10);
      const { options, answer } = shuffleWithAnswer(it.name, pool.map((p) => p.name).sort(() => Math.random() - 0.5));
      return { prompt: 'Escucha: ¿qué intervalo es?', options, answer, explanation: `${it.name} = ${it.iv.semitones} semitonos.`, audio: { midis: [[base], [base + it.iv.semitones]], mode: 'melodic' } };
    }
    case 'chord-ear':
    case 'triad-ear': {
      const qs = kind === 'chord-ear' ? ['maj7', 'm7', '7', 'm7b5'] : ['maj', 'm', 'dim', 'aug'];
      const q = qualityById(rnd(qs));
      const root = parseNote(rnd(ROOTS));
      const c: Chord = { root, quality: q };
      const ms = chordPitches(c, 3).map(midi);
      const { options, answer } = shuffleWithAnswer(q.name, qs.map((x) => qualityById(x).name));
      return { prompt: 'Escucha el acorde: ¿qué tipo es?', options, answer, explanation: `${q.name}: ${q.degrees.join('-')}.`, audio: { midis: [ms, ...ms.map((m) => [m]), ms], mode: 'chords' } };
    }
    case 'chord-notes': {
      const q = qualityById(rnd(['maj7', 'm7', '7', 'm7b5', 'maj', 'm']));
      const c: Chord = { root: parseNote(rnd(ROOTS)), quality: q };
      const correct = chordNotes(c).map((n) => noteName(n)).join(' ');
      const wrongQs = ['maj7', 'm7', '7', 'm7b5', 'dim7', 'maj', 'm'].filter((x) => x !== q.id);
      const wrong = wrongQs.map((w) => chordNotes({ root: c.root, quality: qualityById(w) }).map((n) => noteName(n)).join(' '));
      const { options, answer } = shuffleWithAnswer(correct, wrong.sort(() => Math.random() - 0.5));
      return { prompt: `¿Qué notas forman ${chordSymbol(c)}?`, options, answer, explanation: `${chordSymbol(c)} = ${q.degrees.join('-')} → ${correct}.`, audio: { midis: [chordPitches(c, 4).map(midi)], mode: 'chords' } };
    }
    case 'guide-tone': {
      const q = qualityById(rnd(['maj7', 'm7', '7', 'm7b5']));
      const c: Chord = { root: parseNote(rnd(ROOTS)), quality: q };
      const correct = `${noteName(thirdOf(c)!)} y ${noteName(seventhOf(c)!)}`;
      const r = c.root;
      const wrong = [
        `${noteName(transposeNote(r, IV['5']))} y ${noteName(seventhOf(c)!)}`,
        `${noteName(transposeNote(r, q.degrees.includes('3') ? IV.b3 : IV['3']))} y ${noteName(seventhOf(c)!)}`,
        `${noteName(thirdOf(c)!)} y ${noteName(transposeNote(r, q.degrees.includes('7') ? IV.b7 : IV['7']))}`,
      ];
      const { options, answer } = shuffleWithAnswer(correct, wrong);
      return { prompt: `Notas guía (3ª y 7ª) de ${chordSymbol(c)}:`, options, answer, explanation: `La 3ª dice si es mayor o menor; la 7ª, si es maj7, 7 o m7.` };
    }
    case 'scale-for-chord': {
      const items: { sym: string; ctx: string; correct: string; why: string; wrong: string[] }[] = [
        { sym: 'Dm7', ctx: 'como ii en Do mayor (Dm7–G7–Cmaj7)', correct: 'Re dórico', why: 'Dm7 pertenece a Do mayor; Do mayor desde Re = dórico (6ª mayor: Si).', wrong: ['Re eólico', 'Re frigio', 'Re locrio'] },
        { sym: 'G7', ctx: 'como V en Do mayor', correct: 'Sol mixolidio', why: 'G7 = 1-3-5-b7; Do mayor desde Sol = mixolidio.', wrong: ['Sol jónico', 'Sol dórico', 'Sol lidio'] },
        { sym: 'Fmaj7', ctx: 'como IV en Do mayor', correct: 'Fa lidio', why: 'Do mayor desde Fa tiene Si natural = #4: lidio.', wrong: ['Fa mixolidio', 'Fa dórico', 'Fa eólico'] },
        { sym: 'Bm7b5', ctx: 'como iiø en La menor', correct: 'Si locrio', why: 'Único modo diatónico con b3, b5 y b7.', wrong: ['Si dórico', 'Si eólico', 'Si mixolidio'] },
        { sym: 'A7', ctx: 'en un blues en La', correct: 'La pentatónica menor / blues', why: 'Sobre los tres acordes del blues; la b3 contra la 3ª es el color "blue".', wrong: ['La lidio', 'La locrio', 'La menor armónica'] },
        { sym: 'G7b9', ctx: 'como V de Cm', correct: 'Sol frigio dominante (Do menor armónica)', why: 'Contiene la b9 (La♭) y la b13 (Mi♭) de Do menor.', wrong: ['Sol mixolidio', 'Sol lidio', 'Sol jónico'] },
        { sym: 'Cm7', ctx: 'como i en un vamp modal Cm7–F7', correct: 'Do dórico', why: 'F7 contiene La natural = 6ª mayor de Do: dórico.', wrong: ['Do eólico', 'Do frigio', 'Do locrio'] },
        { sym: 'Cmaj7', ctx: 'como I en Do mayor', correct: 'Do jónico (o pentatónica mayor)', why: 'Las notas del acorde están en Do mayor; cuidado con sostener el Fa.', wrong: ['Do mixolidio', 'Do dórico', 'Do frigio'] },
      ];
      const it = rnd(items);
      const { options, answer } = shuffleWithAnswer(it.correct, it.wrong);
      return { prompt: `${it.sym} ${it.ctx}: ¿qué escala encaja mejor?`, options, answer, explanation: it.why };
    }
    case 'fret-note': {
      const s = Math.floor(Math.random() * 6);
      const f = Math.floor(Math.random() * 13);
      const m = GUITAR_TUNING_MIDI[s] + f;
      const p = pitchFromMidi(m);
      const correct = noteName(p) + (p.acc !== 0 ? ` / ${noteName(transposeNote(p, { semitones: 0, degree: 1 }))}` : '');
      const wrongs = [-2, -1, 1, 2, 3].map((d) => {
        const q = pitchFromMidi(m + d);
        return noteName(q) + (q.acc !== 0 ? ` / ${noteName(transposeNote(q, { semitones: 0, degree: 1 }))}` : '');
      });
      const { options, answer } = shuffleWithAnswer(correct, wrongs.sort(() => Math.random() - 0.5));
      return { prompt: `¿Qué nota está en la cuerda ${6 - s}, traste ${f}?`, options, answer, explanation: `Cuerda ${6 - s} al aire = ${noteName(pitchFromMidi(GUITAR_TUNING_MIDI[s]))}; +${f} semitonos.`, highlight: { fret: { string: s, fret: f } }, audio: { midis: [[m]], mode: 'melodic', voice: 'guitar' } };
    }
    case 'key-note': {
      const m = 60 + Math.floor(Math.random() * 12);
      const p = pitchFromMidi(m);
      const name = (q: typeof p) => noteName(q) + (q.acc !== 0 ? ` / ${noteName(transposeNote(q, { semitones: 0, degree: 1 }))}` : '');
      const { options, answer } = shuffleWithAnswer(name(p), [-2, -1, 1, 2].map((d) => name(pitchFromMidi(m + d))));
      return { prompt: '¿Qué tecla está marcada?', options, answer, explanation: 'Referencia: el Do está a la izquierda del grupo de dos teclas negras.', highlight: { keyMidi: m }, audio: { midis: [[m]], mode: 'melodic' } };
    }
    case 'sax-transpose': {
      const n = parseNote(rnd(KEYS_MAJOR));
      const w = concertToWrittenNote(n, ctx.sax);
      const correct = noteName(w);
      const wrongs = [concertToWrittenNote(n, ctx.sax === 'tenor' ? 'alto' : 'tenor'), transposeNote(w, IV['2']), transposeNote(w, { semitones: -2, degree: -1 }), n].map((x) => noteName(x));
      const { options, answer } = shuffleWithAnswer(correct, wrongs);
      return { prompt: `Concierto ${noteName(n)} → ¿qué nota lees en tu saxo ${ctx.sax === 'tenor' ? 'tenor (Si♭)' : 'alto (Mi♭)'}?`, options, answer, explanation: ctx.sax === 'tenor' ? 'Tenor: escrito = concierto + 9ª mayor (un tono arriba, una octava más).' : 'Alto: escrito = concierto + 6ª mayor (o 3ª menor abajo).' };
    }
    case 'progression-ear': {
      const ids = ['I-IV-V', 'iiVI', 'I-vi-ii-V', 'iiVImin'];
      const id = rnd(ids);
      const key = parseNote(rnd(['C', 'F', 'G', 'Bb']));
      const evts = realize(progressionById(id), key).slice(0, 4);
      const ms = evts.map((e) => chordPitches(e.chord, 3).map(midi));
      const names = ids.map((x) => progressionById(x).name);
      const { options, answer } = shuffleWithAnswer(progressionById(id).name, names);
      return { prompt: 'Escucha la progresión: ¿cuál es?', options, answer, explanation: progressionById(id).description, audio: { midis: ms, mode: 'chords' } };
    }
    case 'degree': {
      const key = parseNote(rnd(KEYS_MAJOR));
      const notes = scaleNotes(key, scaleById('major'));
      const i = Math.floor(Math.random() * 7);
      const { options, answer } = shuffleWithAnswer(String(i + 1), ['1', '2', '3', '4', '5', '6', '7'].sort(() => Math.random() - 0.5));
      return { prompt: `En ${noteName(key)} mayor, ¿qué grado es ${noteName(notes[i])}?`, options, answer, explanation: `${noteName(key)} mayor: ${notes.map((n) => noteName(n)).join(' ')}.` };
    }
    case 'scale-notes': {
      const sc = scaleById(rnd(['major', 'minor', 'pentMinor', 'pentMajor', 'blues', 'dorian', 'mixolydian']));
      const key = parseNote(rnd(ROOTS));
      const correct = scaleNotes(key, sc).map((n) => noteName(n)).join(' ');
      const others = ['major', 'minor', 'pentMinor', 'pentMajor', 'blues', 'dorian', 'mixolydian', 'lydian'].filter((x) => x !== sc.id).map((x) => scaleNotes(key, scaleById(x)).map((n) => noteName(n)).join(' '));
      const { options, answer } = shuffleWithAnswer(correct, others.filter((o) => o !== correct).sort(() => Math.random() - 0.5));
      return { prompt: `¿Cuáles son las notas de ${noteName(key)} ${sc.name}?`, options, answer, explanation: `Fórmula: ${sc.degrees.join(' ')}.` };
    }
    case 'mode-ear': {
      const modes = ['ionian', 'dorian', 'mixolydian', 'aeolian', 'lydian', 'phrygian'];
      const id = rnd(modes);
      const root = { ...parseNote('D'), octave: 4 };
      const ps = scalePitches(root, scaleById(id)).map(midi);
      const drone = [midi(transposePitch(root, { semitones: -12, degree: -7 })), midi(transposePitch(root, { semitones: -5, degree: -3 }))];
      const { options, answer } = shuffleWithAnswer(scaleById(id).name, modes.map((m) => scaleById(m).name).sort(() => Math.random() - 0.5));
      return { prompt: 'Escucha la escala sobre el bordón de Re: ¿qué modo es?', options, answer, explanation: `${scaleById(id).name}: nota característica ${scaleById(id).characteristic?.join(', ')}.`, audio: { midis: [drone, ...ps.map((m) => [m])], mode: 'melodic' } };
    }
  }
}

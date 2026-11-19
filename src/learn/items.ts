// Motor de ejercicios cortos (estilo Duolingo). Cada `ItemSpec` es una receta con parámetros;
// `generateItem` produce un ejercicio concreto con su respuesta verificable y su explicación.
// Las notas de las recetas están en la notación del instrumento: saxo = escritas; guitarra = como suenan
// en el diapasón; piano = concierto.
import { rng } from '../audio/rng';
import { chordNotes, chordPitches, chordSymbol, parseChord, qualityById } from '../theory/chords';
import { INTERVAL_NAMES_ES, KEYS_MAJOR, Note, Pitch, midi as midiOf, noteName, noteNameEs, parseNote, parsePitch, pc, pitchFromMidi, transposePitch } from '../theory/notes';
import { progressionById, realize } from '../theory/progressions';
import { scaleById, scaleNotes, scalePitches } from '../theory/scales';
import { GUITAR_TUNING_MIDI, InstrumentId, SAX_TRANSPOSITION, SaxType } from '../theory/instruments';
import { makeQuestion, QUIZ_SKILLS } from '../content/quiz';
import { QuizKind } from '../content/types';
import { PHRASES, phraseById, phraseEvents, fitTonic } from '../content/phrases';
import { SkillId } from '../progress/store';
import { FINGERINGS, fingeringFor } from './fingerings';

export type ItemSpec =
  | { t: 'ear-highlow' }
  | { t: 'ear-same' }
  | { t: 'ear-majmin' }
  | { t: 'ear-interval'; set: string[] }
  | { t: 'ear-chord'; qualities: string[] }
  | { t: 'ear-scale'; scales: string[] }
  | { t: 'ear-prog'; progs: string[] }
  | { t: 'ear-rhythm'; patterns: string[] }
  | { t: 'read-note'; notes: string[] }
  | { t: 'read-inst'; notes: string[] }
  | { t: 'find-note'; notes: string[]; exact?: boolean }
  | { t: 'play-note'; notes: string[] }
  | { t: 'play-seq'; seqs: { name: string; notes: string[] }[] }
  | { t: 'call-response'; phrases: string[]; keys?: string[] }
  | { t: 'tap-rhythm'; patterns: string[]; bpm: number; swing?: boolean }
  | { t: 'build-chord'; chords: string[] }
  | { t: 'order-scale'; scales: string[]; keys: string[] }
  | { t: 'match'; mode: 'chord-notes' | 'interval-semis' | 'note-solfeo' | 'symbol-name' }
  | { t: 'quiz'; kind: QuizKind }
  | { t: 'play-chord'; chords: string[] };

export interface AudioSpec {
  seq: { midi: number | number[]; start: number; dur: number }[];
  bpm: number;
  voice: 'piano' | 'inst' | 'click';
  swing?: boolean;
  /** tiempos de cuenta previa (clics de metrónomo) antes del ritmo, con contador visual */
  countIn?: number;
  /** duración del ritmo en tiempos (para el contador) */
  beats?: number;
}

export type Answer =
  | { type: 'choice'; options: string[]; correct: number; optionKind?: 'text' | 'fingering' | 'rhythm' }
  | { type: 'tap'; target: number[]; mode: 'pc' | 'midi'; multi: boolean } // multi = construir acorde
  | { type: 'mic-note'; midi: number }
  | { type: 'mic-seq'; midis: number[] }
  | { type: 'rhythm'; onsets: number[]; bpm: number; beats: number }
  | { type: 'order'; tiles: string[]; correct: string[] }
  | { type: 'pairs'; pairs: [string, string][] }
  | { type: 'mic-chord'; pcs: number[]; root: number; symbol: string };

export interface Item {
  key: string; // identificador estable de la receta (para el repaso de errores)
  spec: ItemSpec;
  prompt: string;
  sub?: string;
  audio?: AudioSpec;
  autoplay?: boolean;
  staff?: { pitches: Pitch[]; durations?: number[] }; // ya en notación del instrumento
  rhythm?: string[]; // patrón a mostrar
  view?: { type: 'keyboard' | 'fretboard' | 'fingering'; midi?: number; fret?: { string: number; fret: number }; fingering?: string; tapRange?: [number, number] };
  answer: Answer;
  explain: string;
  skills: SkillId[];
}

export interface GenCtx { instrument: InstrumentId; sax: SaxType; solfeo: boolean; seed: number; diff: 1 | 2 | 3 }

// ---------------------------------------------------------------- utilidades
const nameOf = (n: Note, solfeo: boolean) => (solfeo ? noteNameEs(n) : noteName(n, true));
const both = (n: Note) => `${noteName(n, true)} (${noteNameEs(n)})`;
/** Altura del instrumento (escrita para saxo) → MIDI de concierto. */
export function toConcert(p: Pitch, ctx: Pick<GenCtx, 'instrument' | 'sax'>): number {
  return ctx.instrument === 'sax' ? midiOf(p) - SAX_TRANSPOSITION[ctx.sax].iv.semitones : midiOf(p);
}
export function fromConcert(m: number, ctx: Pick<GenCtx, 'instrument' | 'sax'>): number {
  return ctx.instrument === 'sax' ? m + SAX_TRANSPOSITION[ctx.sax].iv.semitones : m;
}
/** Para mostrar en pentagrama: guitarra se escribe una octava arriba. */
const staffPitch = (p: Pitch, ctx: GenCtx): Pitch => (ctx.instrument === 'guitar' ? { ...p, octave: p.octave + 1 } : p);

function pick<T>(r: () => number, a: T[]): T { return a[Math.floor(r() * a.length)]; }
function shuffle<T>(r: () => number, a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
function choice(r: () => number, correct: string, wrong: string[], n = 4): { options: string[]; correct: number } {
  const w = shuffle(r, Array.from(new Set(wrong.filter((x) => x !== correct)))).slice(0, n - 1);
  const options = shuffle(r, [correct, ...w]);
  return { options, correct: options.indexOf(correct) };
}

// Ritmos: w=4, h.=3, h=2, q.=1.5, q=1, e=0.5; con "r" = silencio (qr, hr, er)
export const RHYTHM_VALUE: Record<string, number> = { w: 4, 'h.': 3, h: 2, 'q.': 1.5, q: 1, e: 0.5, wr: 4, hr: 2, qr: 1, er: 0.5 };
export function rhythmOnsets(pattern: string[]): { onsets: number[]; durs: number[]; beats: number } {
  let t = 0;
  const onsets: number[] = [];
  const durs: number[] = [];
  for (const tok of pattern) {
    const v = RHYTHM_VALUE[tok] ?? 1;
    if (!tok.endsWith('r')) { onsets.push(t); durs.push(v); }
    t += v;
  }
  return { onsets, durs, beats: t };
}
export const parsePattern = (s: string) => s.trim().split(/\s+/);
export function rhythmLabel(pattern: string[]) {
  const M: Record<string, string> = { w: 'redonda', 'h.': 'blanca con puntillo', h: 'blanca', 'q.': 'negra con puntillo', q: 'negra', e: 'corchea', wr: 'silencio de redonda', hr: 'silencio de blanca', qr: 'silencio de negra', er: 'silencio de corchea' };
  return pattern.map((p) => M[p] ?? p).join(', ');
}

// ---------------------------------------------------------------- generador
export function itemKey(spec: ItemSpec) { return JSON.stringify(spec); }

export function generateItem(spec: ItemSpec, ctx: GenCtx): Item {
  const r = rng(ctx.seed);
  const base = { key: itemKey(spec), spec };
  const instName = ctx.instrument === 'sax' ? 'tu saxofón' : ctx.instrument === 'guitar' ? 'tu guitarra' : 'el piano';
  switch (spec.t) {
    case 'ear-highlow': {
      const a = 55 + Math.floor(r() * 14);
      const d = (1 + Math.floor(r() * (ctx.diff === 1 ? 7 : 4))) * (r() < 0.5 ? 1 : -1);
      const b = a + d;
      const ans = b > a ? 'La segunda es más aguda' : 'La segunda es más grave';
      return { ...base, prompt: 'Escucha dos notas: ¿la segunda es más aguda o más grave?', audio: { seq: [{ midi: a, start: 0, dur: 0.9 }, { midi: b, start: 1, dur: 0.9 }], bpm: 80, voice: 'piano' }, autoplay: true,
        answer: { type: 'choice', options: ['La segunda es más aguda', 'La segunda es más grave'], correct: ans.includes('aguda') ? 0 : 1 }, explain: `Distancia de ${Math.abs(d)} semitono(s) ${d > 0 ? 'hacia arriba' : 'hacia abajo'}. Acostumbrar el oído a la dirección es el primer paso para tocar de oído.`, skills: ['oido'] };
    }
    case 'ear-same': {
      const tonic = 60 + Math.floor(r() * 5);
      const ph = [0, 2, 4, 7, 4].map((x, i) => ({ midi: tonic + x, start: i * 0.5, dur: 0.5 }));
      const same = r() < 0.5;
      const ci = 2 + Math.floor(r() * 2);
      const delta = r() < 0.5 ? 1 : -2;
      const other = ph.map((n, i) => ({ ...n, midi: i === ci && !same ? n.midi + delta : n.midi, start: n.start + 4 }));
      return { ...base, prompt: '¿Las dos frases son iguales o distintas?', audio: { seq: [...ph, ...other], bpm: 100, voice: 'piano' }, autoplay: true,
        answer: { type: 'choice', options: ['Iguales', 'Distintas'], correct: same ? 0 : 1 }, explain: same ? 'Eran idénticas.' : 'Cambiaba una nota en el centro de la frase: escuchar los detalles te permitirá imitar frases.', skills: ['oido'] };
    }
    case 'ear-majmin': {
      const root = 55 + Math.floor(r() * 7);
      const maj = r() < 0.5;
      const notes = [root, root + (maj ? 4 : 3), root + 7];
      return { ...base, prompt: 'Escucha el acorde: ¿mayor o menor?', audio: { seq: [{ midi: notes, start: 0, dur: 1.6 }, ...notes.map((m, i) => ({ midi: m, start: 2 + i * 0.6, dur: 0.6 })), { midi: notes, start: 4, dur: 1.6 }], bpm: 90, voice: 'piano' }, autoplay: true,
        answer: { type: 'choice', options: ['Mayor (alegre, brillante)', 'Menor (triste, oscuro)'], correct: maj ? 0 : 1 }, explain: `La diferencia está en la nota del medio: la 3ª ${maj ? 'mayor (4 semitonos)' : 'menor (3 semitonos)'}.`, skills: ['oido', 'acordes'] };
    }
    case 'ear-interval': {
      const pool = INTERVAL_NAMES_ES.filter((i) => spec.set.includes(i.short));
      const it = pick(r, pool);
      const a = 55 + Math.floor(r() * 10);
      const c = choice(r, it.name, pool.map((p) => p.name), Math.min(4, pool.length));
      return { ...base, prompt: 'Escucha el intervalo: ¿cuál es?', audio: { seq: [{ midi: a, start: 0, dur: 0.9 }, { midi: a + it.iv.semitones, start: 1, dur: 0.9 }, { midi: [a, a + it.iv.semitones], start: 2.2, dur: 1.4 }], bpm: 80, voice: 'piano' }, autoplay: true,
        answer: { type: 'choice', ...c }, explain: `${it.name}: ${it.iv.semitones} semitonos.${it.iv.semitones === 7 ? ' Truco: suena "estable", como el bajo de una canción.' : it.iv.semitones === 4 ? ' Truco: es el comienzo de un acorde mayor.' : ''}`, skills: ['oido'] };
    }
    case 'ear-chord': {
      const q = qualityById(pick(r, spec.qualities));
      const root = parseNote(pick(r, ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb']));
      const ms = chordPitches({ root, quality: q }, 3).map(midiOf);
      const c = choice(r, q.name, spec.qualities.map((x) => qualityById(x).name), spec.qualities.length);
      return { ...base, prompt: 'Escucha el acorde: ¿qué tipo es?', audio: { seq: [{ midi: ms, start: 0, dur: 1.6 }, ...ms.map((m, i) => ({ midi: m, start: 2 + i * 0.5, dur: 0.5 })), { midi: ms, start: 2 + ms.length * 0.5 + 0.3, dur: 1.6 }], bpm: 90, voice: 'piano' }, autoplay: true,
        answer: { type: 'choice', ...c }, explain: `${q.name}: ${q.degrees.join('-')}.`, skills: ['oido', 'acordes'] };
    }
    case 'ear-scale': {
      const sc = scaleById(pick(r, spec.scales));
      const root = { ...parseNote(pick(r, ['C', 'D', 'F', 'G'])), octave: 4 };
      const ps = scalePitches(root, sc).map(midiOf);
      const c = choice(r, sc.name, spec.scales.map((x) => scaleById(x).name), spec.scales.length);
      return { ...base, prompt: 'Escucha la escala: ¿cuál es?', audio: { seq: [...ps, ...[...ps].reverse().slice(1)].map((m, i) => ({ midi: m, start: i * 0.5, dur: 0.5 })), bpm: 110, voice: 'piano' }, autoplay: true,
        answer: { type: 'choice', ...c }, explain: `${sc.name}: ${sc.degrees.join(' ')}. ${sc.summary}`, skills: ['oido', 'escalas'] };
    }
    case 'ear-prog': {
      const id = pick(r, spec.progs);
      const p = progressionById(id);
      const evts = realize(p, parseNote(pick(r, ['C', 'F', 'G']))).slice(0, 4);
      let t = 0;
      const seq = evts.map((e) => { const s = { midi: chordPitches(e.chord, 3).map(midiOf), start: t, dur: 1.8 }; t += 2; return s; });
      const c = choice(r, p.name, spec.progs.map((x) => progressionById(x).name), spec.progs.length);
      return { ...base, prompt: 'Escucha la progresión: ¿cuál es?', audio: { seq, bpm: 90, voice: 'piano' }, autoplay: true, answer: { type: 'choice', ...c }, explain: p.description, skills: ['oido', 'armonia'] };
    }
    case 'ear-rhythm': {
      const pats = shuffle(r, spec.patterns).slice(0, 3);
      const target = pats[0];
      const { onsets, durs } = rhythmOnsets(parsePattern(target));
      const opts = shuffle(r, pats);
      return { ...base, prompt: 'Escucha el ritmo: ¿cuál es?', sub: 'Primero suena una cuenta de 4 clics (1, 2, 3, 4) y luego el ritmo, con un pulso suave de fondo.', audio: { seq: onsets.map((o, i) => ({ midi: 72, start: o, dur: Math.min(durs[i], 0.9) })), bpm: 80, voice: 'click', countIn: 4, beats: Math.max(4, Math.ceil(onsets[onsets.length - 1] + durs[durs.length - 1] - 1e-9)) }, autoplay: true,
        answer: { type: 'choice', options: opts, correct: opts.indexOf(target), optionKind: 'rhythm' }, explain: `Era: ${rhythmLabel(parsePattern(target))}.`, skills: ['ritmo'] };
    }
    case 'read-note': {
      const p = parsePitch(pick(r, spec.notes));
      const shown = p; // las notas de lectura están escritas tal cual se leen
      const wrongs = spec.notes.map(parsePitch).filter((x) => x.letter !== p.letter || x.acc !== p.acc).map((x) => nameOf(x, ctx.solfeo));
      const extra = ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((x) => nameOf(parseNote(x), ctx.solfeo));
      const c = choice(r, nameOf(p, ctx.solfeo), [...wrongs, ...extra]);
      return { ...base, prompt: '¿Qué nota es?', sub: ctx.instrument === 'sax' ? 'Nota escrita para tu saxo.' : undefined, staff: { pitches: [shown] }, audio: { seq: [{ midi: ctx.instrument === 'guitar' ? midiOf(p) - 12 : toConcert(p, ctx), start: 0, dur: 1 }], bpm: 80, voice: 'inst' },
        answer: { type: 'choice', ...c }, explain: `Es ${both(p)}. ${readingTip(shown)}`, skills: ['escalas'] };
    }
    case 'read-inst': {
      const p = parsePitch(pick(r, spec.notes));
      const m = midiOf(p);
      const wrongs = spec.notes.map(parsePitch).filter((x) => midiOf(x) !== m).map((x) => nameOf(x, ctx.solfeo));
      const c = choice(r, nameOf(p, ctx.solfeo), [...wrongs, ...['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((x) => nameOf(parseNote(x), ctx.solfeo))]);
      let view: Item['view'];
      if (ctx.instrument === 'sax') view = { type: 'fingering', fingering: spec.notes.includes(`${noteName(p)}${p.octave}`) ? `${noteName(p)}${p.octave}` : undefined };
      else if (ctx.instrument === 'guitar') {
        const pos = fretPosition(m, r);
        view = { type: 'fretboard', fret: pos };
      } else view = { type: 'keyboard', midi: m };
      return { ...base, prompt: ctx.instrument === 'sax' ? '¿Qué nota se toca con esta digitación?' : ctx.instrument === 'guitar' ? '¿Qué nota es la marcada?' : '¿Qué tecla está marcada?', view, audio: { seq: [{ midi: toConcert(p, ctx), start: 0, dur: 1 }], bpm: 80, voice: 'inst' },
        answer: { type: 'choice', ...c }, explain: `Es ${both(p)}.${ctx.instrument === 'sax' ? ` ${fingerText(`${noteName(p)}${p.octave}`)}` : ''}`, skills: ctx.instrument === 'guitar' ? ['g_diapason'] : ['escalas'] };
    }
    case 'find-note': {
      const p = parsePitch(pick(r, spec.notes));
      const m = midiOf(p);
      if (ctx.instrument === 'sax') {
        const target = `${noteName(p)}${p.octave}`;
        const others = shuffle(r, FINGERINGS.filter((f) => f.written !== target && Math.abs(midiOf(parsePitch(f.written)) - m) <= 7)).slice(0, 2).map((f) => f.written);
        const opts = shuffle(r, [target, ...others]);
        return { ...base, prompt: `Elige la digitación de ${nameOf(p, ctx.solfeo)}`, staff: { pitches: [p] }, answer: { type: 'choice', options: opts, correct: opts.indexOf(target), optionKind: 'fingering' }, explain: fingerText(target), skills: ['escalas'] };
      }
      return { ...base, prompt: `Toca ${spec.exact ? nameOf(p, ctx.solfeo) + p.octave : nameOf(p, ctx.solfeo)} en ${ctx.instrument === 'guitar' ? 'el diapasón' : 'el teclado'}`, sub: spec.exact ? undefined : 'Cualquier octava vale.',
        view: { type: ctx.instrument === 'guitar' ? 'fretboard' : 'keyboard', tapRange: ctx.instrument === 'piano' ? [48, 84] : undefined },
        answer: { type: 'tap', target: [spec.exact ? m : pc(p)], mode: spec.exact ? 'midi' : 'pc', multi: false }, explain: `${both(p)}. ${ctx.instrument === 'piano' ? keyboardTip(p) : guitarTip(p)}`, skills: ctx.instrument === 'guitar' ? ['g_diapason'] : ['escalas'] };
    }
    case 'play-note': {
      const p = parsePitch(pick(r, spec.notes));
      const tag = `${noteName(p)}${p.octave}`;
      return { ...base, prompt: `Toca ${nameOf(p, ctx.solfeo)} en ${instName}`, sub: ctx.instrument === 'sax' ? fingerText(tag) : ctx.instrument === 'guitar' ? guitarTip(p) : keyboardTip(p), staff: { pitches: [staffPitch(p, ctx)] },
        view: ctx.instrument === 'sax' ? { type: 'fingering', fingering: tag } : ctx.instrument === 'guitar' ? { type: 'fretboard', fret: fretPosition(midiOf(p), r) } : { type: 'keyboard', midi: midiOf(p) },
        audio: { seq: [{ midi: toConcert(p, ctx), start: 0, dur: 1.2 }], bpm: 80, voice: 'inst' },
        answer: { type: 'mic-note', midi: toConcert(p, ctx) }, explain: 'El micrófono comprueba la altura (cualquier octava).', skills: ctx.instrument === 'sax' ? ['s_articulacion'] : ['escalas'] };
    }
    case 'play-seq': {
      const s = pick(r, spec.seqs);
      const ps = s.notes.map(parsePitch);
      return { ...base, prompt: `Toca: ${s.name}`, sub: 'Escúchalo, luego tócalo nota a nota. El micrófono comprueba las alturas en orden.', staff: { pitches: ps.map((p) => staffPitch(p, ctx)) },
        audio: { seq: ps.map((p, i) => ({ midi: toConcert(p, ctx), start: i * 0.6, dur: 0.55 })), bpm: 80, voice: 'inst' },
        answer: { type: 'mic-seq', midis: ps.map((p) => toConcert(p, ctx)) }, explain: `${s.name}: ${ps.map((p) => nameOf(p, ctx.solfeo)).join(' – ')}.`, skills: ['escalas'] };
    }
    case 'call-response': {
      const ph = phraseById(pick(r, spec.phrases))!;
      const key = parseNote(pick(r, spec.keys ?? [ph.defaultKey]));
      const range = ctx.instrument === 'sax' ? (ctx.sax === 'tenor' ? { lo: 47, hi: 70 } : { lo: 52, hi: 75 }) : ctx.instrument === 'guitar' ? { lo: 50, hi: 74 } : { lo: 58, hi: 80 };
      const tonic = fitTonic(ph, key, range.lo, range.hi);
      const evs = phraseEvents(ph, tonic);
      return { ...base, prompt: 'Escucha la frase y repítela', sub: `${ph.title} — ${ph.concept}`, audio: { seq: evs, bpm: 92, voice: 'inst', swing: true }, autoplay: true,
        answer: { type: 'mic-seq', midis: evs.map((e) => e.midi) }, explain: ph.tip, skills: ['oido', ctx.instrument === 'sax' ? 's_fraseo' : 'improvisacion'] };
    }
    case 'tap-rhythm': {
      const pat = parsePattern(pick(r, spec.patterns));
      const { onsets, beats } = rhythmOnsets(pat);
      return { ...base, prompt: 'Toca este ritmo', sub: `Escucha 4 clics de cuenta y pulsa el botón grande (o la barra espaciadora) en cada nota. ${rhythmLabel(pat)}.`, rhythm: pat,
        audio: { seq: onsets.map((o, i) => ({ midi: 72, start: o, dur: Math.min(0.9, rhythmOnsets(pat).durs[i]) })), bpm: spec.bpm, voice: 'click', swing: spec.swing, countIn: 4, beats },
        answer: { type: 'rhythm', onsets: spec.swing ? onsets.map((o) => (Math.abs((o % 1) - 0.5) < 1e-6 ? Math.floor(o) + 2 / 3 : o)) : onsets, bpm: spec.bpm, beats }, explain: 'La precisión rítmica se mide con el reloj de audio: cada pulsación debe caer cerca de su nota.', skills: ['ritmo'] };
    }
    case 'build-chord': {
      const c = parseChord(pick(r, spec.chords));
      const ns = chordNotes(c);
      const sym = chordSymbol(c);
      if (ctx.instrument === 'sax') {
        const correct = ns.map((n) => nameOf(n, ctx.solfeo)).join(' ');
        const wrong = ['maj', 'm', 'maj7', 'm7', '7', 'm7b5', 'dim'].filter((q) => q !== c.quality.id).map((q) => chordNotes({ root: c.root, quality: qualityById(q) }).map((n) => nameOf(n, ctx.solfeo)).join(' '));
        return { ...base, prompt: `¿Qué notas forman ${sym}? (arpegio de concierto)`, answer: { type: 'choice', ...choice(r, correct, wrong) }, explain: `${sym} = ${c.quality.degrees.join('-')} → ${correct}.`, skills: ['acordes'] };
      }
      return { ...base, prompt: `Construye ${sym}`, sub: `Pulsa sus ${ns.length} notas (${c.quality.name}: ${c.quality.degrees.join('-')}) y comprueba.`,
        view: { type: ctx.instrument === 'guitar' ? 'fretboard' : 'keyboard', tapRange: [48, 84] }, audio: { seq: [{ midi: chordPitches(c, 4).map(midiOf), start: 0, dur: 1.5 }], bpm: 80, voice: 'piano' },
        answer: { type: 'tap', target: ns.map(pc), mode: 'pc', multi: true }, explain: `${sym} = ${ns.map((n) => both(n)).join(', ')}.`, skills: ['acordes', ctx.instrument === 'piano' ? 'p_inversiones' : 'g_diapason'] };
    }
    case 'order-scale': {
      const sc = scaleById(pick(r, spec.scales));
      const key = parseNote(pick(r, spec.keys));
      const ns = scaleNotes(key, sc).map((n) => nameOf(n, ctx.solfeo));
      return { ...base, prompt: `Ordena la escala de ${nameOf(key, ctx.solfeo)} ${sc.name.toLowerCase()}`, sub: `Fórmula: ${sc.degrees.join(' ')}`, answer: { type: 'order', tiles: shuffle(r, ns), correct: ns },
        audio: { seq: scalePitches({ ...key, octave: 4 }, sc).map((p, i) => ({ midi: midiOf(p), start: i * 0.5, dur: 0.5 })), bpm: 110, voice: 'piano' }, explain: `${ns.join(' ')}. Cada letra aparece una sola vez.`, skills: ['escalas'] };
    }
    case 'match': {
      let pairs: [string, string][] = [];
      if (spec.mode === 'chord-notes') {
        const roots = shuffle(r, ['C', 'D', 'F', 'G', 'A', 'Bb', 'Eb']).slice(0, 4);
        const qs = shuffle(r, ctx.diff === 1 ? ['maj', 'm', 'maj', 'm'] : ['maj7', 'm7', '7', 'm7b5']);
        pairs = roots.map((rt, i) => { const c = { root: parseNote(rt), quality: qualityById(qs[i]) }; return [chordSymbol(c), chordNotes(c).map((n) => nameOf(n, ctx.solfeo)).join(' ')]; });
      } else if (spec.mode === 'interval-semis') {
        pairs = shuffle(r, INTERVAL_NAMES_ES.filter((i) => i.iv.semitones > 0 && i.iv.semitones < 12)).slice(0, 4).map((i) => [i.name, `${i.iv.semitones} semitonos`]);
      } else if (spec.mode === 'note-solfeo') {
        pairs = shuffle(r, ['C', 'D', 'E', 'F', 'G', 'A', 'B']).slice(0, 4).map((x) => [x, noteNameEs(parseNote(x))]);
      } else {
        pairs = shuffle(r, ['maj7', 'm7', '7', 'm7b5', 'dim7', '6']).slice(0, 4).map((q) => [`C${q === 'maj' ? '' : q}`, qualityById(q).name]);
      }
      return { ...base, prompt: 'Une las parejas', answer: { type: 'pairs', pairs }, explain: pairs.map((p) => `${p[0]} = ${p[1]}`).join(' · '), skills: spec.mode === 'note-solfeo' ? ['escalas'] : ['acordes', 'armonia'] };
    }
    case 'quiz': {
      const q = makeQuestion(spec.kind, { sax: ctx.sax });
      const audio: AudioSpec | undefined = q.audio ? { seq: q.audio.mode === 'chords' ? q.audio.midis.map((m, i) => ({ midi: m, start: i * 1.5, dur: 1.4 })) : q.audio.midis.map((m, i) => ({ midi: m, start: q.audio!.midis[0].length > 1 && i === 0 ? 0 : i, dur: 0.95 })), bpm: 80, voice: 'piano' } : undefined;
      return { ...base, prompt: q.prompt, audio, autoplay: !!audio, view: q.highlight?.fret ? { type: 'fretboard', fret: q.highlight.fret } : q.highlight?.keyMidi !== undefined ? { type: 'keyboard', midi: q.highlight.keyMidi } : undefined,
        answer: { type: 'choice', options: q.options, correct: q.answer }, explain: q.explanation, skills: QUIZ_SKILLS[spec.kind] };
    }
    case 'play-chord': {
      const c = parseChord(pick(r, spec.chords));
      return { ...base, prompt: `Toca el acorde ${chordSymbol(c)}`, sub: 'Rasguea o toca el acorde y déjalo sonar. El micrófono estima qué acorde suena (beta).', view: { type: ctx.instrument === 'guitar' ? 'fretboard' : 'keyboard' },
        audio: { seq: [{ midi: chordPitches(c, 3).map(midiOf), start: 0, dur: 1.5 }], bpm: 80, voice: 'inst' },
        answer: { type: 'mic-chord', pcs: chordNotes(c).map(pc), root: pc(c.root), symbol: chordSymbol(c) }, explain: `${chordSymbol(c)} = ${chordNotes(c).map((n) => both(n)).join(', ')}.`, skills: ['acordes'] };
    }
  }
}

function fretPosition(m: number, r: () => number): { string: number; fret: number } {
  const opts: { string: number; fret: number }[] = [];
  GUITAR_TUNING_MIDI.forEach((o, s) => { const f = m - o; if (f >= 0 && f <= 12) opts.push({ string: s, fret: f }); });
  return opts.length ? pick(r, opts) : { string: 0, fret: Math.max(0, m - 40) };
}
export function fingerText(written: string) {
  const f = fingeringFor(written);
  if (!f) return '';
  const lh = f.lh.map((x, i) => (x ? i + 1 : null)).filter(Boolean);
  const rh = f.rh.map((x, i) => (x ? i + 4 : null)).filter(Boolean);
  const parts = [f.octave ? 'llave de octava (pulgar izq.)' : '', lh.length ? `mano izq.: ${lh.join('-')}` : 'mano izq.: ninguno', rh.length ? `mano der.: ${rh.join('-')}` : '', ...f.extra].filter(Boolean);
  return `Digitación: ${parts.join(' · ')}.${f.alt ? ` Alternativa: ${f.alt}.` : ''}`;
}
function readingTip(p: Pitch) {
  const step = p.octave * 7 + p.letter - (4 * 7 + 2);
  if (step === -2) return 'Do central: una línea adicional debajo del pentagrama.';
  if (step % 2 === 0 && step >= 0 && step <= 8) return `Está en la ${step / 2 + 1}ª línea (contando desde abajo). Líneas: Mi-Sol-Si-Re-Fa.`;
  if (step % 2 !== 0 && step > 0 && step < 8) return `Está en el ${(step + 1) / 2}º espacio. Espacios: Fa-La-Do-Mi.`;
  return 'Cuenta líneas y espacios desde la nota más cercana que conozcas.';
}
function keyboardTip(p: Pitch) {
  const tips: Record<string, string> = {
    C: 'Do está justo a la izquierda del grupo de DOS teclas negras.', D: 'Re está entre las dos teclas negras.', E: 'Mi está a la derecha del grupo de dos negras.',
    F: 'Fa está a la izquierda del grupo de TRES teclas negras.', G: 'Sol está entre la 1ª y 2ª negra del grupo de tres.', A: 'La está entre la 2ª y 3ª negra del grupo de tres.', B: 'Si está a la derecha del grupo de tres negras.',
  };
  return tips['CDEFGAB'[p.letter]] + (p.acc ? ` ${p.acc > 0 ? 'Sostenido: la tecla inmediatamente a la derecha.' : 'Bemol: la tecla inmediatamente a la izquierda.'}` : '');
}
function guitarTip(p: Pitch) {
  const m = midiOf(p);
  const pos = GUITAR_TUNING_MIDI.map((o, s) => ({ s, f: m - o })).filter((x) => x.f >= 0 && x.f <= 12).map((x) => `cuerda ${6 - x.s} traste ${x.f}`);
  return pos.length ? `Está en: ${pos.slice(0, 3).join('; ')}.` : '';
}

/** Comprobación de respuestas táctiles (instrumento virtual). */
export function checkTap(ans: Extract<Answer, { type: 'tap' }>, tapped: number[]): boolean {
  const vals = ans.mode === 'pc' ? tapped.map((m) => ((m % 12) + 12) % 12) : tapped;
  if (!ans.multi) return vals.length > 0 && ans.target.includes(vals[vals.length - 1]);
  const set = new Set(vals);
  return set.size === ans.target.length && ans.target.every((t) => set.has(t));
}

/** Evalúa pulsaciones rítmicas (en tiempos) contra las esperadas. Tolerancia en tiempos. */
export function scoreRhythm(expected: number[], taps: number[], tolBeats: number) {
  const used = new Set<number>();
  const errors: number[] = [];
  let hit = 0;
  for (const e of expected) {
    let best = -1; let bd = Infinity;
    taps.forEach((t, i) => { if (!used.has(i) && Math.abs(t - e) < bd) { bd = Math.abs(t - e); best = i; } });
    if (best >= 0 && bd <= tolBeats) { used.add(best); hit++; errors.push(taps[best] - e); }
  }
  const extra = taps.length - used.size;
  const meanErr = errors.length ? errors.reduce((a, b) => a + b, 0) / errors.length : 0;
  return { hit, total: expected.length, extra, meanErr, ok: hit === expected.length && extra <= 1 };
}

export { PHRASES, KEYS_MAJOR, transposePitch, pitchFromMidi };

import { describe, expect, it } from 'vitest';
import { PHRASES, phrasePitches, fitTonic, phraseEvents } from './phrases';
import { LESSONS, MODULES } from './lessons';
import { makeQuestion, QUIZ_LABEL } from './quiz';
import { generateSession, routeFor } from './session';
import { initialState } from '../progress/store';
import { IV, midi, noteName, parseNote } from '../theory/notes';
import { progressionById, realize, PROGRESSIONS } from '../theory/progressions';
import { chordPcs, chordNotes, chordSymbol } from '../theory/chords';
import { scaleById } from '../theory/scales';
import { songById } from './songs';
import { detectPitch, freqToMidi, compareSequences } from '../recording/pitch';
import { QuizKind } from './types';

describe('frases', () => {
  it('todos los grados existen y se transponen', () => {
    for (const p of PHRASES) {
      for (const [deg] of p.notes) expect(IV[deg], `${p.id} ${deg}`).toBeDefined();
      progressionById(p.context);
      const ps = phrasePitches(p, { ...parseNote('Bb'), octave: 4 });
      expect(ps.length).toBe(p.notes.length);
    }
  });
  it('ii-V-I en Do: notas guía C→B y F→E', () => {
    const p = PHRASES.find((x) => x.id === 'iiVI-arp')!;
    const names = phrasePitches(p, { ...parseNote('C'), octave: 4 }).map((x) => noteName(x));
    expect(names.join(' ')).toBe('D F A C B G F D F E');
  });
  it('blues en Fa: la blue note es Cb (b5)', () => {
    const p = PHRASES.find((x) => x.id === 'blues-bluenote')!;
    expect(phrasePitches(p, { ...parseNote('F'), octave: 4 }).map((x) => noteName(x))).toContain('Cb');
  });
  it('fitTonic deja la frase dentro del rango', () => {
    for (const p of PHRASES) {
      const t = fitTonic(p, parseNote('E'), 48, 72);
      const ms = phraseEvents(p, t).map((e) => e.midi);
      expect(Math.min(...ms)).toBeGreaterThanOrEqual(43);
      expect(Math.max(...ms)).toBeLessThanOrEqual(77);
    }
  });
  it('bebop dominante: notas del acorde en los tiempos', () => {
    const p = PHRASES.find((x) => x.id === 'bebop-dominant')!;
    const onBeat = p.notes.filter(([, , start]) => Number.isInteger(start)).map(([d]) => d);
    for (const d of onBeat) expect(['1', '3', '5', 'b7']).toContain(d);
  });
});

describe('contenido', () => {
  it('cada lección pertenece a un módulo y tiene ejercicios válidos', () => {
    for (const l of LESSONS) {
      expect(MODULES.some((m) => m.id === l.module), l.id).toBe(true);
      expect(l.exercises.length).toBeGreaterThan(0);
      for (const e of l.exercises) {
        if (e.kind === 'scale') scaleById(e.scale);
        if (e.kind === 'progression' || e.kind === 'improv' || e.kind === 'compare') progressionById(e.progression);
        if (e.kind === 'compare') e.scales.forEach(scaleById);
        if (e.kind === 'phrase' || e.kind === 'transpose') expect(PHRASES.some((p) => p.id === e.phrase), e.phrase).toBe(true);
        if (e.kind === 'song') expect(songById(e.song), e.song).toBeDefined();
        if (e.kind === 'improv' && e.scale) scaleById(e.scale);
      }
    }
    const ids = LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('las rutas de los tres instrumentos contienen lecciones', () => {
    for (const i of ['sax', 'guitar', 'piano'] as const) expect(routeFor(i).filter((l) => l.track === i).length).toBeGreaterThan(5);
  });
});

describe('quiz', () => {
  it('cada tipo genera preguntas con respuesta válida', () => {
    for (const k of Object.keys(QUIZ_LABEL) as QuizKind[]) {
      for (let n = 0; n < 30; n++) {
        const q = makeQuestion(k, { sax: n % 2 ? 'tenor' : 'alto' });
        expect(q.options.length, k).toBeGreaterThanOrEqual(2);
        expect(new Set(q.options).size).toBe(q.options.length);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
      }
    }
  });
});

describe('sesión diaria', () => {
  it('genera bloques que suman la duración elegida', () => {
    const st = initialState();
    for (const i of ['sax', 'guitar', 'piano'] as const) {
      for (const m of [10, 20, 30, 45] as const) {
        const b = generateSession(i, m, st.progress[i]);
        const total = b.reduce((s, x) => s + x.minutes, 0);
        expect(total, `${i} ${m}`).toBeLessThanOrEqual(m);
        expect(total).toBeGreaterThanOrEqual(m - 5);
        expect(b[b.length - 1].exercise.kind).toBe('record');
      }
    }
  });
});

describe('detección de altura', () => {
  it('detecta senoidales y ondas complejas', () => {
    const sr = 44100;
    for (const f of [110, 196, 233.08, 440, 880]) {
      const buf = new Float32Array(2048);
      for (let i = 0; i < buf.length; i++) buf[i] = 0.5 * Math.sin((2 * Math.PI * f * i) / sr) + 0.25 * Math.sin((4 * Math.PI * f * i) / sr) + 0.1 * Math.sin((6 * Math.PI * f * i) / sr);
      const r = detectPitch(buf, sr)!;
      expect(Math.abs(freqToMidi(r.freq) - freqToMidi(f))).toBeLessThan(0.2);
    }
  });
  it('silencio no da nota', () => {
    expect(detectPitch(new Float32Array(2048), 44100)).toBeNull();
  });
  it('comparación de secuencias', () => {
    const r = compareSequences([60, 62, 64, 65], [60, 61, 62, 64, 78]);
    expect(r.correct).toBe(3);
    expect(r.matched).toEqual([true, true, true, false]);
  });
});

describe('progresiones vs. acordes', () => {
  it('blues menor en Do y jazz blues en Fa', () => {
    expect(realize(progressionById('minorBlues'), parseNote('C')).map((e) => chordSymbol(e.chord)).join(' ')).toBe('Cm7 Cm7 Cm7 Cm7 Fm7 Fm7 Cm7 Cm7 Ab7 G7 Cm7 G7');
    const jb = realize(progressionById('jazzBlues'), parseNote('F')).map((e) => chordSymbol(e.chord));
    expect(jb).toContain('Bdim7');
    expect(jb).toContain('D7');
  });
  it('todas suman compases completos', () => {
    for (const p of PROGRESSIONS) {
      const ev = realize(p, parseNote('Eb'));
      expect(ev.reduce((s, e) => s + e.beats, 0)).toBe(p.bars.length * 4);
      for (const e of ev) expect(chordNotes(e.chord).length).toBeGreaterThanOrEqual(3);
    }
  });
  it('pcs coherentes', () => { expect(chordPcs(realize(progressionById('iiVI'), parseNote('C'))[0].chord)).toEqual([2, 5, 9, 0]); expect(midi({ ...parseNote('C'), octave: 4 })).toBe(60); });
});

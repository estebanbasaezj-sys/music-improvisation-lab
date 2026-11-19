// Evaluación MEDIDA de una improvisación: el micrófono detecta las notas que tocas sobre la base y
// las compara con la armonía que suena en ese instante. Solo informa de lo que puede medir.
import { useEffect, useRef, useState } from 'react';
import { BackingPlayer, BackingStyle } from '../audio/backing';
import { NoteSegmenter, PitchListener, freqToMidi, isEmbedded, micErrorText, notesFromAudioFile } from '../recording/pitch';
import { Tone, ensureAudio } from '../audio/engine';
import { ChordEvent } from '../theory/progressions';
import { chordStarts, chordIndexAt } from '../theory/line';
import { chordNotes } from '../theory/chords';
import { Note, pc } from '../theory/notes';
import { scaleById, scaleNotes } from '../theory/scales';

export interface ImprovStats { notes: number; inScale: number; chordTones: number; rangeSemis: number; phrases: number; notesPerBar: number; bars: number }

export function analyzeImprov(notes: { midi: number; beat: number }[], events: ChordEvent[], key: Note, blues: boolean): ImprovStats {
  const starts = chordStarts(events);
  const total = events.reduce((a, e) => a + e.beats, 0);
  const scalePcs = new Set([...scaleNotes(key, scaleById(blues ? 'blues' : 'major')).map(pc), ...(blues ? scaleNotes(key, scaleById('pentMajor')).map(pc) : [])]);
  let inScale = 0;
  let ct = 0;
  notes.forEach((n) => {
    const p = ((n.midi % 12) + 12) % 12;
    const c = events[chordIndexAt(events, ((n.beat % total) + total) % total, starts)].chord;
    if (scalePcs.has(p)) inScale++;
    if (chordNotes(c).map(pc).includes(p)) ct++;
  });
  let phrases = notes.length ? 1 : 0;
  for (let i = 1; i < notes.length; i++) if (notes[i].beat - notes[i - 1].beat > 1.5) phrases++;
  const ms = notes.map((n) => n.midi);
  const bars = notes.length ? Math.max(1, Math.ceil((notes[notes.length - 1].beat + 1) / 4)) : 0;
  return { notes: notes.length, inScale: notes.length ? inScale / notes.length : 0, chordTones: notes.length ? ct / notes.length : 0, rangeSemis: ms.length ? Math.max(...ms) - Math.min(...ms) : 0, phrases, notesPerBar: bars ? notes.length / bars : 0, bars };
}

export function ImprovAnalyzer({ events, keyRoot, blues, style, bpm, choruses = 1, onResult }: { events: ChordEvent[]; keyRoot: Note; blues: boolean; style: BackingStyle; bpm: number; choruses?: number; onResult?: (s: ImprovStats) => void }) {
  const [state, setState] = useState<'idle' | 'run' | 'done'>('idle');
  const [beat, setBeat] = useState(-4);
  const [stats, setStats] = useState<ImprovStats | null>(null);
  const [err, setErr] = useState('');
  const player = useRef<BackingPlayer | null>(null);
  const listener = useRef<PitchListener | null>(null);
  const t0 = useRef<number | null>(null);
  const seg = useRef(new NoteSegmenter(90));
  const total = events.reduce((a, e) => a + e.beats, 0);
  useEffect(() => () => { player.current?.stop(); listener.current?.stop(); }, []);
  const stop = () => {
    const pl = player.current;
    player.current = null;
    pl?.stop(); listener.current?.stop();
    const spb = 60 / bpm;
    const ns = seg.current.notes.filter((n) => t0.current !== null && n.t >= t0.current - 200).map((n) => ({ midi: n.midi, beat: (n.t - (t0.current ?? 0)) / 1000 / spb }));
    const st = analyzeImprov(ns, events, keyRoot, blues);
    setStats(st); setState('done'); onResult?.(st);
  };
  const start = async () => {
    setErr(''); seg.current.reset(); t0.current = null;
    try {
      const l = new PitchListener();
      listener.current = l;
      await l.start((r, t) => seg.current.push(r ? freqToMidi(r.freq) : null, t));
    } catch (e) { setErr(micErrorText(e)); return; }
    const p = new BackingPlayer({
      style, bpm, countIn: true, metronome: false,
      onStop: () => { if (player.current) stop(); },
      onBeat: (b, c) => {
        setBeat(b + (c > 1 ? (c - 1) * total : 0));
        if (b === 0 && t0.current === null) t0.current = performance.now();
        if (c > choruses) stop();
      },
    });
    player.current = p;
    await p.start(events);
    setState('run');
  };
  return (
    <div className="improv-an">
      {state === 'idle' && <button className="btn primary big" onClick={start}>🎤 Empezar a improvisar ({choruses} vuelta{choruses > 1 ? 's' : ''})</button>}
      {state === 'run' && (
        <div className="row gap wrap center">
          <span className="count">{beat < 0 ? `Cuenta… ${beat + 5}` : `Compás ${Math.floor(beat / 4) + 1} de ${Math.ceil((total * choruses) / 4)}`}</span>
          <button className="btn stop" onClick={stop}>■ Terminar</button>
          <span className="muted small">Usa auriculares para que el micrófono oiga solo tu instrumento.</span>
        </div>
      )}
      {err && <p className="warn">{err}</p>}
      {(err || isEmbedded()) && state !== 'run' && (
        <div className="upload-check">
          <label className="btn">📤 Subir una grabación de tu improvisación<input type="file" accept="audio/*" capture="user" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            await ensureAudio();
            const ns = await notesFromAudioFile(f, Tone.getContext().rawContext as BaseAudioContext);
            const spb = 60 / bpm;
            const t0 = ns[0]?.t ?? 0;
            const st = analyzeImprov(ns.map((n) => ({ midi: n.midi, beat: (n.t - t0) / 1000 / spb })), events, keyRoot, blues);
            setStats({ ...st, chordTones: NaN }); setState('done'); onResult?.({ ...st, chordTones: NaN });
          }} /></label>
          <span className="muted small">Pon la base en otro dispositivo (o en este, con auriculares), grábate con la grabadora del teléfono y súbelo. Sin sincronía con la base no se puede medir la relación con cada acorde; sí las notas de la escala, el registro y las frases.</span>
        </div>
      )}
      {stats && (
        <div className="stats-grid">
          <div><b>{stats.notes}</b><span>notas detectadas</span></div>
          <div><b>{Math.round(stats.inScale * 100)}%</b><span>dentro de la escala</span></div>
          <div><b>{Number.isNaN(stats.chordTones) ? '—' : `${Math.round(stats.chordTones * 100)}%`}</b><span>notas del acorde que sonaba</span></div>
          <div><b>{stats.rangeSemis}</b><span>semitonos de registro</span></div>
          <div><b>{stats.phrases}</b><span>frases (separadas por silencios)</span></div>
          <div><b>{stats.notesPerBar.toFixed(1)}</b><span>notas por compás</span></div>
          <p className="small muted full">Medido por el micrófono (alturas y momentos). No mide sonido, articulación ni swing: escucha tu grabación para eso.{stats.notes < 4 ? ' Se detectaron muy pocas notas: acércate al micrófono o toca más fuerte.' : ''}</p>
        </div>
      )}
    </div>
  );
}

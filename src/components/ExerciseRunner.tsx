import { useEffect, useMemo, useState } from 'react';
import { Exercise } from '../content/types';
import { PHRASES, phraseById, phraseEvents, fitTonic } from '../content/phrases';
import { songById } from '../content/songs';
import { playSequence, stopSequence } from '../audio/engine';
import { BackingPanel } from './BackingPanel';
import { ChordsView } from './ChordsView';
import { ScaleView } from './ScaleView';
import { Quiz } from './Quiz';
import { Recorder } from './Recorder';
import { PitchCheck } from './PitchCheck';
import { KEY_OPTIONS, melodicRange, soloRange, useNames, useTransposer, voiceFor } from './common';
import { SoloPlayer } from './SoloPlayer';
import { Workshop } from './Workshop';
import { VocabReview } from '../pages/Vocab';
import { sliceEvents } from '../theory/section';
import { useAppState } from '../progress/store';
import { progressionById, realize } from '../theory/progressions';
import { IV, midi, parseNote, pc } from '../theory/notes';
import { scaleById, scaleNotes } from '../theory/scales';

export function KeySelect({ value, onChange, label = 'Tonalidad (concierto)' }: { value: string; onChange: (k: string) => void; label?: string }) {
  const t = useTransposer();
  const names = useNames();
  return (
    <label className="field inline">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {KEY_OPTIONS.map((k) => <option key={k} value={k}>{names(parseNote(k))}{t.isSax ? ` → escrito ${t.noteName(parseNote(k))}` : ''}</option>)}
      </select>
    </label>
  );
}

export function ExerciseRunner({ ex, lessonId, onQuizDone }: { ex: Exercise; lessonId?: string; onQuizDone?: (s: number) => void }) {
  switch (ex.kind) {
    case 'scale': return <ScaleExercise ex={ex} />;
    case 'chords': return <ChordsView symbols={ex.symbols} voicings={ex.voicings} voiceLead={ex.voiceLead} />;
    case 'progression': return <ProgressionExercise ex={ex} />;
    case 'phrase': return <PhrasePlayer phraseId={ex.phrase} keyName={ex.key} />;
    case 'quiz': return <Quiz kind={ex.quiz} count={ex.count} lessonId={lessonId} concept={ex.concept} onDone={onQuizDone} />;
    case 'improv': return <Workshop progression={ex.progression} keyName={ex.key} style={ex.style} bpm={ex.bpm} prompts={ex.prompts} scale={ex.scale} minutes={ex.minutes} />;
    case 'compare': return <CompareExercise ex={ex} />;
    case 'record': return <div><p>{ex.prompt}</p><Recorder context={ex.title} criteria={ex.criteria} /></div>;
    case 'song': {
      const s = songById(ex.song);
      return s ? <a className="btn primary" href={`#/cancion/${s.id}`}>Abrir «{s.title}» en la biblioteca →</a> : null;
    }
    case 'transpose': return <TransposeExercise phraseId={ex.phrase} keys={ex.keys} />;
    case 'vocab': return <VocabReview />;
  }
}

function ScaleExercise({ ex }: { ex: Extract<Exercise, { kind: 'scale' }> }) {
  const [key, setKey] = useState(ex.key);
  return (<div><KeySelect value={key} onChange={setKey} /><ScaleView scaleId={ex.scale} keyName={key} arpeggio={key === ex.key ? ex.showArpeggio : undefined} /></div>);
}

function ProgressionExercise({ ex }: { ex: Extract<Exercise, { kind: 'progression' }> }) {
  const [key, setKey] = useState(ex.key);
  const prog = progressionById(ex.progression);
  const events = useMemo(() => realize(prog, parseNote(key)), [prog, key]);
  return (
    <div>
      {ex.text && <p className="hint">{ex.text}</p>}
      <div className="row between wrap"><KeySelect value={key} onChange={setKey} /><span className="muted small">{prog.description}</span></div>
      <BackingPanel events={events} style={ex.style} bpm={ex.bpm} display={ex.display} />
    </div>
  );
}

function CompareExercise({ ex }: { ex: Extract<Exercise, { kind: 'compare' }> }) {
  const t = useTransposer();
  const [key, setKey] = useState(ex.key);
  const [sel, setSel] = useState(ex.scales[0]);
  const events = useMemo(() => realize(progressionById(ex.progression), parseNote(key)), [ex.progression, key]);
  const r = melodicRange(t.instrument, t.sax);
  const listen = (id: string) => {
    setSel(id);
    const s = scaleById(id);
    const root = parseNote(key);
    let base = r.lo;
    while (base % 12 !== pc(root)) base++;
    const semis = s.degrees.map((d) => IV[d].semitones);
    const line = [...semis, 12, ...[...semis].reverse()].map((x) => base + x);
    playSequence(voiceFor(t.instrument), line.map((m, i) => ({ midi: m, start: i * 0.5, dur: 0.5 })), ex.bpm, { swing: ex.style === 'swing' || ex.style === 'blues' });
  };
  useEffect(() => () => stopSequence(), []);
  return (
    <div>
      {ex.text && <p className="hint">{ex.text}</p>}
      <p className="small">Pon el acompañamiento y pulsa cada escala para escucharla sobre la misma armonía. Fíjate en las notas que cambian.</p>
      <div className="row wrap gap">
        <KeySelect value={key} onChange={setKey} />
        {ex.scales.map((id) => <button key={id} className={`chip big ${sel === id ? 'on' : ''}`} onClick={() => listen(id)}>▶ {scaleById(id).name}</button>)}
      </div>
      <ScaleDiff scales={ex.scales} keyName={key} />
      <BackingPanel events={events} style={ex.style} bpm={ex.bpm} display="scales" fixedScale={{ scale: sel, root: parseNote(key) }} />
    </div>
  );
}

function ScaleDiff({ scales, keyName }: { scales: string[]; keyName: string }) {
  const t = useTransposer();
  const root = parseNote(keyName);
  const all = scales.map((id) => ({ id, notes: scaleNotes(root, scaleById(id)) }));
  return (
    <table className="diff">
      <tbody>
        {all.map(({ id, notes }) => (
          <tr key={id}>
            <th>{scaleById(id).name}</th>
            {notes.map((n, i) => {
              const unique = all.some((o) => o.id !== id && !o.notes.some((m) => pc(m) === pc(n)));
              return <td key={i} className={unique ? 'uniq' : ''}>{t.noteName(n)}<small>{scaleById(id).degrees[i]}</small></td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PhrasePlayer({ phraseId, keyName }: { phraseId: string; keyName?: string }) {
  const t = useTransposer();
  const names = useNames();
  const app = useAppState();
  const p = phraseById(phraseId)!;
  const [key, setKey] = useState(keyName ?? p.defaultKey);
  const prog = progressionById(p.context);
  const keyRoot = parseNote(key);
  const r = soloRange(t.instrument, app.settings.saxType);
  const tonic = fitTonic(p, keyRoot, r.lo, r.hi);
  const evs = phraseEvents(p, tonic);
  const end = Math.max(...evs.map((e) => e.start + e.dur));
  const bars = Math.max(p.bars, Math.ceil(end / 4 - 1e-9));
  const events = useMemo(() => sliceEvents(realize(prog, keyRoot), 0, bars * 4), [prog, key, bars]); // eslint-disable-line react-hooks/exhaustive-deps
  const blues = ['blues12', 'minorBlues'].includes(p.context);
  const chordsTxt = events.map((e) => t.chordName(e.chord)).join(' | ');
  return (
    <div className="phrase">
      <div className="ctx">
        <div><b>{p.title}</b> — {p.concept}</div>
        <div>Contexto: <b>{prog.name}</b> en {names(keyRoot)} (concierto){t.isSax && ` = ${t.noteName(keyRoot)} para tu saxo`}, compases 1–{bars}: <span className="ctx-chords">{chordsTxt}</span></div>
        <div className="muted small">Grados respecto a la tonalidad: {p.notes.map((n) => n[0]).join(' ')}. Bajo cada nota verás su función respecto al <b>acorde</b> que suena en ese momento.</div>
      </div>
      <div className="row between wrap"><KeySelect value={key} onChange={setKey} /></div>
      <SoloPlayer key={`${phraseId}-${key}`} events={events} notes={evs.map((e) => ({ midi: e.midi, start: e.start, dur: e.dur }))} keyRoot={keyRoot} blues={blues} style={p.context === 'dorianVamp' ? 'bossa' : 'swing'} bpm={p.level === 1 ? 90 : 100}
        phrases={[{ start: 0, end, title: p.title, text: `${p.concept} ${p.tip}` }]} source={`Frase: ${p.title}`} />
      <PitchCheck target={evs.map((e) => e.midi)} skill="s_fraseo" />
    </div>
  );
}

function TransposeExercise({ phraseId, keys }: { phraseId: string; keys: string[] }) {
  const names = useNames();
  const [k, setK] = useState(keys[0]);
  return (
    <div>
      <p className="small">La misma frase en {keys.length} tonalidades: tócala primero de oído en cada una (sin mirar) y luego comprueba con la partitura. Así el vocabulario pasa de "dedos" a "oído".</p>
      <div className="chip-row">{keys.map((x) => <button key={x} className={`chip big ${x === k ? 'on' : ''}`} onClick={() => setK(x)}>{names(parseNote(x))}</button>)}</div>
      <PhrasePlayer key={k} phraseId={phraseId} keyName={k} />
    </div>
  );
}

export const ALL_PHRASES = PHRASES;
export { midi };

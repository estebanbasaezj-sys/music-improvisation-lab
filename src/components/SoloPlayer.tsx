// Reproductor de líneas explicadas: partitura con cifrado y colores por función, acompañamiento,
// explicación por frase, "repite después de mí" y guardado en el vocabulario.
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackingPlayer, BackingStyle, STYLE_LABEL } from '../audio/backing';
import { playSequence, stopSequence, triggerNotes, ensureAudio } from '../audio/engine';
import { TimeStaff, ROLE_COLOR } from '../instruments/TimeStaff';
import { ChordEvent } from '../theory/progressions';
import { Note, noteName } from '../theory/notes';
import { AnnotatedNote, ChosenScale, LineNote, ROLE_LABEL, analyzeLine, chordStarts, NoteRole } from '../theory/line';
import { eventsToChart, repeatEvents, sliceEvents, sliceLine } from '../theory/section';
import { addVocab } from '../progress/store';
import { LayerToggles, useOnStopAll } from './Mixer';
import { useNames, useTransposer, voiceFor } from './common';

export interface PlayerPhrase { start: number; end: number; title: string; text: string }

interface Props {
  events: ChordEvent[];
  notes: LineNote[];
  keyRoot: Note;
  blues: boolean;
  style: BackingStyle;
  bpm: number;
  phrases?: PlayerPhrase[];
  title?: string;
  summary?: string;
  source: string;
  guidedRepeat?: boolean;
  hideSave?: boolean;
  /** escala elegida por acorde (para explicar las notas de paso con la escala que eligió el alumno) */
  scales?: (ChosenScale | undefined)[];
}

export function SoloPlayer({ events, notes, keyRoot, blues, style: style0, bpm: bpm0, phrases = [], title, summary, source, guidedRepeat, hideSave, scales }: Props) {
  const t = useTransposer();
  const names = useNames();
  const sorted = useMemo(() => [...notes].sort((a, b) => a.start - b.start), [notes]);
  const an = useMemo(() => analyzeLine(sorted, events, { keyRoot, blues, scales, names: { note: t.noteName, chord: t.chordName } }), [sorted, events, keyRoot, blues, scales, t.instrument, t.sax]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = events.reduce((s, e) => s + e.beats, 0);
  const starts = useMemo(() => chordStarts(events), [events]);
  const [bpm, setBpm] = useState(bpm0);
  const [style, setStyle] = useState<BackingStyle>(style0);
  const [active, setActive] = useState<number | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [mode, setMode] = useState<'stop' | 'full' | 'line' | 'call' | 'you'>('stop');
  const [callInfo, setCallInfo] = useState<{ phrase: number; turn: 'escucha' | 'tu' } | null>(null);
  const [labelMode, setLabelMode] = useState<'degree' | 'name'>('degree');
  const [guided, setGuided] = useState(0);
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const player = useRef<BackingPlayer | null>(null);
  useEffect(() => { setBpm(bpm0); setStyle(style0); }, [bpm0, style0]);
  useEffect(() => () => { player.current?.stop(); stopSequence(); }, []);
  useEffect(() => { stopAll(); /* nueva línea */ }, [notes, events]); // eslint-disable-line react-hooks/exhaustive-deps

  const melodyVoice = voiceFor(t.instrument);
  const stopAll = () => { player.current?.stop(); stopSequence(); setMode('stop'); setActive(null); setCallInfo(null); };
  useOnStopAll(() => { setMode('stop'); setActive(null); setCallInfo(null); });

  const name = title ?? 'Frase';
  const MODE_LABEL: Record<string, string> = { full: 'línea + acompañamiento', you: 'solo la base (tocas tú)', call: 'repite después de mí', line: 'solo la línea' };
  const startBacking = async (evs: ChordEvent[], melody: LineNote[], indexMap: number[], m: typeof mode, onBeat?: (b: number) => void, melodyOn = true) => {
    stopAll();
    const p = new BackingPlayer({
      label: `${name} · ${MODE_LABEL[m]}`,
      style, bpm, countIn: true, metronome: false, mute: { piano: t.instrument === 'piano' && m === 'you', guitar: t.instrument === 'guitar' && m === 'you' },
      melodyVoice, melodyOn, onStop: () => { setMode('stop'); setActive(null); setCallInfo(null); }, onMelodyNote: (i) => setActive(indexMap[i] ?? null), onBeat: (b) => onBeat?.(b),
    });
    player.current = p;
    await p.start(evs, melody.map((n) => ({ beat: n.start, dur: n.dur, midi: n.midi })));
    setMode(m);
  };
  const playFull = () => startBacking(events, sorted, sorted.map((_, i) => i), 'full');
  const playYou = () => startBacking(events, [], [], 'you');
  const playLine = (from = 0, to = total) => {
    stopAll();
    const idx: number[] = [];
    const evs = sorted.map((n, i) => ({ n, i })).filter(({ n }) => n.start >= from - 1e-9 && n.start < to - 1e-9);
    evs.forEach(({ i }) => idx.push(i));
    setMode('line');
    playSequence(melodyVoice, evs.map(({ n }) => ({ midi: n.midi, start: n.start - from, dur: n.dur })), bpm, {
      label: `${name} · solo la línea · ♩ = ${bpm}`,
      swing: style === 'swing' || style === 'blues', onNote: (k) => setActive(idx[k]), onEnd: () => { setMode('stop'); setActive(null); },
    });
  };
  const sectionOf = (p: PlayerPhrase) => [Math.floor(p.start / 4) * 4, Math.min(total, Math.max(Math.floor(p.start / 4) * 4 + 4, Math.ceil((p.end - 0.01) / 4) * 4))] as const;
  const callResponse = (pi: number) => {
    const p = phrases[pi];
    const [from, to] = sectionOf(p);
    const sec = sliceEvents(events, from, to);
    const len = to - from;
    const melody = sliceLine(sorted, from, to);
    const idx = sorted.map((n, i) => ({ n, i })).filter(({ n }) => n.start >= from - 1e-9 && n.start < to - 1e-9).map(({ i }) => i);
    setCallInfo({ phrase: pi, turn: 'escucha' });
    startBacking(repeatEvents(sec, 2), melody, idx, 'call', (b) => {
      if (b < 0) return;
      setCallInfo({ phrase: pi, turn: b < len ? 'escucha' : 'tu' });
    });
  };
  const savePhrase = (pi: number) => {
    const p = phrases[pi];
    const [from, to] = sectionOf(p);
    addVocab({
      title: `${p.title.replace(/ · .*/, '')} — ${title ?? source}`,
      source, key: noteName(keyRoot), chart: eventsToChart(sliceEvents(events, from, to)),
      notes: sliceLine(sorted, from, to).map(({ midi, start, dur, tech }) => ({ midi, start, dur, tech })), instrument: t.instrument,
    });
    setSaved({ ...saved, [pi]: true });
  };
  const clickNote = async (i: number) => {
    setSel(i);
    await ensureAudio();
    triggerNotes(melodyVoice, [sorted[i].midi], 0.6);
  };

  const staffNotes = an.map((a) => ({ pitch: t.pitch(a.pitch), start: a.start, dur: a.dur, role: a.role, label: labelMode === 'degree' ? (a.role === 'approach' ? '→' : a.degree) : names(t.pitch(a.pitch)) }));
  const staffChords = events.map((e, i) => ({ start: starts[i], beats: e.beats, symbol: t.chordName(e.chord) }));
  const hl = callInfo ? sectionOf(phrases[callInfo.phrase]) : sel !== null ? null : null;
  const roles = Array.from(new Set(an.map((a) => a.role))) as NoteRole[];
  const selected: AnnotatedNote | null = sel !== null ? an[sel] : null;
  const gp = phrases[Math.min(guided, phrases.length - 1)];

  return (
    <div className="solo-player">
      {title && <h4 className="sp-title">{title}</h4>}
      {summary && <p className="sp-summary">{summary}</p>}
      <div className="transport">
        {mode === 'stop' ? (
          <>
            <button className="btn primary" onClick={playFull}>▶ Con acompañamiento</button>
            <button className="btn" onClick={() => playLine()}>▶ Solo la línea</button>
            <button className="btn" onClick={playYou} title="Suena la base sin la línea: tócala tú">▶ Base (tocas tú)</button>
          </>
        ) : (
          <button className="btn stop" onClick={stopAll}>■ Parar</button>
        )}
        <label className="tempo">♩= {bpm}<input type="range" min={40} max={240} value={bpm} onChange={(e) => { setBpm(+e.target.value); player.current?.setTempo(+e.target.value); }} /></label>
        <select value={style} onChange={(e) => setStyle(e.target.value as BackingStyle)} aria-label="Estilo">{Object.entries(STYLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
      <LayerToggles hide={['melody']} />
      {callInfo && (
        <div className={`turn ${callInfo.turn}`}>{callInfo.turn === 'escucha' ? `🎧 Escucha la frase ${callInfo.phrase + 1}…` : '🎷 ¡Tu turno! Repítela sobre los mismos acordes'}</div>
      )}
      <div className="row between wrap">
        <div className="legend roles">{roles.map((r) => <span key={r}><i style={{ background: ROLE_COLOR[r] }} />{ROLE_LABEL[r]}</span>)}</div>
        <div className="segmented sm">
          <button className={labelMode === 'degree' ? 'on' : ''} onClick={() => setLabelMode('degree')}>Grados</button>
          <button className={labelMode === 'name' ? 'on' : ''} onClick={() => setLabelMode('name')}>Notas</button>
        </div>
      </div>
      <div className="muted small">{t.isSax ? `Notas y cifrado ${t.label}. ` : t.instrument === 'guitar' ? 'Guitarra: se escribe una octava más aguda de lo que suena (convención estándar). ' : ''}Bajo cada nota: {labelMode === 'degree' ? 'su función respecto al acorde que suena' : 'su nombre'}. Toca una nota para escucharla y ver la explicación.</div>
      <TimeStaff notes={staffNotes} chords={staffChords} totalBeats={total} active={active} onNoteClick={clickNote} highlight={hl ? [hl[0], hl[1]] : null} />
      {selected && (
        <p className="note-info"><b>{names(t.pitch(selected.pitch))}</b>{t.isSax && ` (concierto ${noteName(selected.pitch, true)})`} — compás {Math.floor(selected.start / 4) + 1}, {beatText(selected.start)}: {selected.label}.</p>
      )}
      {guidedRepeat && phrases.length > 0 ? (
        <div className="guided">
          <p><b>Repite después de mí · frase {Math.min(guided, phrases.length - 1) + 1} de {phrases.length}.</b> La base toca la frase y luego repite los mismos compases sin ella: tu turno. Repite hasta que te salga sin mirar.</p>
          <p className="small">{gp.text}</p>
          <div className="row gap wrap">
            <button className="btn primary big" onClick={() => callResponse(Math.min(guided, phrases.length - 1))}>🔁 Escuchar y repetir</button>
            <button className="btn" disabled={guided === 0} onClick={() => { stopAll(); setGuided(guided - 1); }}>← Frase anterior</button>
            <button className="btn" disabled={guided >= phrases.length - 1} onClick={() => { stopAll(); setGuided(guided + 1); }}>Frase siguiente →</button>
            {!hideSave && <button className="btn" onClick={() => savePhrase(Math.min(guided, phrases.length - 1))} disabled={saved[guided]}>{saved[guided] ? '✔ En tu vocabulario' : '☆ Guardar en mi vocabulario'}</button>}
          </div>
        </div>
      ) : (
        phrases.length > 0 && (
          <ol className="phrases">
            {phrases.map((p, i) => (
              <li key={i} className={callInfo?.phrase === i ? 'on' : ''}>
                <div className="ph-head"><b>{p.title}</b>
                  <span className="ph-actions">
                    <button className="btn sm" onClick={() => playLine(p.start, p.end + 0.01)}>▶</button>
                    <button className="btn sm" onClick={() => callResponse(i)}>🔁 Repite después de mí</button>
                    {!hideSave && <button className="btn sm" onClick={() => savePhrase(i)} disabled={saved[i]}>{saved[i] ? '✔ Guardada' : '☆ Vocabulario'}</button>}
                  </span>
                </div>
                <p className="small">{p.text}</p>
              </li>
            ))}
          </ol>
        )
      )}
    </div>
  );
}

function beatText(start: number) {
  const b = start % 4;
  const whole = Math.floor(b + 1e-9) + 1;
  const frac = b - Math.floor(b + 1e-9);
  if (frac < 1e-6) return `tiempo ${whole}`;
  if (Math.abs(frac - 0.5) < 1e-6) return `contratiempo del tiempo ${whole} ("y")`;
  return `tiempo ${whole} + ${frac}`;
}

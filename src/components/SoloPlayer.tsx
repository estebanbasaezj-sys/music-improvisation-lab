// Reproductor de líneas explicadas: partitura con cifrado y colores por función, barra de práctica común
// (Escuchar ejemplo · Tocar con la base · Detener · Tempo · Repetir fragmento), explicación por frase,
// «repite después de mí» y guardado en el vocabulario.
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackingPlayer, BackingStyle, STYLE_LABEL } from '../audio/backing';
import { playSequence, stopSequence, triggerNotes, ensureAudio } from '../audio/engine';
import { TimeStaff, ROLE_COLOR } from '../instruments/TimeStaff';
import { ChordEvent } from '../theory/progressions';
import { Note, noteName } from '../theory/notes';
import { AnnotatedNote, ChosenScale, LineNote, ROLE_LABEL, analyzeLine, chordStarts, NoteRole } from '../theory/line';
import { eventsToChart, repeatEvents, sliceEvents, sliceLine } from '../theory/section';
import { addVocab } from '../progress/store';
import { useOnStopAll } from './Mixer';
import { useNames, useTransposer, voiceFor } from './common';
import { Fragment, PlayMode, PracticeBar, Turn, parseFrag } from '../practice/PracticeBar';
import { useSpot } from '../practice/spot';

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
  /** selector de tonalidad, para los controles secundarios */
  keyControl?: React.ReactNode;
}

type Mode = 'stop' | 'full' | 'line' | 'call' | 'you';
const PLAY_MODE: Record<Mode, PlayMode> = { stop: null, full: 'example', you: 'base', line: 'line', call: 'call' };

export function SoloPlayer({ events, notes, keyRoot, blues, style: style0, bpm: bpm0, phrases = [], title, summary, source, guidedRepeat, hideSave, scales, keyControl }: Props) {
  const t = useTransposer();
  const names = useNames();
  const spot = useSpot();
  const sorted = useMemo(() => [...notes].sort((a, b) => a.start - b.start), [notes]);
  const an = useMemo(() => analyzeLine(sorted, events, { keyRoot, blues, scales, names: { note: t.noteName, chord: t.chordName } }), [sorted, events, keyRoot, blues, scales, t.instrument, t.sax]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = events.reduce((s, e) => s + e.beats, 0);
  const totalBars = Math.max(1, Math.ceil(total / 4 - 1e-9));
  const starts = useMemo(() => chordStarts(events), [events]);
  const sectionOf = (p: PlayerPhrase) => [Math.floor(p.start / 4) * 4, Math.min(total, Math.max(Math.floor(p.start / 4) * 4 + 4, Math.ceil((p.end - 0.01) / 4) * 4))] as const;

  // fragmentos para «Repetir fragmento»: las frases del ejemplo o bloques de 4 compases
  const fragments = useMemo<Fragment[]>(() => {
    const out: Fragment[] = [{ id: 'all', label: `Todo (${totalBars} compás${totalBars > 1 ? 'es' : ''})` }];
    const seen = new Set(['all']);
    const add = (from: number, to: number, label: string) => {
      const id = `${from / 4 + 1}-${to / 4}`;
      if (seen.has(id) || to - from < 4 || to / 4 > totalBars) return;
      seen.add(id);
      out.push({ id, label: `${label} · c. ${from / 4 + 1}${to / 4 > from / 4 + 1 ? `–${to / 4}` : ''}` });
    };
    if (phrases.length > 1) phrases.forEach((p, i) => { const [a, b] = sectionOf(p); add(a, b, `Frase ${i + 1}`); });
    else if (totalBars > 4) for (let b = 0; b < totalBars; b += 4) add(b * 4, Math.min(totalBars, b + 4) * 4, 'Compases');
    return out;
  }, [phrases, totalBars]); // eslint-disable-line react-hooks/exhaustive-deps

  const savedBpm = Number(spot?.get('bpm'));
  const [bpm, setBpmState] = useState(() => (spot?.get('bpmBase') === String(bpm0) && savedBpm >= 40 && savedBpm <= 240 ? savedBpm : bpm0));
  const [frag, setFragState] = useState(() => { const f = spot?.get('frag'); return f && fragments.some((x) => x.id === f) ? f : 'all'; });
  const [style, setStyle] = useState<BackingStyle>(style0);
  const [active, setActive] = useState<number | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>('stop');
  const [callInfo, setCallInfo] = useState<{ phrase: number; turn: Turn } | null>(null);
  const [labelMode, setLabelMode] = useState<'degree' | 'name'>('degree');
  const [guided, setGuided] = useState(0);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<{ turn: Turn; bar: number | null; ci: number; count: number | null; evs: ChordEvent[] } | null>(null);
  const [beats, setBeats] = useState(0);
  const player = useRef<BackingPlayer | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setBpmState(bpm0); setStyle(style0);
  }, [bpm0, style0]);
  useEffect(() => () => { player.current?.stop(); stopSequence(); }, []);
  useEffect(() => { if (!first.current) stopAll(); /* nueva línea */ }, [notes, events]); // eslint-disable-line react-hooks/exhaustive-deps

  const setBpm = (n: number) => {
    setBpmState(n);
    player.current?.setTempo(n);
    spot?.set(n === bpm0 ? { bpm: null, bpmBase: null } : { bpm: n, bpmBase: bpm0 });
  };
  const range = parseFrag(frag, totalBars);
  const from = range ? (range[0] - 1) * 4 : 0;
  const to = range ? range[1] * 4 : total;

  const melodyVoice = voiceFor(t.instrument);
  const reset = () => { setMode('stop'); setActive(null); setCallInfo(null); setStatus(null); };
  const stopAll = () => { player.current?.stop(); stopSequence(); reset(); };
  useOnStopAll(reset);

  const name = title ?? 'Frase';
  const MODE_LABEL: Record<string, string> = { full: 'escuchar ejemplo', you: 'tocar con la base', call: 'repite después de mí', line: 'solo la melodía' };
  const startBacking = async (evs: ChordEvent[], melody: LineNote[], indexMap: number[], m: Mode, offsetBars: number, callLen = 0) => {
    stopAll();
    spot?.started();
    setBeats(0);
    setStatus({ turn: m === 'you' ? 'tu' : 'escucha', bar: null, ci: 0, count: 1, evs });
    const p = new BackingPlayer({
      label: `${name} · ${MODE_LABEL[m]}`,
      style, bpm, countIn: true, metronome: false, mute: { piano: t.instrument === 'piano' && m === 'you', guitar: t.instrument === 'guitar' && m === 'you' },
      melodyVoice, melodyOn: m !== 'you', onStop: reset, onMelodyNote: (i) => setActive(indexMap[i] ?? null),
      onChord: (i) => setStatus((s) => (s ? { ...s, ci: i } : s)),
      onBeat: (b) => {
        if (b < 0) { setStatus((s) => (s ? { ...s, count: b + 5 } : s)); return; }
        if (m === 'you') setBeats((x) => x + 1);
        const turn: Turn = m === 'call' ? (b < callLen ? 'escucha' : 'tu') : m === 'you' ? 'tu' : 'escucha';
        const barIn = Math.floor(b / 4);
        const bar = offsetBars + (m === 'call' ? barIn % Math.max(1, callLen / 4) : barIn) + 1;
        setStatus((s) => (s ? { ...s, count: null, turn, bar } : s));
        if (m === 'call') setCallInfo((c) => (c ? { ...c, turn } : c));
      },
    });
    player.current = p;
    await p.start(evs, melody.map((n) => ({ beat: n.start, dur: n.dur, midi: n.midi })));
    setMode(m);
  };
  const fragPlay = (m: Mode) => {
    const evs = range ? sliceEvents(events, from, to) : events;
    const mel = m === 'you' ? [] : range ? sliceLine(sorted, from, to) : sorted;
    const idx = m === 'you' ? [] : sorted.map((n, i) => ({ n, i })).filter(({ n }) => n.start >= from - 1e-9 && n.start < to - 1e-9).map(({ i }) => i);
    return startBacking(evs, mel, idx, m, from / 4);
  };
  const playFull = () => fragPlay('full');
  const playYou = () => fragPlay('you');
  const playLine = (a = from, b = to) => {
    stopAll();
    spot?.started();
    const idx: number[] = [];
    const evs = sorted.map((n, i) => ({ n, i })).filter(({ n }) => n.start >= a - 1e-9 && n.start < b - 1e-9);
    evs.forEach(({ i }) => idx.push(i));
    setMode('line');
    setStatus({ turn: 'escucha', bar: Math.floor(a / 4) + 1, ci: 0, count: null, evs: [] });
    playSequence(melodyVoice, evs.map(({ n }) => ({ midi: n.midi, start: n.start - a, dur: n.dur })), bpm, {
      label: `${name} · solo la melodía · ♩ = ${bpm}`,
      swing: style === 'swing' || style === 'blues',
      onNote: (k) => { setActive(idx[k]); setStatus((s) => (s ? { ...s, bar: Math.floor(sorted[idx[k]].start / 4) + 1 } : s)); },
      onEnd: () => reset(),
    });
  };
  const callResponse = (pi: number) => {
    const p = phrases[pi];
    const [a, b] = sectionOf(p);
    const sec = sliceEvents(events, a, b);
    const melody = sliceLine(sorted, a, b);
    const idx = sorted.map((n, i) => ({ n, i })).filter(({ n }) => n.start >= a - 1e-9 && n.start < b - 1e-9).map(({ i }) => i);
    setCallInfo({ phrase: pi, turn: 'escucha' });
    void startBacking(repeatEvents(sec, 2), melody, idx, 'call', a / 4, b - a);
  };
  const saveRange = (a: number, b: number, label: string) => {
    addVocab({
      title: `${label} — ${title ?? source}`,
      source, key: noteName(keyRoot), chart: eventsToChart(sliceEvents(events, a, b)),
      notes: sliceLine(sorted, a, b).map(({ midi, start, dur, tech }) => ({ midi, start, dur, tech })), instrument: t.instrument,
    });
    setSaved((x) => ({ ...x, [`${a}-${b}`]: true }));
  };
  const savePhrase = (pi: number) => { const p = phrases[pi]; const [a, b] = sectionOf(p); saveRange(a, b, p.title.replace(/ · .*/, '')); };
  const isSaved = (pi: number) => { const [a, b] = sectionOf(phrases[pi]); return !!saved[`${a}-${b}`]; };
  const clickNote = async (i: number) => {
    setSel(i);
    await ensureAudio();
    triggerNotes(melodyVoice, [sorted[i].midi], 0.6);
  };
  const changeFrag = (id: string) => {
    stopAll();
    setFragState(id);
    spot?.set({ frag: id === 'all' ? null : id });
  };

  const staffNotes = an.map((a) => ({ pitch: t.pitch(a.pitch), start: a.start, dur: a.dur, role: a.role, label: labelMode === 'degree' ? (a.role === 'approach' ? '→' : a.degree) : names(t.pitch(a.pitch)) }));
  const staffChords = events.map((e, i) => ({ start: starts[i], beats: e.beats, symbol: t.chordName(e.chord) }));
  const hl = callInfo ? sectionOf(phrases[callInfo.phrase]) : range ? ([from, to] as const) : null;
  const roles = Array.from(new Set(an.map((a) => a.role))) as NoteRole[];
  const selected: AnnotatedNote | null = sel !== null ? an[sel] : null;
  const gi = Math.min(guided, phrases.length - 1);
  const gp = phrases[gi];
  const evsNow = status?.evs ?? [];
  const chordNow = evsNow[status?.ci ?? 0];
  const chordNext = evsNow.length ? evsNow[((status?.ci ?? 0) + 1) % evsNow.length] : undefined;
  const fragLabel = range ? `c. ${range[0]}–${range[1]}` : '';

  return (
    <div className="solo-player">
      {title && <h4 className="sp-title">{title}</h4>}
      {summary && <p className="sp-summary">{summary}</p>}
      <PracticeBar
        playing={PLAY_MODE[mode]}
        onExample={playFull}
        onBase={playYou}
        onStop={stopAll}
        bpm={bpm}
        onBpm={setBpm}
        fragments={fragments}
        frag={frag}
        onFrag={changeFrag}
        status={status && { turn: status.turn, bar: status.bar, bars: totalBars, count: status.count, chord: chordNow && t.chordName(chordNow.chord), next: chordNext && t.chordName(chordNext.chord) }}
        hideLayers={['melody']}
        keyControl={keyControl ?? (t.isSax ? <p className="small muted">Partitura y cifrado escritos para {t.label.replace('escrito para ', '')}. El audio suena en concierto.</p> : undefined)}
        readingAids={
          <div className="segmented sm" role="radiogroup" aria-label="Bajo cada nota">
            <button role="radio" aria-checked={labelMode === 'degree'} className={labelMode === 'degree' ? 'on' : ''} onClick={() => setLabelMode('degree')}>Grados</button>
            <button role="radio" aria-checked={labelMode === 'name'} className={labelMode === 'name' ? 'on' : ''} onClick={() => setLabelMode('name')}>Nombres de nota</button>
          </div>
        }
        more={
          <div className="row gap wrap">
            <button type="button" className="btn sm" onClick={() => playLine()}>▶ Solo la melodía{fragLabel && ` (${fragLabel})`}</button>
            <label className="field inline"><span>Estilo</span>
              <select value={style} onChange={(e) => setStyle(e.target.value as BackingStyle)} aria-label="Estilo">{Object.entries(STYLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </label>
          </div>
        }
        attempt={{ context: `${title ?? source}${fragLabel ? ` (${fragLabel})` : ''}`, beatsPlayed: beats, onSavePhrase: hideSave ? undefined : () => saveRange(from, to, range ? `Compases ${range[0]}–${range[1]}` : 'Frase'), phraseSaved: !!saved[`${from}-${to}`] }}
      />
      {callInfo && (
        <div className={`turn ${callInfo.turn}`}>{callInfo.turn === 'escucha' ? `🎧 Escucha la frase ${callInfo.phrase + 1}…` : '🎷 ¡Tu turno! Repítela sobre los mismos acordes'}</div>
      )}
      <div className="legend roles" aria-label="Colores de la partitura">{roles.map((r) => <span key={r}><i style={{ background: ROLE_COLOR[r] }} />{ROLE_LABEL[r]}</span>)}</div>
      <TimeStaff notes={staffNotes} chords={staffChords} totalBeats={total} active={active} onNoteClick={clickNote} highlight={hl ? [hl[0], hl[1]] : null} />
      <p className="muted small">Bajo cada nota: {labelMode === 'degree' ? 'su función respecto al acorde que suena' : 'su nombre'}{t.isSax ? ` (${t.label})` : t.instrument === 'guitar' ? ' (la guitarra se escribe una octava más aguda de lo que suena)' : ''}. Toca una nota para oírla y ver la explicación.</p>
      {selected && (
        <p className="note-info"><b>{names(t.pitch(selected.pitch))}</b>{t.isSax && ` (concierto ${noteName(selected.pitch, true)})`} — compás {Math.floor(selected.start / 4) + 1}, {beatText(selected.start)}: {selected.label}.</p>
      )}
      {guidedRepeat && phrases.length > 0 ? (
        <div className="guided">
          <p><b>Repite después de mí · frase {gi + 1} de {phrases.length}.</b> La base toca la frase y luego repite los mismos compases sin ella: tu turno. Repite hasta que te salga sin mirar.</p>
          <p className="small">{gp.text}</p>
          <div className="row gap wrap">
            <button className="btn primary big" onClick={() => callResponse(gi)}>🔁 Escuchar y repetir</button>
            <button className="btn" disabled={guided === 0} onClick={() => { stopAll(); setGuided(guided - 1); }}>← Frase anterior</button>
            <button className="btn" disabled={guided >= phrases.length - 1} onClick={() => { stopAll(); setGuided(guided + 1); }}>Frase siguiente →</button>
            {!hideSave && <button className="btn" onClick={() => savePhrase(gi)} disabled={isSaved(gi)}>{isSaved(gi) ? '✓ En tu vocabulario' : '☆ Guardar en mi vocabulario'}</button>}
          </div>
        </div>
      ) : (
        phrases.length > 0 && (
          <ol className="phrases">
            {phrases.map((p, i) => (
              <li key={i} className={callInfo?.phrase === i ? 'on' : ''}>
                <div className="ph-head"><b>{p.title}</b>
                  <span className="ph-actions">
                    <button className="btn sm" onClick={() => playLine(p.start, p.end + 0.01)} aria-label={`Escuchar ${p.title}`}>▶</button>
                    <button className="btn sm" onClick={() => callResponse(i)}>🔁 Repite después de mí</button>
                    {!hideSave && <button className="btn sm" onClick={() => savePhrase(i)} disabled={isSaved(i)}>{isSaved(i) ? '✓ Guardada' : '☆ Vocabulario'}</button>}
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

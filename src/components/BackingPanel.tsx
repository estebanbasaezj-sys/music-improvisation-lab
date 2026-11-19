import { useEffect, useMemo, useRef, useState } from 'react';
import { BackingPlayer, BackingStyle, STYLE_LABEL } from '../audio/backing';
import { Chord, chordNotes, chordPitches, guideToneLines, seventhOf, thirdOf } from '../theory/chords';
import { ChordEvent, analyze } from '../theory/progressions';
import { Note, midi, pc, pitchFromMidi } from '../theory/notes';
import { scaleById, scaleNotes } from '../theory/scales';
import { fingeringMidis, fingeringsFor } from '../theory/instruments';
import { ChordDiagram } from '../instruments/ChordDiagram';
import { InstrumentView, ViewNote } from './InstrumentView';
import { chordViewNotes } from './ChordsView';
import { Segmented, playMidi, useTransposer } from './common';
import { LayerToggles, useOnStopAll } from './Mixer';

export type Display = 'chords' | 'guide' | 'scales' | 'arpeggios';

interface Props {
  events: ChordEvent[];
  style: BackingStyle;
  bpm: number;
  display?: Display;
  /** escala fija relativa a una tónica (p.ej. pentatónica menor sobre todo el blues) */
  fixedScale?: { scale: string; root: Note } | null;
  melody?: { beat: number; dur: number; midi: number }[];
  showAnalysis?: boolean;
  sections?: { label: string; fromBar: number; toBar: number }[];
  onPlayingChange?: (p: boolean) => void;
}

export function BackingPanel({ events, style: style0, bpm: bpm0, display: display0 = 'chords', fixedScale, melody, showAnalysis, sections, onPlayingChange }: Props) {
  const t = useTransposer();
  const [style, setStyle] = useState<BackingStyle>(style0);
  const [bpm, setBpm] = useState(bpm0);
  const [display, setDisplay] = useState<Display>(display0);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [beat, setBeat] = useState<number | null>(null);
  const [chorus, setChorus] = useState(0);
  const [countIn, setCountIn] = useState(true);
  const [concert, setConcert] = useState(false);
  const player = useRef<BackingPlayer | null>(null);

  useEffect(() => { setStyle(style0); setBpm(bpm0); }, [style0, bpm0]);
  useEffect(() => () => player.current?.stop(), []);
  useOnStopAll(() => { setPlaying(false); setBeat(null); onPlayingChange?.(false); });
  // si cambia la progresión (tonalidad, estilo) mientras suena, reiniciar
  useEffect(() => {
    if (playing) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, style]);

  const start = async () => {
    player.current?.stop();
    const p = new BackingPlayer({
      style, bpm, countIn, metronome: false,
      melodyVoice: t.instrument === 'guitar' ? 'guitar' : t.instrument === 'piano' ? 'piano' : 'sax',
      onChord: (i) => setCur(i),
      onStop: () => { setPlaying(false); setBeat(null); onPlayingChange?.(false); },
      onBeat: (b, c) => { setBeat(b); setChorus(c); },
    });
    player.current = p;
    await p.start(events, melody);
    setPlaying(true);
    onPlayingChange?.(true);
  };
  const stop = () => {
    player.current?.stop();
    setPlaying(false);
    setBeat(null);
    onPlayingChange?.(false);
  };

  const bars = useMemo(() => {
    const out: { idx: number; ev: ChordEvent }[][] = [];
    events.forEach((ev, idx) => (out[ev.bar] ??= []).push({ idx, ev }));
    return out;
  }, [events]);
  const marks = useMemo(() => (showAnalysis ? analyze(events) : []), [events, showAnalysis]);
  const guide = useMemo(() => guideToneLines(events.map((e) => e.chord)), [events]);
  const c = events[cur]?.chord ?? events[0].chord;

  const nameOf = (ch: Chord) => (concert || !t.isSax ? ch.root && chordName(ch) : t.chordName(ch));
  const chordName = (ch: Chord) => {
    const n = ch.root;
    const L = 'CDEFGAB'[n.letter] + (n.acc > 0 ? '♯'.repeat(n.acc) : '♭'.repeat(-n.acc));
    return L + (ch.quality.id === 'maj' ? '' : ch.quality.id);
  };

  let view: ViewNote[] = chordViewNotes(c);
  let info: React.ReactNode = null;
  if (display === 'scales') {
    if (fixedScale) {
      const s = scaleById(fixedScale.scale);
      const ns = scaleNotes(fixedScale.root, s);
      const chordPcs = chordNotes(c).map(pc);
      view = ns.map((n, i) => ({ note: n, degree: s.degrees[i], role: i === 0 ? 'root' : chordPcs.includes(pc(n)) ? 'chord' : 'scale' }));
      info = <p><b>{t.noteName(fixedScale.root)} {s.name}</b> sobre todo el tema. En azul, las notas que además pertenecen al acorde que suena ({nameOf(c)}): son los mejores puntos de apoyo.</p>;
    } else {
      const opt = c.quality.scales[0];
      if (opt) {
        const s = scaleById(opt.id);
        const ns = scaleNotes(c.root, s);
        const chordPcs = chordNotes(c).map(pc);
        view = ns.map((n, i) => ({ note: n, degree: s.degrees[i], role: i === 0 ? 'root' : chordPcs.includes(pc(n)) ? 'chord' : 'scale' }));
        info = (
          <div>
            <p><b>{nameOf(c)} → {t.noteName(c.root)} {s.name}.</b> {opt.why}</p>
            {c.quality.scales.slice(1).map((o) => <p key={o.id} className="muted small">Alternativa: {scaleById(o.id).name} — {o.why}</p>)}
          </div>
        );
      }
    }
  } else if (display === 'guide') {
    const g3 = thirdOf(c);
    const g7 = seventhOf(c);
    view = chordViewNotes(c).map((v) => ({ ...v, role: (g3 && pc(v.note) === pc(g3)) || (g7 && pc(v.note) === pc(g7)) ? 'guide' : v.degree === '1' ? 'root' : 'chord' }));
    info = <p>Notas guía de <b>{nameOf(c)}</b>: 3ª = <b>{g3 && t.noteName(g3)}</b>, 7ª = <b>{g7 && t.noteName(g7)}</b>. La línea de abajo une 3ªs y 7ªs con el menor movimiento posible.</p>;
  } else if (display === 'arpeggios') {
    info = <p>Arpegio de <b>{nameOf(c)}</b>: {chordNotes(c).map((n) => t.noteName(n)).join(' – ')}. Toca 1-3-5-7 y 7-5-3-1, cambiando exactamente cuando cambia el acorde.</p>;
  } else {
    info = <p><b>{nameOf(c)}</b> ({c.quality.name}): {chordNotes(c).map((n) => t.noteName(n)).join(' ')}.</p>;
  }

  return (
    <div className="backing">
      <div className="transport">
        <button className={`btn play ${playing ? 'stop' : 'primary'}`} onClick={playing ? stop : start}>{playing ? '■ Parar' : '▶ Acompañamiento'}</button>
        <label className="tempo">♩= {bpm}<input type="range" min={40} max={260} value={bpm} onChange={(e) => { setBpm(+e.target.value); player.current?.setTempo(+e.target.value); }} /></label>
        <select value={style} onChange={(e) => setStyle(e.target.value as BackingStyle)} aria-label="Estilo">
          {Object.entries(STYLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="beats" aria-label="pulso">
          {[0, 1, 2, 3].map((b) => <span key={b} className={`beat ${beat !== null && ((beat % 4) + 4) % 4 === b ? (beat < 0 ? 'count' : 'on') : ''}`} />)}
          {playing && <span className="muted small">{beat !== null && beat < 0 ? 'cuenta…' : `chorus ${chorus || 1}`}</span>}
        </div>
      </div>
      <div className="mixer">
        <LayerToggles hide={melody && melody.length > 0 ? [] : ['melody']} />
        <label className="toggle"><input type="checkbox" checked={countIn} onChange={() => setCountIn(!countIn)} />Cuenta 4</label>
        {t.isSax && <label className="toggle"><input type="checkbox" checked={concert} onChange={() => setConcert(!concert)} />Cifrado de concierto</label>}
      </div>
      {t.isSax && <div className="muted small">Cifrado {concert ? 'de concierto (como lo lee el pianista)' : `transpuesto: ${t.label}`}. El audio suena en concierto.</div>}
      <div className="chart">
        {bars.map((bar, bi) => {
          const sec = sections?.find((s) => s.fromBar === bi);
          return (
            <div key={bi} className={`bar ${bar.some((x) => x.idx === cur) && playing ? 'cur' : ''}`}>
              {sec && <span className="sec">{sec.label}</span>}
              {bar.map(({ idx, ev }) => (
                <button key={idx} className={`cell ${idx === cur ? 'on' : ''}`} onClick={() => { setCur(idx); playMidi(t.instrument === 'sax' ? 'piano' : t.instrument, clickMidis(ev.chord, t.instrument === 'guitar'), 1.2); }}>
                  {nameOf(ev.chord)}
                  {ev.roman && <small>{ev.roman}</small>}
                </button>
              ))}
            </div>
          );
        })}
      </div>
      {marks.length > 0 && (
        <details className="analysis" open>
          <summary>Análisis armónico automático</summary>
          <ul>{marks.map((m, i) => <li key={i}><button className="link" onClick={() => setCur(m.start)}>Compás {events[m.start].bar + 1}</button>: {m.label}</li>)}</ul>
        </details>
      )}
      <Segmented size="sm" value={display} onChange={setDisplay} options={[{ value: 'chords', label: 'Acordes' }, { value: 'arpeggios', label: 'Arpegios' }, { value: 'guide', label: 'Notas guía' }, { value: 'scales', label: 'Escalas' }]} />
      <div className="info">{info}</div>
      {t.instrument === 'guitar' && display === 'chords' && (
        <div className="diagrams">{fingeringsFor(c).filter((f) => f.shape.kind === 'shell' || f.shape.kind === 'drop2' || f.shape.kind === 'drop3').slice(0, 4).map((f, i) => <ChordDiagram key={i} chord={c} f={f} onPlay={() => playMidi('guitar', fingeringMidis(f), 1.4)} />)}</div>
      )}
      {display === 'guide' ? (
        <InstrumentView notes={view} sequence={guide.upper} durations={events.map((e) => e.beats)} active={cur} labelMode="name" forceView={t.isSax ? 'staff' : undefined} />
      ) : (
        <InstrumentView notes={view} labelMode="degree" sequence={t.isSax ? chordSeq(c) : undefined} />
      )}
      {display === 'guide' && t.instrument !== 'sax' && (
        <div className="muted small">Línea superior de notas guía: {guide.upper.map((p, i) => `${nameOf(events[i].chord)}: ${t.noteName(p)}`).join(' → ')}</div>
      )}
    </div>
  );
}

function chordSeq(c: Chord) {
  let base = 60 + pc(c.root);
  if (base > 66) base -= 12;
  return chordNotes(c).map((n) => {
    let m = base;
    while (((m % 12) + 12) % 12 !== pc(n)) m++;
    return pitchFromMidi(m, n);
  });
}

function clickMidis(c: Chord, guitar: boolean): number[] {
  const f = guitar ? fingeringsFor(c)[0] : undefined;
  return f ? fingeringMidis(f) : chordPitches(c, 3).map(midi);
}

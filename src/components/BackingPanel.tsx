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
import { useOnStopAll } from './Mixer';
import { PlayMode, PracticeBar, barFragments, parseFrag } from '../practice/PracticeBar';
import { useSpot } from '../practice/spot';

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
  /** selector de tonalidad, para los controles secundarios */
  keyControl?: React.ReactNode;
  /** de qué se trata (para el cierre del intento y la grabación) */
  context?: string;
  /** ejemplo opcional que suena con «Escuchar ejemplo» */
  exampleNotes?: { beat: number; dur: number; midi: number }[];
}

export function BackingPanel({ events: allEvents, style: style0, bpm: bpm0, display: display0 = 'chords', fixedScale, melody, showAnalysis, sections, onPlayingChange, keyControl, context, exampleNotes }: Props) {
  const t = useTransposer();
  const spot = useSpot();
  const totalBars = useMemo(() => Math.max(1, Math.ceil(allEvents.reduce((s, e) => s + e.beats, 0) / 4 - 1e-9)), [allEvents]);
  const fragments = useMemo(() => barFragments(totalBars, sections), [totalBars, sections]);
  const savedBpm = Number(spot?.get('bpm'));
  const [style, setStyle] = useState<BackingStyle>(style0);
  const [bpm, setBpmState] = useState(() => (spot?.get('bpmBase') === String(bpm0) && savedBpm >= 40 && savedBpm <= 260 ? savedBpm : bpm0));
  const [frag, setFrag] = useState(() => { const f = spot?.get('frag'); return f && fragments.some((x) => x.id === f) ? f : 'all'; });
  const [display, setDisplay] = useState<Display>(display0);
  const [playing, setPlaying] = useState<PlayMode>(null);
  const [cur, setCur] = useState(0);
  const [beat, setBeat] = useState<number | null>(null);
  const [chorus, setChorus] = useState(0);
  const [beats, setBeats] = useState(0);
  const [countIn, setCountIn] = useState(true);
  const [concert, setConcert] = useState(false);
  const player = useRef<BackingPlayer | null>(null);
  const first = useRef(true);
  const range = parseFrag(frag, totalBars);
  const offsetIdx = range ? allEvents.findIndex((e) => e.bar >= range[0] - 1) : 0;
  const events = useMemo(() => (range ? allEvents.filter((e) => e.bar >= range[0] - 1 && e.bar <= range[1] - 1).map((e) => ({ ...e, bar: e.bar - (range[0] - 1) })) : allEvents), [allEvents, frag]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setStyle(style0); setBpmState(bpm0);
  }, [style0, bpm0]);
  useEffect(() => () => player.current?.stop(), []);
  useOnStopAll(() => { setPlaying(null); setBeat(null); onPlayingChange?.(false); });
  // si cambia la progresión (tonalidad, estilo o fragmento) mientras suena, reiniciar
  useEffect(() => {
    if (playing) void start(playing === 'example' ? 'example' : 'base');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, style]);

  const start = async (m: 'base' | 'example' = 'base') => {
    player.current?.stop(true);
    spot?.started();
    setBeats(0);
    setBeat(-5);
    const withMelody = m === 'example' && !!exampleNotes?.length;
    const p = new BackingPlayer({
      style, bpm, countIn, metronome: false, label: `${withMelody ? 'Ejemplo' : 'Tocar con la base'} · ${STYLE_LABEL[style]}`,
      melodyVoice: t.instrument === 'guitar' ? 'guitar' : t.instrument === 'piano' ? 'piano' : 'sax',
      mute: { piano: t.instrument === 'piano' && !withMelody, guitar: t.instrument === 'guitar' && !withMelody },
      onChord: (i) => setCur(i + offsetIdx),
      onStop: () => { setPlaying(null); setBeat(null); onPlayingChange?.(false); },
      onBeat: (b, c) => { setBeat(b); setChorus(c); if (b >= 0 && !withMelody) setBeats((x) => x + 1); },
    });
    player.current = p;
    const mel = withMelody ? exampleNotes!.filter((n) => !range || (n.beat >= (range[0] - 1) * 4 && n.beat < range[1] * 4)).map((n) => ({ ...n, beat: n.beat - (range ? (range[0] - 1) * 4 : 0) })) : melody;
    await p.start(events, mel);
    setPlaying(withMelody ? 'example' : 'base');
    onPlayingChange?.(true);
  };
  const stop = () => {
    player.current?.stop();
    setPlaying(null);
    setBeat(null);
    onPlayingChange?.(false);
  };
  const setBpm = (n: number) => {
    setBpmState(n);
    player.current?.setTempo(n);
    spot?.set(n === bpm0 ? { bpm: null, bpmBase: null } : { bpm: n, bpmBase: bpm0 });
  };
  const changeFrag = (id: string) => {
    setFrag(id);
    spot?.set({ frag: id === 'all' ? null : id });
  };

  const bars = useMemo(() => {
    const out: { idx: number; ev: ChordEvent }[][] = [];
    allEvents.forEach((ev, idx) => (out[ev.bar] ??= []).push({ idx, ev }));
    return out;
  }, [allEvents]);
  const marks = useMemo(() => (showAnalysis ? analyze(allEvents) : []), [allEvents, showAnalysis]);
  const guide = useMemo(() => guideToneLines(allEvents.map((e) => e.chord)), [allEvents]);
  const c = allEvents[cur]?.chord ?? allEvents[0].chord;

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
      <PracticeBar
        playing={playing}
        onExample={exampleNotes?.length ? () => start('example') : undefined}
        onBase={() => start('base')}
        onStop={stop}
        bpm={bpm}
        onBpm={setBpm}
        max={260}
        fragments={fragments}
        frag={frag}
        onFrag={changeFrag}
        status={playing ? {
          turn: playing === 'example' ? 'escucha' : 'tu',
          bar: beat !== null && beat >= 0 ? (range ? range[0] - 1 : 0) + Math.floor(beat / 4) + 1 : null,
          bars: totalBars,
          count: beat !== null && beat < 0 ? beat + 5 : null,
          chord: allEvents[cur] && nameOf(allEvents[cur].chord),
          next: events.length ? nameOf(allEvents[offsetIdx + ((cur - offsetIdx + 1) % events.length)]?.chord ?? allEvents[cur].chord) : undefined,
        } : null}
        hideLayers={exampleNotes?.length ? [] : ['melody']}
        keyControl={(keyControl || t.isSax) && (
          <div className="row gap wrap">
            {keyControl}
            {t.isSax && <label className="toggle"><input type="checkbox" checked={concert} onChange={() => setConcert(!concert)} />Cifrado de concierto (como lo lee el pianista)</label>}
          </div>
        )}
        readingAids={<Segmented size="sm" value={display} onChange={setDisplay} options={[{ value: 'chords', label: 'Acordes' }, { value: 'arpeggios', label: 'Arpegios' }, { value: 'guide', label: 'Notas guía' }, { value: 'scales', label: 'Escalas' }]} />}
        more={
          <div className="row gap wrap">
            <label className="field inline"><span>Estilo</span>
              <select value={style} onChange={(e) => setStyle(e.target.value as BackingStyle)} aria-label="Estilo">
                {Object.entries(STYLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="toggle"><input type="checkbox" checked={countIn} onChange={() => setCountIn(!countIn)} />Cuenta de 4 antes de empezar</label>
            {playing && <span className="muted small">Vuelta {chorus || 1}</span>}
          </div>
        }
        attempt={{ context: context ?? 'Tocar con la base', beatsPlayed: beats }}
      />
      {t.isSax && <div className="muted small">Cifrado {concert ? 'de concierto (como lo lee el pianista)' : `transpuesto: ${t.label}`}. El audio suena en concierto.</div>}
      <div className="chart">
        {bars.map((bar, bi) => {
          const sec = sections?.find((s) => s.fromBar === bi);
          return (
            <div key={bi} className={`bar ${bar.some((x) => x.idx === cur) && playing ? 'cur' : ''} ${range && (bi < range[0] - 1 || bi > range[1] - 1) ? 'out' : ''}`}>
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

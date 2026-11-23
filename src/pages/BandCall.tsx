// Primera práctica recomendada: «Responde a la banda con tres notas» (5 minutos, sin micrófono).
// La banda toca una frase corta de 2 compases (🎧 Escucha) y deja 2 compases libres (🎷 Tu turno) para
// contestar con las mismas tres notas. Cada vuelta trae una llamada distinta.
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackingPlayer, BackingStyle } from '../audio/backing';
import { ensureAudio, triggerNotes } from '../audio/engine';
import { ChordEvent, parseChart } from '../theory/progressions';
import { pitchFromMidi } from '../theory/notes';
import { INSTRUMENT_LABEL, InstrumentId, SAX_TRANSPOSITION, SaxType } from '../theory/instruments';
import { TimeStaff } from '../instruments/TimeStaff';
import { FingeringDiagram } from '../learn/widgets';
import { InstrumentView } from '../components/InstrumentView';
import { useOnStopAll } from '../components/Mixer';
import { useNames, useTransposer, voiceFor } from '../components/common';
import { addXp, logPractice, unlockAchievement, useAppState } from '../progress/store';
import { PracticeBar, Turn } from '../practice/PracticeBar';
import { SpotProvider, useInitialParams, useSpot } from '../practice/spot';
import { replaceParams } from '../router';
import { trackFeature } from '../telemetry/telemetry';

export const BAND_TITLE = 'Responde a la banda con tres notas';
export const BAND_MINUTES = 5;
export const BAND_ROUTE = '#/practica/banda';

/** Tres notas fáciles en cada instrumento (alturas de concierto) y la base que las acompaña. */
export function bandSetup(inst: InstrumentId, sax: SaxType) {
  if (inst === 'sax') {
    // escritas Sol–La–Si (solo mano izquierda: las primeras notas del saxo)
    const shift = SAX_TRANSPOSITION[sax].iv.semitones;
    const tonic = sax === 'tenor' ? 'F' : 'Bb';
    const four = sax === 'tenor' ? 'Bb' : 'Eb';
    return { notes: [67, 69, 71].map((m) => m - shift), chart: `${tonic}maj7 | ${tonic}maj7 | ${four}maj7 | ${tonic}maj7 |`, written: ['G4', 'A4', 'B4'] };
  }
  if (inst === 'guitar') return { notes: [55, 57, 59], chart: 'Gmaj7 | Gmaj7 | Cmaj7 | Gmaj7 |', written: [] as string[] }; // 3ª cuerda: al aire, traste 2 y 4
  return { notes: [60, 62, 64], chart: 'Cmaj7 | Cmaj7 | Fmaj7 | Cmaj7 |', written: [] as string[] }; // dedos 1-2-3 de la mano derecha
}

// llamadas de la banda (índice de nota 0..2, inicio y duración en tiempos dentro de 2 compases)
const CALLS: { n: number; s: number; d: number }[][] = [
  [{ n: 0, s: 0, d: 1 }, { n: 1, s: 1, d: 1 }, { n: 2, s: 2, d: 2 }],
  [{ n: 2, s: 0, d: 1 }, { n: 1, s: 1, d: 1 }, { n: 0, s: 2, d: 2 }],
  [{ n: 0, s: 0, d: 0.5 }, { n: 0, s: 0.5, d: 0.5 }, { n: 2, s: 1, d: 1 }, { n: 1, s: 2.5, d: 1.5 }],
  [{ n: 1, s: 0.5, d: 0.5 }, { n: 2, s: 1, d: 1 }, { n: 1, s: 2, d: 1 }, { n: 0, s: 3, d: 2 }],
];
// respuestas de ejemplo (en los compases 3–4 de cada vuelta)
const ANSWERS: { n: number; s: number; d: number }[][] = [
  [{ n: 2, s: 0, d: 1 }, { n: 1, s: 1, d: 1 }, { n: 0, s: 2, d: 2 }],
  [{ n: 0, s: 0, d: 1 }, { n: 1, s: 1, d: 1 }, { n: 2, s: 2, d: 2 }],
  [{ n: 1, s: 0, d: 0.5 }, { n: 1, s: 0.5, d: 0.5 }, { n: 0, s: 1, d: 1 }, { n: 2, s: 2.5, d: 1.5 }],
  [{ n: 2, s: 0.5, d: 0.5 }, { n: 1, s: 1, d: 1 }, { n: 0, s: 2, d: 2 }],
];

export function BandCallPage() {
  const s = useAppState();
  const t = useTransposer();
  return (
    <SpotProvider describe={(p) => ({
      id: 'banda', title: BAND_TITLE, minutes: BAND_MINUTES,
      detail: `${p.get('frag') ? `Llamada ${p.get('frag')}` : 'Las 4 llamadas'} · ♩ = ${p.get('bpm') ?? 80} · ${INSTRUMENT_LABEL[s.instrument]}${t.isSax ? ` ${s.settings.saxType}` : ''}`,
    })}>
      <BandCall key={`${s.instrument}-${s.settings.saxType}`} />
    </SpotProvider>
  );
}

function BandCall() {
  const s = useAppState();
  const t = useTransposer();
  const names = useNames();
  const spot = useSpot();
  const params = useInitialParams();
  const inst = s.instrument;
  const setup = useMemo(() => bandSetup(inst, s.settings.saxType), [inst, s.settings.saxType]);
  const voice = voiceFor(inst);
  const style: BackingStyle = 'swing';
  const unit = useMemo(() => parseChart(setup.chart), [setup.chart]);
  const [bpm, setBpmState] = useState(() => { const b = Number(params.get('bpm')); return b >= 50 && b <= 160 ? b : 80; });
  const [frag, setFrag] = useState(() => { const f = params.get('frag'); return f && /^[1-4]$/.test(f) ? f : 'all'; });
  const [playing, setPlaying] = useState<'example' | 'base' | null>(null);
  const [st, setSt] = useState<{ turn: Turn; bar: number | null; count: number | null; ci: number } | null>(null);
  const [beats, setBeats] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [played, setPlayed] = useState(() => { try { return Number(sessionStorage.getItem('mil-banda-secs') ?? 0) || 0; } catch { return 0; } });
  const [done, setDone] = useState(false);
  const player = useRef<BackingPlayer | null>(null);
  const tick = useRef(0);

  // 4 vueltas de 4 compases: llamada (2) + tu turno (2)
  const callsIn = frag === 'all' ? [0, 1, 2, 3] : [Number(frag) - 1];
  const events: ChordEvent[] = useMemo(() => callsIn.flatMap((_, k) => unit.map((e) => ({ ...e, bar: e.bar + k * 4 }))), [unit, frag]); // eslint-disable-line react-hooks/exhaustive-deps
  const callNotes = (withAnswers: boolean) => callsIn.flatMap((c, k) => [
    ...CALLS[c].map((x) => ({ midi: setup.notes[x.n], start: k * 16 + x.s, dur: x.d })),
    ...(withAnswers ? ANSWERS[c].map((x) => ({ midi: setup.notes[x.n], start: k * 16 + 8 + x.s, dur: x.d })) : []),
  ]);
  const staffCalls = callNotes(playing === 'example');
  const totalBars = callsIn.length * 4;

  const reset = () => { setPlaying(null); setSt(null); setActive(null); clearInterval(tick.current); };
  useOnStopAll(reset);
  useEffect(() => () => { player.current?.stop(); clearInterval(tick.current); }, []);
  useEffect(() => { try { sessionStorage.setItem('mil-banda-secs', String(played)); } catch { /* nada */ } }, [played]);
  useEffect(() => {
    if (played >= BAND_MINUTES * 60 && !done) {
      setDone(true);
      addXp(10);
      logPractice(inst, BAND_MINUTES);
      unlockAchievement('first-lesson');
      trackFeature('banda-completa');
    }
  }, [played, done, inst]);

  const start = async (m: 'example' | 'base') => {
    player.current?.stop(true);
    spot?.started();
    setBeats(0);
    setSt({ turn: 'escucha', bar: null, count: 1, ci: 0 });
    const notes = callNotes(m === 'example');
    const p = new BackingPlayer({
      style, bpm, countIn: true, metronome: false, label: `${BAND_TITLE} · ${m === 'example' ? 'ejemplo' : 'tu turno'}`,
      melodyVoice: voice, melodyOn: true, mute: { piano: inst === 'piano', guitar: inst === 'guitar' },
      onStop: reset,
      onMelodyNote: (i) => setActive(i),
      onChord: (i) => setSt((x) => (x ? { ...x, ci: i } : x)),
      onBeat: (b) => {
        if (b < 0) { setSt((x) => (x ? { ...x, count: b + 5 } : x)); return; }
        const inCycle = b % 16;
        const turn: Turn = inCycle < 8 ? 'escucha' : 'tu';
        if (m === 'base' && turn === 'tu') setBeats((x) => x + 1);
        setSt((x) => (x ? { ...x, count: null, turn, bar: Math.floor(b / 4) + 1 } : x));
      },
    });
    player.current = p;
    await p.start(events, notes.map((n) => ({ beat: n.start, dur: n.dur, midi: n.midi })));
    setPlaying(m);
    clearInterval(tick.current);
    tick.current = window.setInterval(() => setPlayed((x) => x + 1), 1000);
  };
  const stop = () => { player.current?.stop(); reset(); };
  const setBpm = (n: number) => {
    setBpmState(n);
    player.current?.setTempo(n);
    spot?.set({ bpm: n === 80 ? null : n });
  };
  const changeFrag = (id: string) => {
    stop();
    setFrag(id);
    spot?.set({ frag: id === 'all' ? null : id });
  };
  // desde «Hoy»: el toque que eligió empezar ya desbloqueó el audio, así que el ejemplo arranca solo
  useEffect(() => {
    if (params.get('auto') !== '1') return;
    replaceParams({ auto: null });
    const id = window.setTimeout(() => void start('example'), 150);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const noteLabels = setup.notes.map((m) => names(t.pitch(pitchFromMidi(m))));
  const chordNow = events[st?.ci ?? 0];
  const chordNext = events[((st?.ci ?? 0) + 1) % events.length];
  const left = Math.max(0, BAND_MINUTES * 60 - played);
  const mmss = (x: number) => `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`;
  const turnBig = playing && st && !st.count ? st.turn : null;

  return (
    <div className="page band-page">
      <a href="#/hoy" className="back">← Hoy</a>
      <header className="ex-head">
        <span className="eyebrow">Práctica de {BAND_MINUTES} minutos · sin micrófono</span>
        <h1>{BAND_TITLE}</h1>
        <p className="ex-goal"><b>Objetivo:</b> escucha la frase corta de la banda y contéstale usando solo <b>{noteLabels.join(', ').replace(/, ([^,]*)$/, ' y $1')}</b>. No hace falta copiarla: cambia el orden o el ritmo.</p>
      </header>

      <div className={`band-stage ${turnBig ?? 'idle'}`} aria-live="polite">
        <div className="bs-turn">
          {st?.count ? <><span className="bs-big">{st.count}</span><small>Cuenta de entrada…</small></>
            : turnBig === 'escucha' ? <><span className="bs-big">🎧 Escucha</span><small>La banda te llama</small></>
            : turnBig === 'tu' ? <><span className="bs-big">{t.isSax ? '🎷' : t.instrument === 'guitar' ? '🎸' : '🎹'} ¡Tu turno!</span><small>Contesta con tus tres notas</small></>
            : <><span className="bs-big">Tus tres notas</span><small>Pulsa una para oírla</small></>}
        </div>
        <div className="bs-notes">
          {setup.notes.map((m, i) => (
            <button key={m} type="button" className="bs-note" onClick={async () => { await ensureAudio(); triggerNotes(voice, [m], 0.8); }} aria-label={`Escuchar ${noteLabels[i]}`}>
              <b>{noteLabels[i]}</b>
              {t.isSax && setup.written[i] && <FingeringDiagram note={setup.written[i]} size={0.42} />}
            </button>
          ))}
        </div>
        <div className="bs-meta">
          <span>⏱ {done ? '¡5 minutos completados!' : `Te quedan ${mmss(left)}`}</span>
          {playing && st?.bar && <span>Vuelta {Math.floor((st.bar - 1) / 4) + 1} de {callsIn.length}</span>}
        </div>
      </div>

      <PracticeBar
        playing={playing}
        onExample={() => start('example')}
        onBase={() => start('base')}
        onStop={stop}
        bpm={bpm}
        onBpm={setBpm}
        min={50}
        max={160}
        fragments={[{ id: 'all', label: 'Las 4 llamadas (16 compases)' }, ...[1, 2, 3, 4].map((k) => ({ id: String(k), label: `Llamada ${k} (4 compases)` }))]}
        frag={frag}
        onFrag={changeFrag}
        status={st && { turn: st.turn, bar: st.bar, bars: totalBars, count: st.count, chord: chordNow && t.chordName(chordNow.chord), next: chordNext && t.chordName(chordNext.chord) }}
        hideLayers={['click']}
        readingAids={<p className="small muted">{t.isSax ? `Notas escritas para ${SAX_TRANSPOSITION[s.settings.saxType].label.toLowerCase()}; debajo de cada una, su digitación.` : t.instrument === 'guitar' ? 'En la 3ª cuerda: al aire, traste 2 y traste 4.' : 'Mano derecha: pulgar, índice y medio (dedos 1, 2 y 3).'}</p>}
        attempt={{ context: BAND_TITLE, beatsPlayed: beats, skills: ['improvisacion', 'oido'] }}
      />

      {done && (
        <div className="card success-card">
          <h2>¡Lo lograste! 🎉</h2>
          <p>Tocaste {BAND_MINUTES} minutos de llamada y respuesta: ya improvisas con la banda. +10 XP.</p>
          <div className="row gap wrap">
            <a className="btn primary" href="#/camino">Seguir en mi Camino</a>
            <button className="btn" onClick={() => { setPlayed(0); setDone(false); }}>Otra ronda de 5 minutos</button>
          </div>
        </div>
      )}

      <section className="card">
        <h3>Cómo se hace</h3>
        <ol className="steps">
          <li><b>🎧 Escucha.</b> La banda toca una frase corta con tus tres notas (2 compases).</li>
          <li><b>🎷 Contesta.</b> En los 2 compases siguientes respondes con esas notas: igual, al revés o con otro ritmo.</li>
          <li><b>🔁 Repite.</b> Cada vuelta trae una llamada distinta. ¿Una te cuesta? Elígela en «Repetir fragmento» o baja el tempo.</li>
        </ol>
        <h4>Las llamadas en la partitura</h4>
        <TimeStaff notes={staffCalls.map((n) => ({ pitch: t.pitch(pitchFromMidi(n.midi)), start: n.start, dur: n.dur, role: 'chord' as const, label: names(t.pitch(pitchFromMidi(n.midi))) }))}
          chords={events.map((e, i) => ({ start: i * 4, beats: e.beats, symbol: t.chordName(e.chord) }))} totalBeats={totalBars * 4} active={active}
          highlight={st?.bar ? [Math.floor((st.bar - 1) / 4) * 16 + 8, Math.floor((st.bar - 1) / 4) * 16 + 16] : null} />
        <p className="small muted">Los compases marcados son tu turno. {playing === 'example' ? 'En el ejemplo, la banda también contesta para que oigas una respuesta posible.' : ''}</p>
        {!t.isSax && (
          <InstrumentView notes={setup.notes.map((m, i) => ({ note: pitchFromMidi(m), degree: String(i + 1), role: i === 0 ? 'root' : 'chord' }))} sequence={setup.notes.map((m) => pitchFromMidi(m))} labelMode="name" />
        )}
      </section>
    </div>
  );
}


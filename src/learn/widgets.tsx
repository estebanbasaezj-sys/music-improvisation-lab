// Componentes interactivos de los ejercicios: digitación de saxo, ritmo, micrófono, ordenar y emparejar.
import { useEffect, useRef, useState } from 'react';
import { fingeringFor } from './fingerings';
import { TimeStaff } from '../instruments/TimeStaff';
import { rhythmOnsets, scoreRhythm } from './items';
import { Tone, ensureAudio, triggerDrum, click, cancelScheduled, waitSamples } from '../audio/engine';
import { ClapListener } from '../recording/onsets';
import { NoteSegmenter, PitchListener, compareSequences, freqToMidi, isEmbedded, micErrorText, newAudioContext } from '../recording/pitch';
import { UploadCheck } from './UploadCheck';
import { chordScores, chromaFromMagnitudes, PC_NAMES } from '../audio/analysis';
import { noteNameEs, pitchFromMidi, noteName } from '../theory/notes';

// ---------------------------------------------------------------- digitación de saxo
export function FingeringDiagram({ note, size = 1, label }: { note: string; size?: number; label?: string }) {
  const f = fingeringFor(note);
  if (!f) return <div className="muted small">Sin digitación para {note}</div>;
  const W = 92 * size;
  const H = 230 * size;
  const r = 12 * size;
  const cx = W / 2 + 6 * size;
  const ys = [40, 70, 100, 145, 175, 205].map((y) => y * size);
  return (
    <div className="fingering">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Digitación de ${note}`}>
        <rect x={cx - 20 * size} y={18 * size} width={40 * size} height={H - 26 * size} rx={18 * size} className="fg-body" />
        <circle cx={cx - 30 * size} cy={34 * size} r={7 * size} className={f.octave ? 'fg-key on' : 'fg-key'} />
        <text x={cx - 30 * size} y={20 * size} className="fg-lbl" textAnchor="middle">8va</text>
        {[...f.lh, ...f.rh].map((on, i) => (
          <g key={i}>
            <circle cx={cx} cy={ys[i]} r={r} className={on ? 'fg-key on' : 'fg-key'} />
            <text x={cx + 22 * size} y={ys[i] + 4} className="fg-lbl">{i + 1}</text>
          </g>
        ))}
        <line x1={cx - 16 * size} x2={cx + 16 * size} y1={123 * size} y2={123 * size} className="fg-sep" />
      </svg>
      {f.extra.length > 0 && <div className="fg-extra">{f.extra.map((e) => <span key={e}>+ {e}</span>)}</div>}
      {label && <div className="fg-name">{label}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- ritmo
export function RhythmStaff({ pattern }: { pattern: string[] }) {
  const { onsets, durs, beats } = rhythmOnsets(pattern);
  const notes = onsets.map((o, i) => ({ pitch: { letter: 6, acc: 0, octave: 4 }, start: o, dur: durs[i] }));
  return <div className="rhythm-staff"><TimeStaff notes={notes} chords={[]} totalBeats={Math.max(4, beats)} showLabels={false} /></div>;
}

export function RhythmTap({ pattern, bpm, swing, onResult, initialMode = 'pad', hideStaff }: { pattern: string[]; bpm: number; swing?: boolean; onResult: (ok: boolean, detail: string) => void; initialMode?: 'pad' | 'mic'; hideStaff?: boolean }) {
  const [phase, setPhase] = useState<'idle' | 'count' | 'tap' | 'done'>('idle');
  const [taps, setTaps] = useState<number[]>([]);
  const [beatNow, setBeatNow] = useState(-1);
  const [mode, setMode] = useState<'pad' | 'mic'>(initialMode);
  const [mic, setMic] = useState<'off' | 'starting' | 'ready'>('off');
  const [micErr, setMicErr] = useState('');
  const [level, setLevel] = useState(0);
  const [heard, setHeard] = useState(0);
  const [pulse, setPulse] = useState(true);
  const t0 = useRef(0);
  const tapsRef = useRef<number[]>([]);
  const timer = useRef<number[]>([]);
  const clap = useRef<ClapListener | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const { onsets, beats } = rhythmOnsets(pattern);
  const exp = swing ? onsets.map((o) => (Math.abs((o % 1) - 0.5) < 1e-6 ? Math.floor(o) + 2 / 3 : o)) : onsets;
  const spb = 60 / bpm;
  const outLat = () => {
    const ctx = Tone.getContext().rawContext as AudioContext;
    return (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
  };
  /** registra un golpe en el instante `t` (reloj del AudioContext, sin la anticipación de Tone) */
  const register = (t: number) => {
    if (phaseRef.current !== 'tap' && phaseRef.current !== 'count') return false;
    const beat = (t - outLat() - t0.current) / spb;
    if (beat < -0.6 || beat > beats + 0.6) return false;
    tapsRef.current.push(beat);
    setTaps([...tapsRef.current]);
    return true;
  };
  // El micrófono se activa al elegir «Palmas», no al empezar: así el permiso del navegador y el cambio de
  // configuración de audio (p. ej. auriculares Bluetooth) no se comen la cuenta de entrada.
  useEffect(() => {
    if (mode !== 'mic') { clap.current?.stop(); clap.current = null; setMic('off'); setLevel(0); return; }
    let alive = true;
    setMicErr(''); setMic('starting');
    (async () => {
      try {
        await ensureAudio();
        const cl = new ClapListener();
        await cl.start((e) => { if (!register(e.time) && phaseRef.current !== 'count') setHeard((h) => h + 1); }, (r) => setLevel(r));
        if (!alive) { cl.stop(); return; }
        clap.current = cl;
        await new Promise((r) => setTimeout(r, 400)); // dejar que el audio se estabilice
        if (alive) setMic('ready');
      } catch (e) {
        if (!alive) return;
        setMicErr(micErrorText(e));
        setMode('pad');
      }
    })();
    return () => { alive = false; clap.current?.stop(); clap.current = null; };
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => timer.current.forEach(clearTimeout), []);
  const listen = async () => {
    await ensureAudio();
    await waitSamples(3000);
    cancelScheduled();
    const now = Tone.now() + 0.2;
    exp.forEach((o) => triggerDrum('stick', now + o * spb, 0.9));
  };
  const start = async () => {
    await ensureAudio();
    await waitSamples(3000);
    const raw = Tone.getContext().rawContext as AudioContext;
    if (raw.state !== 'running') await raw.resume().catch(() => undefined);
    if (mode === 'mic' && mic !== 'ready') return;
    timer.current.forEach(clearTimeout);
    timer.current = [];
    tapsRef.current = [];
    setTaps([]);
    cancelScheduled();
    const lead = 0.35;
    const now = Tone.now() + lead;
    const countTimes = [0, 1, 2, 3].map((b) => now + b * spb);
    countTimes.forEach((t, b) => click(t, b === 0));
    const pulseTimes = pulse ? Array.from({ length: Math.ceil(beats) }, (_, b) => now + (4 + b) * spb) : [];
    if (mode === 'pad') pulseTimes.forEach((t) => triggerDrum('hh_pedal', t, 0.5));
    else pulseTimes.forEach((t) => click(t, false));
    clap.current?.setClicks(countTimes, pulseTimes, outLat());
    t0.current = now + 4 * spb;
    const wait = (now - Tone.immediate()) * 1000;
    setBeatNow(-5);
    setPhase('count');
    for (let b = 0; b < 4 + Math.ceil(beats); b++) timer.current.push(window.setTimeout(() => setBeatNow(b - 4), wait + b * spb * 1000));
    timer.current.push(window.setTimeout(() => setPhase('tap'), wait + 3.5 * spb * 1000));
    timer.current.push(window.setTimeout(() => finish(), wait + (4 + beats + 0.6) * spb * 1000));
  };
  const tap = () => {
    if (mode !== 'pad' || (phase !== 'tap' && phase !== 'count')) return;
    register(Tone.immediate());
    triggerDrum('stick', Tone.now(), 0.5);
  };
  const finish = () => {
    setPhase('done');
    setHeard(0);
    const tol = bpm < 90 ? 0.22 : 0.18;
    const r = scoreRhythm(exp, tapsRef.current, tol);
    const ms = Math.round(r.meanErr * spb * 1000);
    const src = mode === 'mic' ? ' (medido con el micrófono)' : '';
    onResult(r.ok, `${r.hit}/${r.total} notas a tiempo${r.extra ? `, ${r.extra} golpe(s) de más` : ''}${src}. ${r.hit ? `Tendencia: ${Math.abs(ms) < 25 ? 'muy preciso' : ms < 0 ? `te adelantas ~${-ms} ms` : `te atrasas ~${ms} ms`}.` : ''}`);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); tap(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });
  const live = phase === 'tap' || phase === 'count';
  const counting = live && beatNow < 0;
  const bigCount = beatNow < -4 ? '…' : counting ? String(beatNow + 5) : live ? `${(beatNow % 4) + 1}` : '';
  return (
    <div className="rhythm-tap">
      {!hideStaff && <RhythmStaff pattern={pattern} />}
      <div className="segmented sm tap-mode" role="radiogroup" aria-label="Cómo vas a tocar">
        <button className={mode === 'pad' ? 'on' : ''} disabled={live} onClick={() => setMode('pad')}>👆 Botón o barra espaciadora</button>
        <button className={mode === 'mic' ? 'on' : ''} disabled={live} onClick={() => setMode('mic')}>👏 Palmas (micrófono)</button>
      </div>
      {micErr && <p className="warn small">{micErr} Puedes seguir con el botón.</p>}
      <div className="row gap wrap center">
        <button className="btn" onClick={listen} disabled={live}>🔊 Escuchar</button>
        {!live && <button className="btn primary" onClick={start} disabled={mode === 'mic' && mic !== 'ready'}>{phase === 'done' ? 'Repetir' : '▶ Empezar (4 clics de cuenta)'}</button>}
        <label className="toggle"><input type="checkbox" checked={pulse} disabled={live} onChange={() => setPulse(!pulse)} />Pulso durante el ritmo</label>
      </div>
      {mode === 'pad' ? (
        <button className={`tap-pad ${live ? 'live' : ''}`} onPointerDown={tap}>
          {live ? <span key={beatNow} className={`tap-count ${counting ? 'count' : ''}`}>{counting ? `Cuenta ${bigCount}` : `Tiempo ${bigCount}`}</span> : 'TOCA AQUÍ'}
          <small>(o barra espaciadora)</small>
        </button>
      ) : (
        <div className={`tap-pad mic ${live ? 'live' : ''}`}>
          {mic === 'starting' && <>🎤 Activando el micrófono…<small>Si el navegador lo pide, acepta el permiso.</small></>}
          {mic === 'ready' && !live && <>👏 Micrófono listo<small>{heard ? `Te oigo (${heard} palmada${heard > 1 ? 's' : ''} de prueba). ` : 'Aplaude una vez para probar. '}Luego pulsa «Empezar»: suenan 4 clics y aplaudes el ritmo.</small></>}
          {live && <><span key={beatNow} className={`tap-count ${counting ? 'count' : ''}`}>{counting ? `Cuenta ${bigCount}` : `👏 Tiempo ${bigCount}`}</span><small>{counting ? 'Escucha la cuenta…' : '¡Aplaude el ritmo!'}</small></>}
          {mic !== 'off' && <span className="mic-meter" title="Nivel del micrófono"><span style={{ width: `${Math.min(100, level * 400)}%` }} /></span>}
        </div>
      )}
      {mode === 'mic' && <p className="muted small center">Con altavoces funciona: la app mide cómo llega el clic al micrófono durante la cuenta y luego distingue tus palmas (más fuertes). Con auriculares es aún más preciso.</p>}
      <div className="tap-dots">{taps.map((t, i) => <span key={i} style={{ left: `${Math.max(0, Math.min(100, (t / beats) * 100))}%` }} />)}{exp.map((o, i) => <i key={i} style={{ left: `${(o / beats) * 100}%` }} />)}</div>
    </div>
  );
}

// ---------------------------------------------------------------- micrófono: nota
export function MicNote({ target, display, onResult, onSkip }: { target: number; display: (m: number) => string; onResult: (ok: boolean, detail: string) => void; onSkip: () => void }) {
  const [on, setOn] = useState(false);
  const [err, setErr] = useState('');
  const [live, setLive] = useState<{ m: number; cents: number } | null>(null);
  const [hold, setHold] = useState(0);
  const l = useRef<PitchListener | null>(null);
  const since = useRef<number | null>(null);
  const done = useRef(false);
  useEffect(() => () => l.current?.stop(), []);
  const start = async () => {
    setErr(''); done.current = false;
    try {
      const pl = new PitchListener();
      l.current = pl;
      await pl.start((r, t) => {
        if (done.current) return;
        if (!r) { since.current = null; setLive(null); setHold(0); return; }
        const m = freqToMidi(r.freq);
        const rm = Math.round(m);
        setLive({ m: rm, cents: Math.round((m - rm) * 100) });
        const okPc = ((rm - target) % 12 + 12) % 12 === 0 && Math.abs(m - rm) < 0.45;
        if (okPc) {
          since.current ??= t;
          const h = t - since.current;
          setHold(Math.min(1, h / 350));
          if (h > 350) {
            done.current = true;
            pl.stop(); setOn(false);
            const cents = Math.round((m - rm) * 100);
            onResult(true, `Detectado ${display(rm)} (${cents > 0 ? '+' : ''}${cents} cents)${rm !== target ? ' — en otra octava, también vale' : ''}.`);
          }
        } else { since.current = null; setHold(0); }
      });
      setOn(true);
    } catch (e) { setErr(micErrorText(e)); }
  };
  return (
    <div className="mic-box">
      {!on ? <button className="btn primary big" onClick={start}>🎤 Escuchar mi instrumento</button> : (
        <div className="mic-live">
          <div className="mic-note">{live ? display(live.m) : '…'}</div>
          {live && <div className="mic-cents">{live.cents > 0 ? '+' : ''}{live.cents} cents</div>}
          <div className="mic-hold"><span style={{ width: `${hold * 100}%` }} /></div>
          <div className="muted small">Sostén la nota un momento.</div>
        </div>
      )}
      {err && <p className="warn small">{err}</p>}
      {(err || isEmbedded()) && <UploadCheck mode={{ kind: 'note', target }} display={display} onResult={onResult} />}
      <button className="link small" onClick={() => { l.current?.stop(); onSkip(); }}>Ahora no puedo tocar</button>
    </div>
  );
}

// ---------------------------------------------------------------- micrófono: secuencia
export function MicSeq({ targets, display, onResult, onSkip }: { targets: number[]; display: (m: number) => string; onResult: (ok: boolean, detail: string) => void; onSkip: () => void }) {
  const [on, setOn] = useState(false);
  const [err, setErr] = useState('');
  const [played, setPlayed] = useState<number[]>([]);
  const l = useRef<PitchListener | null>(null);
  const seg = useRef(new NoteSegmenter(110));
  useEffect(() => () => l.current?.stop(), []);
  const res = compareSequences(targets, played);
  const start = async () => {
    setErr(''); seg.current.reset(); setPlayed([]);
    try {
      const pl = new PitchListener();
      l.current = pl;
      let n = 0;
      await pl.start((r, t) => {
        seg.current.push(r ? freqToMidi(r.freq) : null, t);
        if (seg.current.notes.length !== n) {
          n = seg.current.notes.length;
          const ps = seg.current.notes.map((x) => x.midi);
          setPlayed(ps);
          if (compareSequences(targets, ps).correct === targets.length) { pl.stop(); setOn(false); onResult(true, `¡Todas las notas en orden! (${targets.length}/${targets.length})`); }
        }
      });
      setOn(true);
    } catch (e) { setErr(micErrorText(e)); }
  };
  const stop = () => {
    l.current?.stop(); setOn(false);
    const r = compareSequences(targets, played);
    onResult(r.correct / targets.length >= 0.8, `${r.correct} de ${targets.length} notas en orden${r.extra ? ` (${r.extra} nota(s) de más)` : ''}. Solo se miden las alturas.`);
  };
  return (
    <div className="mic-box">
      <div className="seq-targets">{targets.map((m, i) => <span key={i} className={res.matched[i] ? 'ok' : ''}>{display(m)}</span>)}</div>
      {!on ? <button className="btn primary big" onClick={start}>🎤 Empezar a tocar</button> : <button className="btn stop big" onClick={stop}>■ Terminé</button>}
      {played.length > 0 && <div className="muted small">Oído: {played.map(display).join(' · ')}</div>}
      {err && <p className="warn small">{err}</p>}
      {(err || isEmbedded()) && <UploadCheck mode={{ kind: 'seq', targets }} display={display} onResult={onResult} />}
      <button className="link small" onClick={() => { l.current?.stop(); onSkip(); }}>Ahora no puedo tocar</button>
    </div>
  );
}

// ---------------------------------------------------------------- micrófono: acorde (beta)
export function MicChord({ pcs, root, symbol, onResult, onSkip }: { pcs: number[]; root: number; symbol: string; onResult: (ok: boolean, detail: string, measured: boolean) => void; onSkip: () => void }) {
  const [on, setOn] = useState(false);
  const [guess, setGuess] = useState('');
  const [err, setErr] = useState('');
  const stopRef = useRef<() => void>(() => undefined);
  const hits = useRef(0);
  useEffect(() => () => stopRef.current(), []);
  const start = async () => {
    setErr('');
    try {
      const ctx = newAudioContext(); // antes de pedir el micrófono (iPhone: dentro del toque)
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      } catch (e) { void ctx.close().catch(() => undefined); throw e; }
      if (ctx.state !== 'running') await ctx.resume().catch(() => undefined);
      const an = ctx.createAnalyser();
      an.fftSize = 8192;
      ctx.createMediaStreamSource(stream).connect(an);
      const db = new Float32Array(an.frequencyBinCount);
      const mag = new Float32Array(an.frequencyBinCount);
      const id = window.setInterval(() => {
        an.getFloatFrequencyData(db);
        let energy = 0;
        for (let i = 0; i < db.length; i++) { mag[i] = Math.pow(10, db[i] / 20); energy += mag[i]; }
        if (energy < 0.5) { setGuess('…'); hits.current = 0; return; }
        const { chroma, bass } = chromaFromMagnitudes(mag, ctx.sampleRate, an.fftSize);
        const top = chordScores(chroma, bass).slice(0, 3);
        const g = top[0];
        setGuess(`${PC_NAMES[g.root]}${g.quality === 'maj' ? '' : g.quality}`);
        const target = top.find((x) => x.root === root && x.quality === qualityOf(pcs, root));
        if (target && (top[0] === target || top[1] === target)) hits.current++; else hits.current = 0;
        if (hits.current >= 4) { cleanup(); onResult(true, `Detectado ${symbol} (estimación por cromagrama).`, true); }
      }, 120);
      const cleanup = () => { clearInterval(id); stream.getTracks().forEach((t) => t.stop()); ctx.close(); setOn(false); };
      stopRef.current = cleanup;
      setOn(true);
    } catch (e) { setErr(micErrorText(e)); }
  };
  return (
    <div className="mic-box">
      {!on ? <button className="btn primary big" onClick={start}>🎤 Escuchar el acorde</button> : <div className="mic-live"><div className="mic-note">{guess || '…'}</div><div className="muted small">Deja sonar el acorde. Detección aproximada (beta).</div></div>}
      {err && <p className="warn small">{err}</p>}
      {(err || isEmbedded()) && <UploadCheck mode={{ kind: 'chord', root, quality: qualityOf(pcs, root), symbol }} display={(m) => String(m)} onResult={(ok, d) => onResult(ok, d, true)} />}
      <div className="row gap center">
        <button className="link small" onClick={() => { stopRef.current(); onResult(true, 'Autoevaluado: marcaste que sonó bien (no medido).', false); }}>Sonó bien (autoevaluar)</button>
        <button className="link small" onClick={() => { stopRef.current(); onSkip(); }}>Ahora no puedo tocar</button>
      </div>
    </div>
  );
}
function qualityOf(pcs: number[], root: number): string {
  const ints = pcs.map((p) => (p - root + 12) % 12).sort((a, b) => a - b).join(',');
  const map: Record<string, string> = { '0,4,7': 'maj', '0,3,7': 'm', '0,4,7,10': '7', '0,4,7,11': 'maj7', '0,3,7,10': 'm7', '0,3,6,10': 'm7b5', '0,3,6,9': 'dim7', '0,4,7,9': '6' };
  return map[ints] ?? 'maj';
}

// ---------------------------------------------------------------- ordenar / emparejar
export function OrderTiles({ tiles, onDone }: { tiles: string[]; onDone: (seq: string[]) => void }) {
  const [seq, setSeq] = useState<number[]>([]);
  useEffect(() => { if (seq.length === tiles.length) onDone(seq.map((i) => tiles[i])); }, [seq]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="order">
      <div className="order-line">{seq.map((i, k) => <button key={k} className="tile placed" onClick={() => setSeq(seq.filter((x) => x !== i))}>{tiles[i]}</button>)}{seq.length < tiles.length && <span className="tile ghost">?</span>}</div>
      <div className="order-bank">{tiles.map((t, i) => <button key={i} className="tile" disabled={seq.includes(i)} onClick={() => setSeq([...seq, i])}>{t}</button>)}</div>
    </div>
  );
}

export function PairsMatch({ pairs, onDone }: { pairs: [string, string][]; onDone: (mistakes: number) => void }) {
  const [left] = useState(() => [...pairs.map((p) => p[0])].sort(() => Math.random() - 0.5));
  const [right] = useState(() => [...pairs.map((p) => p[1])].sort(() => Math.random() - 0.5));
  const [selL, setSelL] = useState<string | null>(null);
  const [selR, setSelR] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  useEffect(() => {
    if (selL && selR) {
      const ok = pairs.some((p) => p[0] === selL && p[1] === selR);
      if (ok) { const m = [...matched, selL]; setMatched(m); if (m.length === pairs.length) onDone(mistakes); }
      else { setMistakes(mistakes + 1); setWrong(selL + selR); setTimeout(() => setWrong(null), 500); }
      setSelL(null); setSelR(null);
    }
  }, [selL, selR]); // eslint-disable-line react-hooks/exhaustive-deps
  const doneR = (r: string) => pairs.some((p) => p[1] === r && matched.includes(p[0]));
  return (
    <div className="pairs">
      <div>{left.map((l) => <button key={l} className={`tile ${selL === l ? 'sel' : ''} ${matched.includes(l) ? 'done' : ''} ${wrong?.startsWith(l) ? 'bad' : ''}`} disabled={matched.includes(l)} onClick={() => setSelL(l)}>{l}</button>)}</div>
      <div>{right.map((r) => <button key={r} className={`tile ${selR === r ? 'sel' : ''} ${doneR(r) ? 'done' : ''} ${wrong?.endsWith(r) ? 'bad' : ''}`} disabled={doneR(r)} onClick={() => setSelR(r)}>{r}</button>)}</div>
    </div>
  );
}

export const midiLabel = (solfeo: boolean) => (m: number) => { const p = pitchFromMidi(m); return solfeo ? noteNameEs(p) : noteName(p, true); };

import { useEffect, useState } from 'react';
import { Item, GenCtx, checkTap, fromConcert, parsePattern } from './items';
import { FingeringDiagram, MicChord, MicNote, MicSeq, OrderTiles, PairsMatch, RhythmStaff, RhythmTap, midiLabel } from './widgets';
import { Keyboard } from '../instruments/Keyboard';
import { Fretboard, Mark } from '../instruments/Fretboard';
import { Staff } from '../instruments/Staff';
import { Tone, cancelScheduled, click, drumsLoaded, ensureAudio, playSequence, stopSequence, triggerDrum, triggerNotes, swingBeat, waitSamples } from '../audio/engine';
import { voiceFor } from '../components/common';
import { pitchFromMidi } from '../theory/notes';

export interface Verdict { correct: boolean; detail: string; measured: boolean; skipped?: boolean }

export interface RhythmTimeline { t0: number; spb: number; countIn: number; beats: number }

/** Reproduce el audio del ejercicio. Para ritmos devuelve la línea de tiempo (cuenta + compás) del contador visual. */
export async function playItemAudio(item: Item, ctx: GenCtx): Promise<RhythmTimeline | null> {
  if (!item.audio) return null;
  await ensureAudio();
  // la primera vez las muestras pueden estar cargando: esperar para que suene con el timbre correcto
  await waitSamples(3000);
  const a = item.audio;
  if (a.voice === 'click') {
    cancelScheduled(); // si se pulsa «Escuchar» de nuevo, no se superponen dos reproducciones
    const spb = 60 / a.bpm;
    const t0 = Tone.now() + 0.3; // margen para que el primer golpe nunca llegue tarde
    const ci = a.countIn ?? 0;
    const beats = a.beats ?? Math.ceil(Math.max(...a.seq.map((n) => n.start + n.dur)));
    for (let b = 0; b < ci; b++) click(t0 + b * spb, b === 0);
    // pulso suave durante el ritmo para no perder la cuenta (solo con muestras: el respaldo sintético se confundiría con el ritmo)
    if (ci && drumsLoaded()) for (let b = 0; b < beats; b++) triggerDrum('hh_pedal', t0 + (ci + b) * spb, 0.3);
    a.seq.forEach((n) => triggerDrum('stick', t0 + (ci + (a.swing ? swingBeat(n.start) : n.start)) * spb, 0.95));
    return ci ? { t0, spb, countIn: ci, beats } : null;
  }
  playSequence(a.voice === 'inst' ? voiceFor(ctx.instrument) : 'piano', a.seq, a.bpm, { swing: a.swing });
  return null;
}

/** Contador visual: «1 2 3 4» de cuenta y después los tiempos del compás del ritmo. */
function RhythmCounter({ tl }: { tl: RhythmTimeline }) {
  // reloj real del audio (Tone.now() incluye 0,1 s de anticipación de agenda)
  const [now, setNow] = useState(() => Tone.immediate());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Tone.immediate()), 40);
    return () => clearInterval(id);
  }, [tl]);
  const pos = (now - tl.t0) / tl.spb; // en tiempos desde el primer clic
  const cur = Math.floor(pos);
  const total = tl.countIn + tl.beats;
  const phase = pos < 0 ? 'ready' : cur < tl.countIn ? 'count' : cur < total ? 'play' : 'done';
  return (
    <div className={`rhythm-counter ${phase}`} aria-live="polite">
      <div className="rc-group">
        <span className="rc-label">Cuenta</span>
        {Array.from({ length: tl.countIn }, (_, b) => <span key={b} className={`rc-beat count ${cur === b ? 'on' : cur > b ? 'past' : ''}`}>{b + 1}</span>)}
      </div>
      <div className="rc-group">
        <span className="rc-label">Ritmo</span>
        {Array.from({ length: tl.beats }, (_, b) => <span key={b} className={`rc-beat ${cur === tl.countIn + b ? 'on' : cur > tl.countIn + b ? 'past' : ''}`}>{(b % 4) + 1}</span>)}
      </div>
      <span className="rc-msg">{phase === 'ready' ? 'Preparado…' : phase === 'count' ? `Cuenta: ${cur + 1}` : phase === 'play' ? '¡Escucha el ritmo!' : 'Elige la respuesta (puedes volver a escuchar)'}</span>
    </div>
  );
}

export function ItemView({ item, ctx, onVerdict, locked }: { item: Item; ctx: GenCtx; onVerdict: (v: Verdict) => void; locked: boolean }) {
  const [tapped, setTapped] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [timeline, setTimeline] = useState<RhythmTimeline | null>(null);
  const [clapRes, setClapRes] = useState<{ ok: boolean; detail: string } | null>(null);
  const play = async () => setTimeline(await playItemAudio(item, ctx));
  useEffect(() => {
    setTapped([]); setPicked(null); setTimeline(null); setClapRes(null);
    if (item.autoplay) { const id = setTimeout(play, 250); return () => { clearTimeout(id); stopSequence(); }; }
    return () => stopSequence();
  }, [item]); // eslint-disable-line react-hooks/exhaustive-deps
  const a = item.answer;
  // para el saxo, el micrófono oye alturas de concierto: las mostramos como notas escritas
  const display = (m: number) => midiLabel(ctx.solfeo)(fromConcert(m, ctx));
  const playTap = async (m: number) => { await ensureAudio(); triggerNotes(ctx.instrument === 'guitar' ? 'guitar' : 'piano', [m], 0.8); };

  const onTap = (m: number) => {
    if (locked || a.type !== 'tap') return;
    playTap(m);
    if (!a.multi) {
      const ok = checkTap(a, [m]);
      setTapped([m]);
      onVerdict({ correct: ok, detail: ok ? '' : `Tocaste ${midiLabel(ctx.solfeo)(m)}.`, measured: true });
    } else setTapped(tapped.includes(m) ? tapped.filter((x) => x !== m) : [...tapped, m]);
  };
  const viewMarks = (): Map<number, Mark> => new Map(tapped.map((m) => [((m % 12) + 12) % 12, { label: midiLabel(ctx.solfeo)(m).replace('♭', 'b').replace('♯', '#'), role: 'chord' as const }]));
  const exact = new Map<number, Mark>(tapped.map((m) => [m, { label: midiLabel(ctx.solfeo)(m).replace('♭', 'b').replace('♯', '#'), role: 'chord' as const }]));

  return (
    <div className="item">
      <h2 className="item-prompt">{item.prompt}</h2>
      {item.sub && <p className="item-sub">{item.sub}</p>}
      {item.audio && <button className="btn audio-btn" onClick={play}>🔊 {timeline ? 'Escuchar otra vez' : 'Escuchar'}</button>}
      {timeline && <RhythmCounter tl={timeline} />}
      {item.staff && <div className="item-staff"><Staff pitches={item.staff.pitches} durations={item.staff.durations} /></div>}
      {item.rhythm && a.type !== 'rhythm' && <RhythmStaff pattern={item.rhythm} />}
      {item.view?.type === 'fingering' && item.view.fingering && <div className="center"><FingeringDiagram note={item.view.fingering} size={1.1} /></div>}
      {item.view?.type === 'keyboard' && (
        <Keyboard low={48} high={84} exact={a.type === 'tap' ? exact : item.view.midi !== undefined ? new Map([[item.view.midi, { label: a.type === 'mic-note' ? display(fromConcert(item.view.midi, ctx)) : '?', role: 'root' as const }]]) : undefined} onPlay={a.type === 'tap' ? onTap : playTap} />
      )}
      {item.view?.type === 'fretboard' && (
        <Fretboard marks={a.type === 'tap' ? viewMarks() : new Map()} question={item.view.fret} onPlay={a.type === 'tap' ? onTap : playTap} frets={12} />
      )}

      {a.type === 'choice' && (
        <div className={`options ${a.optionKind ?? 'text'}`}>
          {a.options.map((o, i) => (
            <button key={i} disabled={locked} className={`opt ${picked === i ? 'sel' : ''} ${locked && i === a.correct ? 'right' : ''} ${locked && picked === i && i !== a.correct ? 'wrong' : ''}`}
              onClick={() => { setPicked(i); onVerdict({ correct: i === a.correct, detail: '', measured: true }); }}>
              {a.optionKind === 'fingering' ? <FingeringDiagram note={o} size={0.7} /> : a.optionKind === 'rhythm' ? <RhythmStaff pattern={parsePattern(o)} /> : o}
            </button>
          ))}
        </div>
      )}
      {a.type === 'choice' && a.optionKind === 'rhythm' && locked && (
        <details className="clap-practice">
          <summary>👏 Extra: aplaude este ritmo y la app evalúa tus palmas (micrófono)</summary>
          <RhythmTap pattern={parsePattern(a.options[a.correct])} bpm={item.audio?.bpm ?? 80} initialMode="mic" hideStaff onResult={(ok, detail) => setClapRes({ ok, detail })} />
          {clapRes && <p className={clapRes.ok ? 'ok' : 'warn'}>{clapRes.ok ? '¡Bien! ' : 'Casi: '}{clapRes.detail}</p>}
        </details>
      )}
      {a.type === 'tap' && a.multi && (
        <div className="row gap center">
          <span className="muted small">Notas: {tapped.map((m) => midiLabel(ctx.solfeo)(m)).join(' · ') || '—'}</span>
          <button className="btn" disabled={locked || !tapped.length} onClick={() => setTapped([])}>Borrar</button>
          <button className="btn primary" disabled={locked || tapped.length < 2} onClick={() => { const ok = checkTap(a, tapped); onVerdict({ correct: ok, detail: '', measured: true }); }}>Comprobar</button>
        </div>
      )}
      {a.type === 'mic-note' && !locked && <MicNote target={a.midi} display={display} onResult={(ok, d) => onVerdict({ correct: ok, detail: d, measured: true })} onSkip={() => onVerdict({ correct: true, detail: '', measured: false, skipped: true })} />}
      {a.type === 'mic-seq' && !locked && <MicSeq targets={a.midis} display={display} onResult={(ok, d) => onVerdict({ correct: ok, detail: d, measured: true })} onSkip={() => onVerdict({ correct: true, detail: '', measured: false, skipped: true })} />}
      {a.type === 'mic-chord' && !locked && <MicChord pcs={a.pcs} root={a.root} symbol={a.symbol} onResult={(ok, d, m) => onVerdict({ correct: ok, detail: d, measured: m })} onSkip={() => onVerdict({ correct: true, detail: '', measured: false, skipped: true })} />}
      {a.type === 'rhythm' && !locked && item.rhythm && <RhythmTap pattern={item.rhythm} bpm={a.bpm} swing={(item.spec as { swing?: boolean }).swing} onResult={(ok, d) => onVerdict({ correct: ok, detail: d, measured: true })} />}
      {a.type === 'order' && !locked && <OrderTiles tiles={a.tiles} onDone={(seq) => onVerdict({ correct: seq.join() === a.correct.join(), detail: '', measured: true })} />}
      {a.type === 'pairs' && !locked && <PairsMatch pairs={a.pairs} onDone={(m) => onVerdict({ correct: m === 0, detail: m ? `${m} intento(s) fallido(s).` : '', measured: true })} />}
    </div>
  );
}

export const concertLabel = (m: number) => pitchFromMidi(m);

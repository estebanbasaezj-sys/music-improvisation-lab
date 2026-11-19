import { useEffect, useState } from 'react';
import { Item, GenCtx, checkTap, fromConcert, parsePattern } from './items';
import { FingeringDiagram, MicChord, MicNote, MicSeq, OrderTiles, PairsMatch, RhythmStaff, RhythmTap, midiLabel } from './widgets';
import { Keyboard } from '../instruments/Keyboard';
import { Fretboard, Mark } from '../instruments/Fretboard';
import { Staff } from '../instruments/Staff';
import { Tone, ensureAudio, playSequence, stopSequence, triggerDrum, triggerNotes, swingBeat } from '../audio/engine';
import { voiceFor } from '../components/common';
import { pitchFromMidi } from '../theory/notes';

export interface Verdict { correct: boolean; detail: string; measured: boolean; skipped?: boolean }

export async function playItemAudio(item: Item, ctx: GenCtx) {
  if (!item.audio) return;
  await ensureAudio();
  const a = item.audio;
  if (a.voice === 'click') {
    const spb = 60 / a.bpm;
    const now = Tone.now() + 0.1;
    a.seq.forEach((n) => triggerDrum('stick', now + (a.swing ? swingBeat(n.start) : n.start) * spb, 0.9));
    return;
  }
  playSequence(a.voice === 'inst' ? voiceFor(ctx.instrument) : 'piano', a.seq, a.bpm, { swing: a.swing });
}

export function ItemView({ item, ctx, onVerdict, locked }: { item: Item; ctx: GenCtx; onVerdict: (v: Verdict) => void; locked: boolean }) {
  const [tapped, setTapped] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => {
    setTapped([]); setPicked(null);
    if (item.autoplay) { const id = setTimeout(() => playItemAudio(item, ctx), 250); return () => { clearTimeout(id); stopSequence(); }; }
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
      {item.audio && <button className="btn audio-btn" onClick={() => playItemAudio(item, ctx)}>🔊 Escuchar</button>}
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

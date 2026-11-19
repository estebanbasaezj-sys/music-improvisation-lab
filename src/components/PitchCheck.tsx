// Detección real de notas por micrófono (monofónica). Solo informa lo que mide:
// qué alturas detectó y cuántas notas objetivo aparecieron en orden. No evalúa ritmo ni sonido.
import { useEffect, useRef, useState } from 'react';
import { NoteSegmenter, PitchListener, compareSequences, freqToMidi, isEmbedded, micErrorText } from '../recording/pitch';
import { UploadCheck } from '../learn/UploadCheck';
import { pitchFromMidi } from '../theory/notes';
import { addEvidence } from '../progress/store';
import { StatusBadge, useNames, useTransposer } from './common';

export function PitchCheck({ target, skill }: { target?: number[]; skill?: 's_fraseo' | 'oido' }) {
  const t = useTransposer();
  const names = useNames();
  const [on, setOn] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [live, setLive] = useState<{ midi: number; cents: number } | null>(null);
  const [played, setPlayed] = useState<number[]>([]);
  const [result, setResult] = useState<ReturnType<typeof compareSequences> | null>(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const listener = useRef<PitchListener | null>(null);
  const seg = useRef(new NoteSegmenter());
  useEffect(() => () => listener.current?.stop(), []);

  const start = async () => {
    setErr(null);
    setResult(null);
    seg.current.reset();
    setPlayed([]);
    try {
      const l = new PitchListener();
      listener.current = l;
      let last = 0;
      await l.start((r, tm) => {
        const m = r ? freqToMidi(r.freq) : null;
        seg.current.push(m, tm);
        if (tm - last > 60) {
          last = tm;
          setLive(m === null ? null : { midi: Math.round(m), cents: Math.round((m - Math.round(m)) * 100) });
          if (seg.current.notes.length !== played.length) setPlayed(seg.current.notes.map((n) => n.midi));
        }
      });
      setOn(true);
    } catch (e) {
      setErr(micErrorText(e));
    }
  };
  const stop = () => {
    listener.current?.stop();
    setOn(false);
    const notes = seg.current.notes.map((n) => n.midi);
    setPlayed(notes);
    if (target && target.length) {
      const r = compareSequences(target, notes);
      setResult(r);
      if (notes.length > 0) addEvidence(t.instrument, skill ?? 'oido', { source: 'deteccion', value: Math.round((r.correct / r.total) * 100), note: 'Imitación de frase (alturas)' });
    }
  };
  const show = (m: number) => names(t.isSax ? t.pitch(pitchFromMidi(m)) : pitchFromMidi(m));
  return (
    <div className="pitch-check">
      <div className="row gap wrap">
        <button className={`btn ${on ? 'stop' : ''}`} onClick={on ? stop : start}>{on ? '■ Terminar y comparar' : '🎤 Comprobar notas con el micrófono'}</button>
        <StatusBadge status="beta" />
      </div>
      {err && <p className="warn">{err}</p>}
      {(err || isEmbedded()) && target && target.length > 0 && <UploadCheck mode={{ kind: 'seq', targets: target }} display={show} onResult={(ok, d) => { setUploadMsg(`${ok ? '✔' : '✘'} ${d}`); if (ok !== undefined) addEvidence(t.instrument, skill ?? 'oido', { source: 'deteccion', value: ok ? 85 : 40, note: 'Imitación de frase (grabación subida)' }); }} />}
      {uploadMsg && <p className="small">{uploadMsg}</p>}
      {on && (
        <div className="tuner">
          <span className="tuner-note">{live ? show(live.midi) : '—'}</span>
          {live && <span className={`tuner-cents ${Math.abs(live.cents) < 15 ? 'ok' : ''}`}>{live.cents > 0 ? '+' : ''}{live.cents} cents</span>}
          <span className="muted small">Toca nota a nota, con auriculares si suena el acompañamiento.</span>
        </div>
      )}
      {played.length > 0 && <p className="small">Notas detectadas ({t.isSax ? 'escritas' : 'concierto'}): {played.map(show).join(' · ')}</p>}
      {result && target && (
        <div className="small">
          <p><b>{result.correct} de {result.total}</b> notas de la frase detectadas en el orden correcto (sin tener en cuenta la octava).</p>
          <p>{target.map((m, i) => <span key={i} className={result.matched[i] ? 'ok-note' : 'miss-note'}>{show(m)} </span>)}</p>
          <p className="muted">Qué mide: solo las alturas. No mide ritmo, articulación ni sonido: eso lo valoras tú al escuchar tu grabación.</p>
        </div>
      )}
    </div>
  );
}

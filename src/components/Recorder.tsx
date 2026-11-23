import { useEffect, useRef, useState } from 'react';
import { saveRecording } from '../recording/db';
import { addEvidence, today } from '../progress/store';
import { useTransposer } from './common';
import { isEmbedded, micErrorText } from '../recording/pitch';

export function Recorder({ context, criteria, onSaved }: { context: string; criteria?: string[]; onSaved?: () => void }) {
  const t = useTransposer();
  const [state, setState] = useState<'idle' | 'rec' | 'review' | 'self'>('idle');
  const [err, setErr] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [secs, setSecs] = useState(0);
  const [notes, setNotes] = useState('');
  const [evals, setEvals] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const blob = useRef<Blob | null>(null);
  const timer = useRef<number>(0);
  const stream = useRef<MediaStream | null>(null);
  useEffect(() => () => { clearInterval(timer.current); stream.current?.getTracks().forEach((x) => x.stop()); if (url) URL.revokeObjectURL(url); }, [url]);

  const start = async () => {
    setErr(null);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
      const mr = new MediaRecorder(stream.current);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => {
        const b = new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' });
        blob.current = b;
        setUrl(URL.createObjectURL(b));
        setState('review');
        stream.current?.getTracks().forEach((x) => x.stop());
      };
      mr.start();
      rec.current = mr;
      setSecs(0);
      setSaved(false);
      timer.current = window.setInterval(() => setSecs((s) => s + 1), 1000);
      setState('rec');
    } catch (e) {
      setErr(micErrorText(e));
    }
  };
  const stop = () => {
    clearInterval(timer.current);
    rec.current?.stop();
  };
  const save = async () => {
    if (!blob.current) return;
    await saveRecording({
      id: crypto.randomUUID(), createdAt: new Date().toISOString(), instrument: t.instrument, title: `${context} · ${today()}`,
      context, durationSec: secs, notes, selfEval: evals, mimeType: blob.current.type, blob: blob.current,
    });
    const vals = Object.values(evals);
    if (vals.length) addEvidence(t.instrument, 'improvisacion', { source: 'autoevaluacion', value: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length / 5) * 100), note: `Grabación: ${context}` });
    setSaved(true);
    onSaved?.();
  };
  return (
    <div className="recorder">
      {err && <p className="warn">{err}</p>}
      {state === 'idle' && (
        <div className="row gap wrap">
          <button className="btn rec" onClick={start} title="Se pide permiso de micrófono al pulsar">● Grabar</button>
          {criteria && <button className="btn" onClick={() => { setState('self'); setSaved(false); }}>✍ Autoevaluarme sin grabar</button>}
          {(err || isEmbedded()) && (
            <label className="btn">📤 Subir grabación<input type="file" accept="audio/*" capture="user" hidden onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              blob.current = f;
              setUrl(URL.createObjectURL(f));
              setSecs(0);
              setSaved(false);
              setState('review');
            }} /></label>
          )}
        </div>
      )}
      {state === 'rec' && (
        <div className="row gap"><button className="btn stop" onClick={stop}>■ Detener</button><span className="rec-dot" /> {secs}s <span className="muted small">Consejo: usa auriculares para que el micrófono capte solo tu instrumento.</span></div>
      )}
      {state === 'self' && criteria && (
        <div className="self-eval">
          <p className="small"><b>Autoevaluación</b> (sin grabación): piensa en lo que acabas de tocar y valora de 1 a 5.</p>
          {criteria.map((c) => (
            <div key={c} className="crit">
              <span>{c}</span>
              <div className="stars" role="radiogroup" aria-label={c}>{[1, 2, 3, 4, 5].map((n) => <button key={n} role="radio" aria-checked={evals[c] === n} className={evals[c] >= n ? 'on' : ''} onClick={() => setEvals({ ...evals, [c]: n })}>{n}</button>)}</div>
            </div>
          ))}
          <div className="row gap">
            {!saved ? <button className="btn primary" disabled={!Object.keys(evals).length} onClick={() => {
              const vals = Object.values(evals);
              addEvidence(t.instrument, 'improvisacion', { source: 'autoevaluacion', value: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length / 5) * 100), note: `Autoevaluación: ${context}` });
              setSaved(true);
              onSaved?.();
            }}>Registrar mi autoevaluación</button> : <span className="ok">✓ Registrada en tu progreso</span>}
            <button className="btn" onClick={() => setState('idle')}>Volver</button>
          </div>
        </div>
      )}
      {state === 'review' && url && (
        <div>
          <audio controls src={url} />
          {criteria && (
            <div className="self-eval">
              <p className="small"><b>Autoevaluación guiada</b> (escúchate y valora de 1 a 5; esto no es una medición automática):</p>
              {criteria.map((c) => (
                <div key={c} className="crit">
                  <span>{c}</span>
                  <div className="stars">{[1, 2, 3, 4, 5].map((n) => <button key={n} className={evals[c] >= n ? 'on' : ''} onClick={() => setEvals({ ...evals, [c]: n })}>{n}</button>)}</div>
                </div>
              ))}
            </div>
          )}
          <textarea placeholder="Comentarios: qué salió bien, qué repetir…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="row gap">
            {!saved ? <button className="btn primary" onClick={save}>Guardar en Mis grabaciones</button> : <span className="ok">✔ Guardada</span>}
            <button className="btn" onClick={() => { setState('idle'); setUrl(null); }}>Grabar otra</button>
          </div>
        </div>
      )}
    </div>
  );
}

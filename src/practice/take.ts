// Grabar una toma mientras suena la base. El micrófono se pide SOLO cuando el alumno elige grabar.
import { useEffect, useRef, useState } from 'react';
import { saveRecording } from '../recording/db';
import { micErrorText } from '../recording/pitch';
import { InstrumentId } from '../theory/instruments';
import { today } from '../progress/store';

export interface Take {
  state: 'idle' | 'asking' | 'rec' | 'ready';
  err: string;
  url: string | null;
  secs: number;
  saved: boolean;
  /** pide el micrófono y empieza a grabar; devuelve false si no se pudo */
  start: () => Promise<boolean>;
  stop: () => void;
  save: (title: string, context: string, selfEval?: Record<string, number>) => Promise<void>;
  discard: () => void;
}

export function useTake(instrument: InstrumentId): Take {
  const [state, setState] = useState<Take['state']>('idle');
  const [err, setErr] = useState('');
  const [url, setUrl] = useState<string | null>(null);
  const [secs, setSecs] = useState(0);
  const [saved, setSaved] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const blob = useRef<Blob | null>(null);
  const t0 = useRef(0);
  const tick = useRef(0);
  useEffect(() => () => {
    clearInterval(tick.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    if (rec.current?.state === 'recording') rec.current.stop();
  }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const start = async () => {
    setErr('');
    setState('asking');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
      stream.current = s;
      const mr = new MediaRecorder(s);
      chunks.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      mr.onstop = () => {
        clearInterval(tick.current);
        const b = new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' });
        blob.current = b;
        setUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(b); });
        setState('ready');
        s.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      rec.current = mr;
      t0.current = Date.now();
      setSecs(0);
      setSaved(false);
      tick.current = window.setInterval(() => setSecs(Math.round((Date.now() - t0.current) / 1000)), 500);
      setState('rec');
      return true;
    } catch (e) {
      setErr(micErrorText(e));
      setState(blob.current ? 'ready' : 'idle');
      return false;
    }
  };
  const stop = () => { if (rec.current?.state === 'recording') rec.current.stop(); };
  const save = async (title: string, context: string, selfEval?: Record<string, number>) => {
    if (!blob.current) return;
    await saveRecording({
      id: crypto.randomUUID(), createdAt: new Date().toISOString(), instrument, title: `${title} · ${today()}`,
      context, durationSec: secs, notes: '', selfEval, mimeType: blob.current.type, blob: blob.current,
    });
    setSaved(true);
  };
  const discard = () => { blob.current = null; setUrl(null); setState('idle'); setSaved(false); };
  return { state, err, url, secs, saved, start, stop, save, discard };
}

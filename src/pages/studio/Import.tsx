// Paso 1 del Estudio: de dónde viene el audio. Archivo (audio o video), enlace directo, video de YouTube
// reproducido dentro de la app y capturado mientras suena, captura de otra pestaña, mis grabaciones o un
// proyecto guardado.
import { useEffect, useRef, useState } from 'react';
import { Recording } from '../../recording/db';
import { StudioProject } from '../../recording/projects';
import { TabCapture, canCaptureTab, captureTabAudio } from '../../recording/capture';
import { Segmented } from '../../components/common';

type Tab = 'file' | 'link' | 'capture' | 'recs' | 'projects';
export type LoadFn = (data: Blob, name: string, source: string) => Promise<void>;

const ytId = (u: string) => /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{11})/.exec(u)?.[1] ?? null;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function Recorder({ capture, onStop, onCancel }: { capture: TabCapture; onStop: () => void; onCancel: () => void }) {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((x) => x + 1), 500); return () => clearInterval(id); }, []);
  return (
    <div className="capture-live">
      <span className="rec-dot" /> Grabando el audio de la pestaña… <b>{fmt((performance.now() - capture.startedAt) / 1000)}</b>
      <button className="btn primary" onClick={onStop}>⏹ Terminar y abrir en el editor</button>
      <button className="btn" onClick={onCancel}>Cancelar</button>
    </div>
  );
}

function YouTubeCapture({ id, onLoad }: { id: string; onLoad: LoadFn }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [blocked, setBlocked] = useState(false);
  const [cap, setCap] = useState<TabCapture | null>(null);
  const [err, setErr] = useState('');
  const origin = window.location.origin.startsWith('http') ? `&origin=${encodeURIComponent(window.location.origin)}` : '';
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      try { const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; if (d?.event === 'onError') setBlocked(true); } catch { /* otro mensaje */ }
    };
    window.addEventListener('message', onMsg);
    const ping = setInterval(() => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'), 400);
    return () => { window.removeEventListener('message', onMsg); clearInterval(ping); };
  }, [id]);
  const start = async () => {
    setErr('');
    try { setCap(await captureTabAudio(true, () => setCap(null))); } catch (e) { setErr((e as Error).name === 'NotAllowedError' ? 'No se dio permiso para capturar la pestaña.' : (e as Error).message); }
  };
  const stop = async () => { if (!cap) return; const b = await cap.stop(); setCap(null); await onLoad(b, `Captura YouTube ${id}`, `captura del video ${id}`); };
  return (
    <div className="yt-capture">
      <div className="yt-frame">
        <iframe ref={frame} src={`https://www.youtube.com/embed/${id}?enablejsapi=1&rel=0&playsinline=1${origin}`} title="Video de YouTube" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
      </div>
      {blocked ? (
        <p className="warn small">Este video no permite reproducirse dentro de otras apps (lo decide quien lo subió). Ábrelo en otra pestaña y usa la opción «Capturar otra pestaña».</p>
      ) : !canCaptureTab() ? (
        <p className="warn small">Este navegador no permite capturar el audio de una pestaña (en celulares no está disponible). En un computador, usa Chrome o Edge.</p>
      ) : cap ? (
        <Recorder capture={cap} onStop={stop} onCancel={() => { cap.cancel(); setCap(null); }} />
      ) : (
        <>
          <ol className="small steps">
            <li>Pulsa <b>⏺ Capturar mientras suena</b> y, en el aviso del navegador, elige <b>esta pestaña</b> y marca <b>«Compartir también el audio»</b>.</li>
            <li>Dale play al video (puedes adelantarlo hasta el solo) y deja sonar el fragmento que quieres estudiar.</li>
            <li>Pulsa <b>Terminar</b>: el audio se abre en el editor para separarlo, hacer loop y transcribirlo.</li>
          </ol>
          <button className="btn primary" onClick={start}>⏺ Capturar mientras suena</button>
        </>
      )}
      {err && <p className="warn small">{err}</p>}
      <p className="muted small">La app no descarga nada de YouTube: graba en tu equipo lo que suena mientras lo reproduces, como un grabador, para tu estudio personal. No redistribuyas lo capturado.</p>
    </div>
  );
}

export function ImportPanel({ onLoad, recs, projects, onOpenProject, onDeleteProject }: { onLoad: LoadFn; recs: Recording[]; projects: StudioProject[]; onOpenProject: (p: StudioProject) => void; onDeleteProject: (p: StudioProject) => void }) {
  const [tab, setTab] = useState<Tab>(projects.length ? 'projects' : 'file');
  const [url, setUrl] = useState('');
  const [yt, setYt] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [cap, setCap] = useState<TabCapture | null>(null);
  const fromLink = async () => {
    setErr(''); setYt(null);
    const id = ytId(url);
    if (id) { setYt(id); return; }
    if (/spotify\.com|music\.apple\.com|deezer|tidal|soundcloud\.com/.test(url)) { setErr('Ese servicio no entrega su audio a otras apps. Reprodúcelo en otra pestaña y usa «Capturar otra pestaña».'); return; }
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(String(r.status));
      await onLoad(await r.blob(), decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'audio'), 'enlace');
    } catch { setErr('No se pudo descargar ese enlace: el servidor no lo permite desde otras páginas (CORS). Descarga el archivo y ábrelo desde «Archivo», o reprodúcelo en otra pestaña y captúralo.'); }
  };
  const startCapture = async () => {
    setErr('');
    try { setCap(await captureTabAudio(false, () => setCap(null))); } catch (e) { setErr((e as Error).name === 'NotAllowedError' ? 'No se dio permiso para capturar.' : (e as Error).message); }
  };
  return (
    <div className="import">
      <Segmented value={tab} onChange={(v) => { setTab(v); setErr(''); }} options={[
        { value: 'file', label: '📂 Archivo' }, { value: 'link', label: '🔗 Enlace o YouTube' }, { value: 'capture', label: '🖥 Capturar pestaña' },
        ...(recs.length ? [{ value: 'recs' as Tab, label: '🎙 Mis grabaciones' }] : []), { value: 'projects', label: `💾 Mis proyectos${projects.length ? ` (${projects.length})` : ''}` },
      ]} />
      {tab === 'file' && (
        <div className="drop">
          <label className="btn primary big">📂 Elegir audio o video<input type="file" accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.flac,.ogg,.mp4,.mov,.webm" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) await onLoad(f, f.name.replace(/\.[^.]+$/, ''), 'archivo'); }} /></label>
          <p className="muted small">MP3, WAV, M4A, FLAC, OGG o un video (MP4, MOV, WEBM: se usa su audio). Todo se procesa en tu dispositivo: nada se sube a internet.</p>
        </div>
      )}
      {tab === 'link' && (
        <div>
          <div className="row gap wrap">
            <input className="wide" placeholder="Pega un enlace de YouTube o un enlace directo a un archivo de audio" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && url) fromLink(); }} />
            <button className="btn primary" disabled={!url} onClick={fromLink}>Abrir</button>
          </div>
          {yt && <YouTubeCapture key={yt} id={yt} onLoad={onLoad} />}
        </div>
      )}
      {tab === 'capture' && (
        <div>
          {!canCaptureTab() ? <p className="warn small">Este navegador no permite capturar el audio de otra pestaña (en celulares no está disponible). Usa Chrome o Edge en un computador.</p> : cap ? (
            <Recorder capture={cap} onStop={async () => { const b = await cap.stop(); setCap(null); await onLoad(b, `Captura ${new Date().toLocaleString()}`, 'captura de pestaña'); }} onCancel={() => { cap.cancel(); setCap(null); }} />
          ) : (
            <>
              <ol className="small steps">
                <li>Abre en otra pestaña el reproductor que suena (un video, un servicio de música, una clase…).</li>
                <li>Aquí pulsa <b>⏺ Capturar otra pestaña</b>, elige esa pestaña y marca <b>«Compartir también el audio»</b>.</li>
                <li>Reproduce el fragmento y vuelve para pulsar <b>Terminar</b>.</li>
              </ol>
              <button className="btn primary" onClick={startCapture}>⏺ Capturar otra pestaña</button>
              <p className="muted small">Graba en tu equipo lo que suena, en tiempo real, para tu estudio personal. Respeta los derechos de autor: no redistribuyas lo capturado.</p>
            </>
          )}
        </div>
      )}
      {tab === 'recs' && (
        <div className="list">
          {recs.map((r) => <button key={r.id} className="list-row" onClick={() => onLoad(r.blob, r.title, 'mi grabación')}><b>{r.title}</b><small>{new Date(r.createdAt).toLocaleString()} · {Math.round(r.durationSec)} s</small></button>)}
        </div>
      )}
      {tab === 'projects' && (
        <div className="list">
          {!projects.length && <p className="muted small">Aún no tienes proyectos guardados. Abre un audio y pulsa «💾 Guardar proyecto».</p>}
          {projects.map((p) => (
            <div key={p.id} className="list-row">
              <button className="link" onClick={() => onOpenProject(p)}><b>{p.name}</b></button>
              <small>{new Date(p.updatedAt).toLocaleString()} · {p.source}{p.stems ? ' · con pistas separadas' : ''}</small>
              <button className="btn sm" onClick={() => { if (confirm(`¿Borrar el proyecto «${p.name}»?`)) onDeleteProject(p); }}>Borrar</button>
            </div>
          ))}
        </div>
      )}
      {err && <p className="warn small">{err}</p>}
    </div>
  );
}

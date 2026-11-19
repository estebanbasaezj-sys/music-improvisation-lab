// Reproductor de YouTube DENTRO de la app: un iframe del reproductor oficial de YouTube,
// sin cargar scripts externos. Se controla con el protocolo de mensajes del propio reproductor
// (enablejsapi=1): así sabemos si está listo, si suena (barra «Sonando ahora»), si falla (video eliminado
// o que no permite insertarse: se prueba el siguiente verificado) y podemos cambiar la velocidad o pausarlo.
// La app no descarga ni extrae audio del video.
import { useEffect, useRef, useState } from 'react';
import { endActivity, registerActivity } from '../audio/engine';
import { spotifySearchUrl, youtubeSearchUrl, youtubeWatchUrl } from '../content/repertoire';

const ERR: Record<number, string> = {
  2: 'identificador no válido', 5: 'el navegador no puede reproducirlo', 100: 'el video ya no existe o es privado',
  101: 'el propietario no permite verlo dentro de otras páginas', 150: 'el propietario no permite verlo dentro de otras páginas',
};

export interface VideoRef { id: string; title: string; channel: string; embed?: boolean; note?: string }

export function YouTubeEmbed({ videos: all, query, checked }: { videos: VideoRef[]; query: string; checked: string }) {
  // solo se insertan los videos que permiten reproducirse dentro de otras páginas; el resto se abre en YouTube
  const videos = all.filter((x) => x.embed !== false);
  const external = all.filter((x) => x.embed === false);
  if (!videos.length) return <ExternalOnly videos={external} query={query} checked={checked} />;
  return <Embedded videos={videos} external={external} query={query} checked={checked} />;
}

function ExternalOnly({ videos, query, checked }: { videos: VideoRef[]; query: string; checked: string }) {
  const v = videos[0];
  return (
    <div className="yt">
      <a className="yt-poster ext" href={youtubeWatchUrl(v.id)} target="_blank" rel="noreferrer">
        <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <span className="yt-cap">Abrir en YouTube ↗ (se abre aparte)</span>
      </a>
      <p className="small">
        ℹ️ El sello discográfico de esta grabación <b>no permite reproducirla dentro de otras apps</b> (YouTube lo bloquea con el error 150), y no encontramos otra versión oficial que lo permita. Puedes abrirla en YouTube o en la app de YouTube y volver aquí para practicar.
      </p>
      <p className="small muted">{v.channel} · «{v.title}» · enlace oficial comprobado el {checked}.</p>
      <div className="yt-fallback">
        <a className="btn sm" href={youtubeSearchUrl(query)} target="_blank" rel="noreferrer">Buscar en YouTube ↗</a>
        <a className="btn sm" href={spotifySearchUrl(query)} target="_blank" rel="noreferrer">Buscar en Spotify ↗</a>
      </div>
    </div>
  );
}

function Embedded({ videos, external, query, checked }: { videos: VideoRef[]; external: VideoRef[]; query: string; checked: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [idx, setIdx] = useState(0);
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'quiet' | 'failed'>('idle');
  const [errors, setErrors] = useState<string[]>([]);
  const [rate, setRate] = useState(1);
  const [rates, setRates] = useState<number[]>([]);
  const actId = useRef(`yt-${Math.random().toString(36).slice(2)}`);
  const v = videos[idx];
  const origin = window.location.origin.startsWith('http') ? window.location.origin : '';
  const src = `https://www.youtube.com/embed/${v.id}?enablejsapi=1&autoplay=1&rel=0&playsinline=1&modestbranding=1${origin ? `&origin=${encodeURIComponent(origin)}` : ''}`;

  const post = (msg: object) => { try { frame.current?.contentWindow?.postMessage(JSON.stringify(msg), '*'); } catch { /* sin acceso */ } };
  const command = (func: string, args: unknown[] = []) => post({ event: 'command', func, args, id: 1, channel: 'widget' });

  useEffect(() => {
    if (state === 'idle' || state === 'failed') return;
    let ready = false;
    const onMsg = (e: MessageEvent) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      let d: { event?: string; info?: unknown };
      try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
      if (!d || typeof d !== 'object') return;
      const playerState = (st: number) => {
        if (st === 1) registerActivity(actId.current, () => command('pauseVideo'), `Video de YouTube: «${v.title}»`);
        else if (st === 2 || st === 0) endActivity(actId.current);
      };
      if (d.event === 'onReady') { ready = true; setState('ok'); }
      else if (d.event === 'onStateChange' && typeof d.info === 'number') playerState(d.info);
      else if ((d.event === 'infoDelivery' || d.event === 'initialDelivery') && d.info && typeof d.info === 'object') {
        const info = d.info as { playerState?: number; availablePlaybackRates?: number[] };
        if (!ready) { ready = true; setState('ok'); }
        if (typeof info.playerState === 'number') playerState(info.playerState);
        if (Array.isArray(info.availablePlaybackRates)) setRates(info.availablePlaybackRates);
      } else if (d.event === 'onError' && typeof d.info === 'number') {
        const code = d.info;
        endActivity(actId.current);
        setErrors((x) => [...x, `«${v.title}»: ${ERR[code] ?? `error ${code}`}`]);
        if (idx + 1 < videos.length) { setIdx(idx + 1); setState('loading'); } else setState('failed');
      }
    };
    window.addEventListener('message', onMsg);
    // el reproductor empieza a enviar eventos cuando le decimos que estamos escuchando (como hace la API oficial)
    const ping = window.setInterval(() => { if (!ready) post({ event: 'listening', id: 1, channel: 'widget' }); }, 300);
    // si no responde, el video igual puede verse y usarse con sus propios controles: solo se desactivan los extras
    const quiet = window.setTimeout(() => { if (!ready) setState('quiet'); }, 9000);
    return () => { window.removeEventListener('message', onMsg); clearInterval(ping); clearTimeout(quiet); };
  }, [idx, state === 'idle' || state === 'failed']); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => endActivity(actId.current), []);

  const setSpeed = (r: number) => { setRate(r); command('setPlaybackRate', [r]); };
  return (
    <div className="yt">
      {state === 'idle' ? (
        <button className="yt-poster" onClick={() => setState('loading')} aria-label={`Reproducir ${v.title}`}>
          <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span className="yt-play" aria-hidden="true"><svg viewBox="0 0 68 48" width="68" height="48"><path d="M66.5 7.7A8.5 8.5 0 0 0 60.5 1.7C55.2.3 34 .3 34 .3S12.8.3 7.5 1.7a8.5 8.5 0 0 0-6 6C.1 13 .1 24 .1 24s0 11 1.4 16.3a8.5 8.5 0 0 0 6 6c5.3 1.4 26.5 1.4 26.5 1.4s21.2 0 26.5-1.4a8.5 8.5 0 0 0 6-6c1.4-5.3 1.4-16.3 1.4-16.3s0-11-1.4-16.3z" fill="#f00" /><path d="M45 24 27 14v20z" fill="#fff" /></svg></span>
          <span className="yt-cap">▶ Escuchar la grabación original aquí</span>
        </button>
      ) : state !== 'failed' ? (
        <div className="yt-frame">
          <iframe
            key={v.id}
            ref={frame}
            src={src}
            title={`${v.title} — ${v.channel}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => post({ event: 'listening', id: 1, channel: 'widget' })}
          />
        </div>
      ) : null}
      {state === 'ok' && (
        <div className="row gap wrap yt-ctl">
          <span className="small muted">Velocidad del video:</span>
          {[0.5, 0.75, 1].filter((r) => !rates.length || rates.includes(r)).map((r) => <button key={r} className={`chip ${rate === r ? 'on' : ''}`} onClick={() => setSpeed(r)}>{r === 1 ? 'Normal' : `${r}×`}</button>)}
        </div>
      )}
      {state === 'failed' && (
        <div className="warn small">
          YouTube informó que estos videos no se pueden ver dentro de la app ahora mismo:
          <ul>{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}
      {v.note && <p className="small">{v.note}.</p>}
      <p className="small muted">
        {v.channel} · «{v.title}» · enlace oficial comprobado el {checked}{state === 'ok' ? ' y ahora mismo ✔' : ''}.
        {state === 'quiet' && ' Usa los controles del propio video (la velocidad desde ⚙ en el reproductor).'}
      </p>
      <details className="yt-alt">
        <summary>¿No se ve el video? Otras opciones</summary>
        <p className="small">Algunas redes o navegadores bloquean los videos insertados. Puedes abrirlo aparte (se abre en otra pestaña o en la app de YouTube):</p>
        <div className="yt-fallback">
          <a className="btn sm" href={youtubeWatchUrl(v.id)} target="_blank" rel="noreferrer">Abrir en YouTube ↗</a>
          {external.slice(0, 1).map((x) => <a key={x.id} className="btn sm" href={youtubeWatchUrl(x.id)} target="_blank" rel="noreferrer">Grabación original de estudio ↗</a>)}
          <a className="btn sm" href={youtubeSearchUrl(query)} target="_blank" rel="noreferrer">Buscar en YouTube ↗</a>
          <a className="btn sm" href={spotifySearchUrl(query)} target="_blank" rel="noreferrer">Buscar en Spotify ↗</a>
        </div>
      </details>
    </div>
  );
}

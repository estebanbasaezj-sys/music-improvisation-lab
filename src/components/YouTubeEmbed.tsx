// Reproductor de YouTube con comprobación en vivo del enlace: usa la API oficial (IFrame Player API).
// Si YouTube informa de un error (video eliminado, privado o que no permite insertarse) se prueba el
// siguiente video verificado; si ninguno funciona o el reproductor no puede cargarse en esta vista,
// se muestran enlaces directos y búsquedas. La app no descarga ni extrae audio del video.
import { useEffect, useRef, useState } from 'react';
import { endActivity, registerActivity } from '../audio/engine';
import { spotifySearchUrl, youtubeSearchUrl, youtubeWatchUrl } from '../content/repertoire';

interface YTPlayer {
  destroy(): void;
  pauseVideo(): void;
  setPlaybackRate(r: number): void;
  getAvailablePlaybackRates(): number[];
}
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: unknown) => YTPlayer; PlayerState: Record<string, number> };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<boolean> | null = null;
function loadApi(): Promise<boolean> {
  if (window.YT?.Player) return Promise.resolve(true);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<boolean>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(true); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => { apiPromise = null; resolve(false); };
    document.head.appendChild(s);
    setTimeout(() => resolve(!!window.YT?.Player), 12000);
  });
  return apiPromise;
}

const ERR: Record<number, string> = {
  2: 'identificador no válido', 5: 'el navegador no puede reproducirlo', 100: 'el video ya no existe o es privado',
  101: 'el propietario no permite verlo insertado', 150: 'el propietario no permite verlo insertado',
};

export interface VideoRef { id: string; title: string; channel: string }

export function YouTubeEmbed({ videos, query, checked }: { videos: VideoRef[]; query: string; checked: string }) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [idx, setIdx] = useState(0);
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'failed' | 'blocked'>('idle');
  const [errors, setErrors] = useState<string[]>([]);
  const [rate, setRate] = useState(1);
  const [rates, setRates] = useState<number[]>([]);
  const actId = useRef(`yt-${Math.random().toString(36).slice(2)}`);
  const v = videos[idx];

  useEffect(() => {
    if (state === 'idle' || !v) return;
    let alive = true;
    setState('loading');
    loadApi().then((ok) => {
      if (!alive) return;
      if (!ok || !window.YT || !host.current) { setState('blocked'); return; }
      host.current.innerHTML = '';
      const el = document.createElement('div');
      host.current.appendChild(el);
      player.current = new window.YT.Player(el, {
        videoId: v.id,
        host: 'https://www.youtube-nocookie.com',
        width: '100%', height: '100%',
        playerVars: { rel: 0, playsinline: 1, modestbranding: 1, origin: window.location.origin.startsWith('http') ? window.location.origin : undefined },
        events: {
          onReady: (e: { target: YTPlayer }) => { if (!alive) return; setState('ok'); try { setRates(e.target.getAvailablePlaybackRates()); } catch { /* sin datos */ } },
          onError: (e: { data: number }) => {
            if (!alive) return;
            setErrors((x) => [...x, `${v.title}: ${ERR[e.data] ?? `error ${e.data}`}`]);
            player.current?.destroy(); player.current = null;
            if (idx + 1 < videos.length) setIdx(idx + 1);
            else setState('failed');
          },
          onStateChange: (e: { data: number }) => {
            const PS = window.YT?.PlayerState;
            if (!PS) return;
            if (e.data === PS.PLAYING) registerActivity(actId.current, () => player.current?.pauseVideo());
            else if (e.data === PS.PAUSED || e.data === PS.ENDED) endActivity(actId.current);
          },
        },
      });
    });
    return () => { alive = false; endActivity(actId.current); try { player.current?.destroy(); } catch { /* ya destruido */ } player.current = null; };
  }, [idx, state === 'idle']); // eslint-disable-line react-hooks/exhaustive-deps

  const setSpeed = (r: number) => { setRate(r); try { player.current?.setPlaybackRate(r); } catch { /* no disponible */ } };
  const fallback = (
    <div className="yt-fallback">
      <a className="btn" href={youtubeWatchUrl(videos[0].id)} target="_blank" rel="noreferrer">▶ Abrir en YouTube</a>
      <a className="btn" href={youtubeSearchUrl(query)} target="_blank" rel="noreferrer">🔎 Buscar en YouTube</a>
      <a className="btn" href={spotifySearchUrl(query)} target="_blank" rel="noreferrer">🎧 Buscar en Spotify</a>
    </div>
  );
  return (
    <div className="yt">
      {state === 'idle' ? (
        <button className="yt-poster" onClick={() => setState('loading')} aria-label={`Reproducir ${v.title}`}>
          <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span className="yt-play" aria-hidden="true"><svg viewBox="0 0 68 48" width="68" height="48"><path d="M66.5 7.7A8.5 8.5 0 0 0 60.5 1.7C55.2.3 34 .3 34 .3S12.8.3 7.5 1.7a8.5 8.5 0 0 0-6 6C.1 13 .1 24 .1 24s0 11 1.4 16.3a8.5 8.5 0 0 0 6 6c5.3 1.4 26.5 1.4 26.5 1.4s21.2 0 26.5-1.4a8.5 8.5 0 0 0 6-6c1.4-5.3 1.4-16.3 1.4-16.3s0-11-1.4-16.3z" fill="#f00" /><path d="M45 24 27 14v20z" fill="#fff" /></svg></span>
          <span className="yt-cap">Escuchar la grabación original</span>
        </button>
      ) : (
        <div className={`yt-frame ${state}`} ref={host}>{state === 'loading' && <span className="muted">Cargando reproductor…</span>}</div>
      )}
      {state === 'ok' && (
        <div className="row gap wrap yt-ctl">
          <span className="small muted">Velocidad del video:</span>
          {[0.5, 0.75, 1].filter((r) => !rates.length || rates.includes(r)).map((r) => <button key={r} className={`chip ${rate === r ? 'on' : ''}`} onClick={() => setSpeed(r)}>{r === 1 ? 'Normal' : `${r}×`}</button>)}
        </div>
      )}
      {(state === 'failed' || state === 'blocked') && (
        <div className="warn small">
          {state === 'blocked' ? 'El reproductor de YouTube no se pudo cargar en esta vista (puede estar bloqueado por el navegador o por la página que contiene la app).' : 'YouTube informó que estos videos no están disponibles ahora mismo:'}
          {errors.length > 0 && <ul>{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        </div>
      )}
      <p className="small muted">
        {v.channel} · «{v.title}» · enlace oficial comprobado el {checked}{state === 'ok' ? ' y ahora mismo ✔' : ''}.
      </p>
      {fallback}
    </div>
  );
}

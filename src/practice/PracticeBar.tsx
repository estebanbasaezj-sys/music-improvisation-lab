// Barra de práctica común a toda la app (Taller, sesión guiada, Repertorio, Canciones, Laboratorio…):
// mismos nombres, mismo orden y mismo lugar para Escuchar ejemplo · Tocar con la base · Detener · Tempo ·
// Repetir fragmento. Mientras suena dice «Escucha» o «Tu turno», el compás y el acorde actual y siguiente;
// en el celular esos controles quedan fijos abajo. Al terminar un intento con la base propone qué hacer.
import { ReactNode, useEffect, useRef, useState } from 'react';
import { LayerToggles } from '../components/Mixer';
import { INSTRUMENT_ICON } from '../theory/instruments';
import { SkillId, addEvidence, addXp, logPractice, useAppState } from '../progress/store';
import { useTake } from './take';

export type PlayMode = 'example' | 'base' | 'line' | 'call' | null;
export type Turn = 'escucha' | 'tu';
export interface PracticeStatus {
  turn: Turn;
  /** compás actual (1 = primero) y total */
  bar: number | null;
  bars: number;
  chord?: string;
  next?: string;
  /** cuenta de entrada (1–4) mientras suena */
  count?: number | null;
}
export interface Fragment { id: string; label: string }

export interface AttemptInfo {
  /** de qué se trata (para el registro y la grabación) */
  context: string;
  /** tiempos tocados con la base en este intento */
  beatsPlayed: number;
  onSavePhrase?: () => void;
  phraseSaved?: boolean;
  skills?: SkillId[];
}

interface Props {
  playing: PlayMode;
  onExample?: () => void;
  onBase: () => void;
  onStop: () => void;
  bpm: number;
  onBpm: (n: number) => void;
  min?: number;
  max?: number;
  fragments?: Fragment[];
  frag?: string;
  onFrag?: (id: string) => void;
  status?: PracticeStatus | null;
  /** controles secundarios propios de la pantalla (estilo, solo la melodía…) */
  more?: ReactNode;
  /** tonalidad / transposición */
  keyControl?: ReactNode;
  /** ayudas de lectura (grados o notas, cifrado de concierto…) */
  readingAids?: ReactNode;
  /** capas del mezclador que no aplican aquí */
  hideLayers?: ('melody' | 'click')[];
  attempt?: AttemptInfo;
}

// varias barras pueden existir a la vez; solo importa si alguna está sonando
let live = 0;
const setLive = (d: number) => {
  live = Math.max(0, live + d);
  document.body.classList.toggle('pb-live', live > 0);
};

export function PracticeBar(p: Props) {
  const app = useAppState();
  const icon = INSTRUMENT_ICON[app.instrument];
  const { min = 40, max = 240 } = p;
  const step = (d: number) => p.onBpm(Math.max(min, Math.min(max, Math.round((p.bpm + d) / 5) * 5)));
  useEffect(() => {
    if (!p.playing) return;
    setLive(1);
    return () => setLive(-1);
  }, [!!p.playing]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- cierre del intento con la base -----
  const take = useTake(app.instrument);
  const [after, setAfter] = useState<{ beats: number; bpm: number } | null>(null);
  const [rated, setRated] = useState<string | null>(null);
  const prev = useRef<PlayMode>(null);
  const beatsRef = useRef(0);
  beatsRef.current = p.attempt?.beatsPlayed ?? 0;
  useEffect(() => {
    const was = prev.current;
    prev.current = p.playing;
    if (p.playing) { if (p.playing === 'base') { setAfter(null); setRated(null); } return; }
    if (take.state === 'rec') take.stop();
    if (was === 'base' && p.attempt && beatsRef.current >= 8) setAfter({ beats: beatsRef.current, bpm: p.bpm });
  }, [p.playing]); // eslint-disable-line react-hooks/exhaustive-deps
  const recordTake = async () => {
    take.discard();
    const ok = await take.start();
    if (ok) p.onBase();
  };
  const rate = (r: 'bien' | 'casi' | 'dificil') => {
    if (!after || rated) return;
    setRated(r);
    const mins = Math.max(1, Math.round((after.beats * 60) / after.bpm / 60));
    logPractice(app.instrument, mins);
    addXp(5);
    for (const sk of p.attempt?.skills ?? ['improvisacion']) addEvidence(app.instrument, sk, { source: 'autoevaluacion', value: r === 'bien' ? 85 : r === 'casi' ? 60 : 35, note: p.attempt?.context });
  };
  const playTake = () => { if (take.url) void new Audio(take.url).play().catch(() => undefined); };

  const st = p.playing ? p.status : null;
  const turnText = st?.count ? `Cuenta… ${st.count}` : st?.turn === 'tu' ? `${icon} Tu turno` : '🎧 Escucha';
  const statusRow = st && (
    <div className={`pb-status t-${st.count ? 'count' : st.turn}`} aria-live="polite">
      <span className="pb-turn">{turnText}</span>
      {st.bar !== null && !st.count && <span className="pb-bar"><small>Compás</small><b>{st.bar}</b><small>de {st.bars}</small></span>}
      {st.chord && <span className="pb-chord"><small>Acorde</small><b>{st.chord}</b>{st.next && st.next !== st.chord && <><i aria-hidden="true">→</i><span className="pb-next" aria-label={`siguiente ${st.next}`}>{st.next}</span></>}</span>}
    </div>
  );
  const tempo = (
    <div className="pb-tempo" role="group" aria-label="Tempo">
      <span className="pb-lbl">Tempo</span>
      <button type="button" className="pb-step" onClick={() => step(-5)} aria-label="Más lento">−</button>
      <output className="pb-bpm" aria-live="polite">♩ = {Math.round(p.bpm)}</output>
      <button type="button" className="pb-step" onClick={() => step(5)} aria-label="Más rápido">+</button>
      <input className="pb-range" type="range" min={min} max={max} value={p.bpm} aria-label="Tempo" onChange={(e) => p.onBpm(+e.target.value)} />
    </div>
  );
  const recording = take.state === 'rec';

  return (
    <div className={`practice-bar ${p.playing ? 'is-live' : ''}`}>
      <div className="pb-main">
        {p.onExample && (
          <button type="button" className={`btn pb-example ${p.playing === 'example' ? 'on' : ''}`} aria-pressed={p.playing === 'example'} onClick={p.onExample}>
            <span aria-hidden="true">🎧</span> Escuchar ejemplo
          </button>
        )}
        <button type="button" className={`btn primary pb-base ${p.playing === 'base' ? 'on' : ''}`} aria-pressed={p.playing === 'base'} onClick={() => { setAfter(null); p.onBase(); }}>
          <span aria-hidden="true">🥁</span> Tocar con la base
        </button>
        <button type="button" className="btn stop pb-stop" disabled={!p.playing} onClick={p.onStop}>
          <span className="sq" aria-hidden="true" /> Detener
        </button>
      </div>
      <div className="pb-sub">
        {tempo}
        {p.fragments && p.fragments.length > 1 && p.onFrag && (
          <label className="pb-frag">
            <span className="pb-lbl">🔁 Repetir fragmento</span>
            <select value={p.frag ?? 'all'} onChange={(e) => p.onFrag!(e.target.value)}>
              {p.fragments.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </label>
        )}
        {recording && <span className="pb-rec" role="status">● Grabando tu toma · {take.secs} s</span>}
      </div>
      {statusRow}
      <details className="pb-more">
        <summary>⚙ Mezclador, tonalidad y ayudas de lectura</summary>
        <div className="pb-more-body">
          <div className="pb-group"><span className="pb-lbl">Qué suena</span><LayerToggles hide={p.hideLayers ?? []} /><span className="small muted">Volúmenes y combinaciones: botón «Mezcla» de arriba.</span></div>
          {p.keyControl && <div className="pb-group"><span className="pb-lbl">Tonalidad y transposición</span>{p.keyControl}</div>}
          {p.readingAids && <div className="pb-group"><span className="pb-lbl">Ayudas de lectura</span>{p.readingAids}</div>}
          {p.more && <div className="pb-group">{p.more}</div>}
        </div>
      </details>
      {take.err && <p className="warn small">{take.err} Puedes seguir sin grabar.</p>}
      {after && p.attempt && !p.playing && (
        <div className="attempt" role="status">
          <p className="at-head"><b>¡Bien! Tocaste {Math.max(1, Math.round(after.beats / 4))} compases con la base a ♩ = {after.bpm}.</b> ¿Qué quieres hacer ahora?</p>
          <div className="at-actions">
            <button type="button" className="btn primary" onClick={() => { setAfter(null); p.onBase(); }}>🔁 Repetir</button>
            {take.url ? (
              <>
                <button type="button" className="btn" onClick={playTake}>▶ Escuchar la toma</button>
                <button type="button" className="btn" disabled={take.saved} onClick={() => take.save(p.attempt!.context, p.attempt!.context)}>{take.saved ? '✓ Guardada en Grabaciones' : '💾 Guardar la toma'}</button>
              </>
            ) : (
              <button type="button" className="btn" onClick={recordTake} title="Se pide permiso de micrófono solo al grabar">● Grabar una toma</button>
            )}
            {p.attempt.onSavePhrase && (
              <button type="button" className="btn" disabled={p.attempt.phraseSaved} onClick={p.attempt.onSavePhrase}>{p.attempt.phraseSaved ? '✓ Frase en tu vocabulario' : '☆ Guardar la frase'}</button>
            )}
          </div>
          <div className="at-rate">
            <span>¿Cómo te salió?</span>
            {(['bien', 'casi', 'dificil'] as const).map((r) => (
              <button key={r} type="button" className={`chip ${rated === r ? 'on' : ''}`} aria-pressed={rated === r} disabled={!!rated && rated !== r} onClick={() => rate(r)}>
                {r === 'bien' ? '😀 Bien' : r === 'casi' ? '🙂 Casi' : '😕 Me costó'}
              </button>
            ))}
            {rated && <span className="ok small">✓ Registrado en tu progreso (+5 XP)</span>}
          </div>
          {!take.url && <p className="small muted">La grabación es opcional: el micrófono se pide solo si eliges grabar.</p>}
        </div>
      )}
      {p.playing && (
        <div className="pb-dock" role="region" aria-label="Controles de práctica">
          {statusRow}
          <div className="pb-dock-ctl">
            <button type="button" className="pb-step" onClick={() => step(-5)} aria-label="Más lento">−</button>
            <output className="pb-bpm">♩ {Math.round(p.bpm)}</output>
            <button type="button" className="pb-step" onClick={() => step(5)} aria-label="Más rápido">+</button>
            <button type="button" className="btn stop pb-stop" onClick={p.onStop}><span className="sq" aria-hidden="true" /> Detener</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Lista de fragmentos «Todo» + bloques de 4 compases (o las secciones del tema). */
export function barFragments(totalBars: number, sections?: { label: string; fromBar: number; toBar: number }[]): Fragment[] {
  const out: Fragment[] = [{ id: 'all', label: `Todo (${totalBars} compases)` }];
  const seen = new Set<string>(['all']);
  const add = (a: number, b: number, label: string) => {
    const id = `${a}-${b}`;
    if (seen.has(id) || a < 1 || b > totalBars || a > b) return;
    seen.add(id);
    out.push({ id, label });
  };
  sections?.forEach((s) => add(s.fromBar + 1, s.toBar + 1, `Sección ${s.label} · c. ${s.fromBar + 1}–${s.toBar + 1}`));
  if (totalBars > 4) for (let b = 1; b <= totalBars; b += 4) add(b, Math.min(totalBars, b + 3), `Compases ${b}–${Math.min(totalBars, b + 3)}`);
  return out;
}

/** «3-6» → [3, 6] (compases, base 1) si es válido. */
export function parseFrag(id: string | null | undefined, totalBars: number): [number, number] | null {
  const m = /^(\d+)-(\d+)$/.exec(id ?? '');
  if (!m) return null;
  const a = +m[1], b = +m[2];
  return a >= 1 && b >= a && b <= totalBars ? [a, b] : null;
}

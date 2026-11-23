import { useEffect, useMemo, useRef, useState } from 'react';
import { MODULES } from '../content/lessons';
import { ModuleCard } from './Route';
import { SONGS, songById } from '../content/songs';
import { RESOURCES, youtubeId } from '../content/resources';
import { analyze, keyInterval, parseChart, transposeEvents } from '../theory/progressions';
import { parseNote, pc } from '../theory/notes';
import { BackingPanel } from '../components/BackingPanel';
import { KeySelect } from '../components/ExerciseRunner';
import { Card, KEY_OPTIONS, Segmented, StatusBadge, useNames, useTransposer } from '../components/common';
import { SpotProvider, fragWords, keyWords, useInitialParams, useSpot } from '../practice/spot';
import { barsForAnalysis } from '../content/analysisBars';
import { LINKS_CHECKED, TUNES } from '../content/repertoire';
import { YouTubeEmbed } from '../components/YouTubeEmbed';
import { update, useAppState } from '../progress/store';
import { INSTRUMENT_LABEL, InstrumentId, concertKeyToWritten } from '../theory/instruments';
import { Recording, deleteRecording, getAllRecordings, updateRecording } from '../recording/db';
import { Workshop } from '../components/Workshop';

// ------------------- Teoría aplicada -------------------
export function TheoryPage() {
  const s = useAppState();
  return (
    <div className="page">
      <h1>Teoría aplicada</h1>
      <p className="lead">Los conceptos se explican una sola vez y los ejercicios se adaptan al instrumento que tengas seleccionado ({INSTRUMENT_LABEL[s.instrument]}). Cambia de instrumento arriba para practicar el mismo concepto en los tres.</p>
      <p><a href="#/ruta">Ver también las lecciones completas de {INSTRUMENT_LABEL[s.instrument].toLowerCase()} por módulos →</a></p>
      {MODULES.filter((m) => m.track === 'shared').map((m) => <ModuleCard key={m.id} moduleId={m.id} inst={s.instrument} />)}
    </div>
  );
}

// ------------------- Canciones -------------------
const tuneForSong = (songId: string) => TUNES.find((t) => t.songId === songId);

export function SongsPage() {
  return (
    <div className="page">
      <h1>Canciones y standards</h1>
      <p className="lead">Progresiones armónicas, análisis y ejercicios por instrumento. Por derechos de autor no se incluyen melodías, letras ni partituras: apréndelas de grabaciones o de ediciones con licencia.</p>
      <div className="song-grid">
        {SONGS.map((s) => {
          const tune = tuneForSong(s.id);
          return (
            <a key={s.id} className="song-card" href={`#/cancion/${s.id}`}>
              <b>{s.title}</b>
              <span className="muted small">{s.composer}</span>
              <span className="small">{s.key} · {s.form} · {s.style}</span>
              <span className="lvl">Nivel {s.level}</span>
              {tune && <span className="pill">🎼 También en Repertorio</span>}
            </a>
          );
        })}
      </div>
    </div>
  );
}

type SongMode = 'ref' | 'ejercicio' | 'base';
const SONG_MODES: Record<SongMode, { icon: string; label: string }> = {
  ref: { icon: '🎧', label: 'Grabación de referencia' },
  ejercicio: { icon: '🎼', label: 'Ejercicio sobre la armonía' },
  base: { icon: '🥁', label: 'Tocar con la base' },
};

export function SongPage({ id }: { id: string }) {
  const song = songById(id);
  const names = useNames();
  return (
    <SpotProvider describe={(p) => {
      const m = (p.get('modo') as SongMode) || 'base';
      const key = p.get('tono') ?? song?.key.replace(/m$/, '') ?? 'C';
      return {
        id: `cancion:${id}`,
        title: `${song?.title ?? 'Canción'} · ${SONG_MODES[m].label}`,
        detail: `${fragWords(p.get('c'), 'tema completo')} · ♩ = ${p.get('bpm') ?? '—'} · ${keyWords(names(parseNote(key)), song?.key.endsWith('m'))}`,
      };
    }}>
      <SongBody id={id} />
    </SpotProvider>
  );
}

function SongBody({ id }: { id: string }) {
  const song = songById(id);
  const t = useTransposer();
  const names = useNames();
  const spot = useSpot();
  const params = useInitialParams();
  const tune = song ? tuneForSong(song.id) : undefined;
  const minor = song?.key.endsWith('m') ?? false;
  const origKey = song ? parseNote(song.key.replace(/m$/, '')) : parseNote('C');
  const [key, setKeyState] = useState(() => { const k = params.get('tono'); return k && KEY_OPTIONS.includes(k) ? k : song ? song.key.replace(/m$/, '') : 'C'; });
  const [bar, setBarState] = useState<[number, number] | null>(() => {
    const m = /^(\d+)-(\d+)$/.exec(params.get('c') ?? '');
    if (!m || !song) return null;
    const a = +m[1] - 1, b = +m[2] - 1;
    return a >= 0 && b < song.bars && a <= b ? [a, b] : null;
  });
  const [mode, setModeState] = useState<SongMode>(() => { const m = params.get('modo'); return m === 'ref' || m === 'ejercicio' || m === 'base' ? m : 'base'; });
  const practiceRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!params.get('c') && !params.get('modo')) return;
    const id = window.setTimeout(() => practiceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const setKey = (k: string) => { setKeyState(k); spot?.set({ tono: song && k === song.key.replace(/m$/, '') ? null : k }); };
  const setBar = (b: [number, number] | null) => { setBarState(b); spot?.set({ c: b ? `${b[0] + 1}-${b[1] + 1}` : null, frag: null }); };
  const setMode = (m: SongMode) => { setModeState(m); spot?.set({ modo: m === 'base' ? null : m, bpm: null, bpmBase: null, frag: null }); };
  const events = useMemo(() => {
    if (!song) return [];
    const base = parseChart(song.chart);
    const iv = keyInterval(origKey, parseNote(key));
    return transposeEvents(base, iv);
  }, [song, key]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = useMemo(() => (bar ? events.filter((e) => e.bar >= bar[0] && e.bar <= bar[1]).map((e) => ({ ...e, bar: e.bar - bar[0] })) : events), [events, bar]);
  if (!song) return <div className="page"><a href="#/canciones" className="back">← Canciones</a><p>Canción no encontrada.</p></div>;
  const inst: InstrumentId = t.instrument;
  const marks = analyze(events);
  const style = song.style === 'blues' ? 'blues' : song.style;
  const bpm = Math.min(song.tempo, song.style === 'ballad' ? 70 : 120);
  const barValue = bar ? `${bar[0]}-${bar[1]}` : 'all';
  const isSection = bar && song.sections.some((x) => x.fromBar === bar[0] && x.toBar === bar[1]);
  const practiceBars = (r: [number, number]) => {
    if (tune) {
      window.location.hash = `/tema/${tune.id}?modo=base&c=${r[0] + 1}-${r[1] + 1}${key !== song.key.replace(/m$/, '') ? `&tono=${encodeURIComponent(key)}` : ''}`;
      return;
    }
    setBar(r);
    setMode('base');
    setTimeout(() => practiceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };
  const keyControl = <KeySelect value={key} onChange={setKey} />;
  const title = `${song.title}${bar ? ` (compases ${bar[0] + 1}–${bar[1] + 1})` : ''}`;
  return (
    <div className="page">
      <div className="row between wrap">
        <a href="#/canciones" className="back">← Canciones</a>
        {tune && <a className="link-chip" href={`#/tema/${tune.id}`}>🎼 Tocar en Repertorio (grabación, melodía y base)</a>}
      </div>
      <h1>{song.title}</h1>
      <p className="lead">{song.composer} · {song.form} · tonalidad original {song.key}{t.isSax && ` (escrito ${names(concertKeyToWritten(origKey, t.sax, minor))}${minor ? 'm' : ''})`} · tempo sugerido {song.tempo}</p>
      <p>{song.overview}</p>
      {song.versionNote && <p className="warn">ℹ {song.versionNote}</p>}
      <Card title="Análisis">
        <ul className="analysis-list">
          {song.analysis.map((a) => {
            const r = barsForAnalysis(a, song);
            return (
              <li key={a}>
                <span>{a}</span>
                {r && <button className="btn sm" onClick={() => practiceBars(r)}>▶ Practicar estos compases <small>(c. {r[0] + 1}–{r[1] + 1})</small></button>}
              </li>
            );
          })}
        </ul>
        <p className="muted small">Detección automática: {marks.filter((m) => m.label.startsWith('ii')).length} ii-V encontrados. {tune ? '«Practicar estos compases» abre el tema en Repertorio con la base preparada en esos compases.' : '«Practicar estos compases» prepara la base en esos compases, aquí abajo.'}</p>
      </Card>

      <div ref={practiceRef} />
      <h2 className="sec-title">¿Qué quieres escuchar?</h2>
      <div className="mode-cards" role="radiogroup" aria-label="Qué escuchar">
        {(Object.keys(SONG_MODES) as SongMode[]).map((m) => (
          <button key={m} role="radio" aria-checked={mode === m} className={`mode-card ${mode === m ? 'on' : ''}`} onClick={() => setMode(m)}>
            <span className="mc-ico" aria-hidden="true">{SONG_MODES[m].icon}</span>
            <b>{SONG_MODES[m].label}{mode === m && <span className="mc-check"> ✓</span>}</b>
            <small>{m === 'ref' ? (tune ? `La grabación original de ${tune.recording.artist} (${tune.recording.year}).` : 'Dónde escuchar el tema original (la app no reproduce grabaciones con derechos).') : m === 'ejercicio' ? 'Solos de ejemplo y frases creados por la app sobre estos acordes (no es la melodía original).' : 'Solo el acompañamiento: tocas tú. Sin micrófono.'}</small>
          </button>
        ))}
      </div>
      {mode !== 'ref' && (
        <div className="tune-controls">
          {keyControl}
          <label className="field inline"><span>Compases</span>
            <select value={barValue} onChange={(e) => setBar(e.target.value === 'all' ? null : (e.target.value.split('-').map(Number) as [number, number]))}>
              <option value="all">Tema completo ({song.bars} compases)</option>
              {song.sections.map((s, i) => <option key={i} value={`${s.fromBar}-${s.toBar}`}>{s.label} (c. {s.fromBar + 1}–{s.toBar + 1})</option>)}
              {bar && !isSection && <option value={barValue}>Compases {bar[0] + 1}–{bar[1] + 1}</option>}
            </select>
          </label>
        </div>
      )}
      {mode === 'ref' && (
        <Card title="🎧 Grabación de referencia">
          {tune ? (
            <>
              <p className="small">{tune.recording.artist} — <i>{tune.recording.album}</i> ({tune.recording.year}).</p>
              <YouTubeEmbed key={tune.id} videos={tune.recording.youtube} query={`${tune.title} ${tune.recording.artist}`} checked={LINKS_CHECKED} />
            </>
          ) : (
            <p className="small">Busca «{song.externalSearch}» en tu plataforma de música o vídeo. La app no descarga ni extrae audio de vídeos.</p>
          )}
          <div className="row gap wrap"><button className="btn" onClick={() => setMode('base')}>🥁 Ahora, tocar con la base</button></div>
        </Card>
      )}
      {mode === 'base' && (
        <Card title="🥁 Tocar con la base">
          <BackingPanel key={`${key}-${barValue}`} events={shown} style={style} bpm={bpm} showAnalysis={!bar} sections={bar ? undefined : song.sections} display="guide" keyControl={keyControl} context={title} />
        </Card>
      )}
      {mode === 'ejercicio' && (
        <Card title="🎼 Ejercicio sobre la armonía">
          <Workshop key={key + barValue} events={shown} originalKey={song.key} keyName={key} title={title} style={style} bpm={bpm} minor={minor} blues={song.style === 'blues' || song.id.includes('blues') || song.id === 'blue-monk'} prompts={song.tasks[inst]} />
        </Card>
      )}
      <Card title={`Tu experiencia en ${INSTRUMENT_LABEL[inst].toLowerCase()}`}>
        <ol>{song.tasks[inst].map((x) => <li key={x}>{x}</li>)}</ol>
        <p className="muted small">El mismo tema genera tres experiencias: cambia de instrumento arriba para ver las tareas de {(['sax', 'guitar', 'piano'] as InstrumentId[]).filter((i) => i !== inst).map((i) => INSTRUMENT_LABEL[i].toLowerCase()).join(' y ')}.</p>
      </Card>
      <Card title="Recursos externos">
        <p className="small">{song.practiceWith}</p>
        <p className="small">Cuando domines las secciones aquí, practica la forma completa (intro, choruses, final) en <a href="https://www.irealpro.com/" target="_blank" rel="noreferrer">iReal Pro</a> o similar.</p>
      </Card>
      <span className="hidden">{pc(origKey)}</span>
    </div>
  );
}

// ------------------- Recursos -------------------
export function ResourcesPage() {
  const s = useAppState();
  const inst = s.instrument;
  const [filter, setFilter] = useState<'mine' | 'all'>('mine');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [concept, setConcept] = useState('');
  const list = RESOURCES.filter((r) => filter === 'all' || r.instruments.includes(inst) || r.instruments.includes('all'));
  const verify = (id: string, ok: boolean) => update((st) => { if (ok) st.resources.verified[id] = new Date().toISOString().slice(0, 10); else delete st.resources.verified[id]; });
  return (
    <div className="page">
      <h1>Recursos y vídeos</h1>
      <p className="lead">Fuentes gratuitas o freemium relacionadas con cada objetivo. Cada lección recomienda las pertinentes en «Para profundizar».</p>
      <p className="warn">Transparencia: estos enlaces llevan a la página principal de cada sitio o canal; no se pudieron comprobar automáticamente desde el entorno donde se construyó la app. Márcalos como verificados cuando confirmes que abren correctamente. No se enlazan vídeos concretos para no inventar direcciones.</p>
      <Segmented size="sm" value={filter} onChange={setFilter} options={[{ value: 'mine', label: `Para ${INSTRUMENT_LABEL[inst].toLowerCase()}` }, { value: 'all', label: 'Todos' }]} />
      {list.map((r) => (
        <Card key={r.id} title={<a href={r.url} target="_blank" rel="noreferrer">{r.title} ↗</a>} actions={<span className={`badge ${s.resources.verified[r.id] ? 'ok' : 'pendiente'}`}>{s.resources.verified[r.id] ? `Verificado ${s.resources.verified[r.id]}` : 'No verificado'}</span>}>
          <p>{r.why}</p>
          <p className="muted small">{r.type} · {r.cost} · nivel {r.levels.join('–')} · {r.instruments.map((i) => (i === 'all' ? 'todos' : INSTRUMENT_LABEL[i])).join(', ')}{r.searchHint && ` · busca: «${r.searchHint}»`}</p>
          <label className="toggle"><input type="checkbox" checked={!!s.resources.verified[r.id]} onChange={(e) => verify(r.id, e.target.checked)} />Lo abrí y es correcto</label>
        </Card>
      ))}
      <Card title="Mis vídeos (reproductor oficial de YouTube)">
        <p className="small">Pega el enlace de un vídeo que hayas encontrado y relaciónalo con un concepto. Se reproduce con el reproductor oficial incrustado.</p>
        <div className="row gap wrap">
          <input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input placeholder="https://www.youtube.com/watch?v=…" value={url} onChange={(e) => setUrl(e.target.value)} className="wide" />
          <input placeholder="Concepto (ej. notas guía)" value={concept} onChange={(e) => setConcept(e.target.value)} />
          <button className="btn primary" disabled={!youtubeId(url)} onClick={() => { update((st) => { st.resources.custom.push({ id: crypto.randomUUID(), title: title || 'Vídeo', url, instrument: inst, concept }); }); setTitle(''); setUrl(''); setConcept(''); }}>Añadir</button>
        </div>
        {url && !youtubeId(url) && <p className="warn small">No reconozco ese enlace de YouTube.</p>}
        {s.resources.custom.map((c) => {
          const vid = youtubeId(c.url);
          return (
            <div key={c.id} className="video">
              <div className="row between"><b>{c.title}</b><span className="muted small">{c.concept} · {c.instrument === 'all' ? 'todos' : INSTRUMENT_LABEL[c.instrument]}</span><button className="btn sm" onClick={() => update((st) => { st.resources.custom = st.resources.custom.filter((x) => x.id !== c.id); })}>Quitar</button></div>
              {vid && <iframe src={`https://www.youtube-nocookie.com/embed/${vid}`} title={c.title} allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ------------------- Grabaciones -------------------
export function RecordingsPage() {
  const s = useAppState();
  const [recs, setRecs] = useState<Recording[]>([]);
  const [only, setOnly] = useState<'mine' | 'all'>('mine');
  const [cmp, setCmp] = useState<string[]>([]);
  const load = () => getAllRecordings().then(setRecs).catch(() => setRecs([]));
  useEffect(() => { load(); }, []);
  const urls = useMemo(() => Object.fromEntries(recs.map((r) => [r.id, URL.createObjectURL(r.blob)])), [recs]);
  useEffect(() => () => Object.values(urls).forEach((u) => URL.revokeObjectURL(u)), [urls]);
  const list = recs.filter((r) => only === 'all' || r.instrument === s.instrument);
  const toggleCmp = (id: string) => setCmp(cmp.includes(id) ? cmp.filter((x) => x !== id) : [...cmp.slice(-1), id]);
  return (
    <div className="page">
      <h1>Mis grabaciones</h1>
      <p className="lead">Se guardan solo en este dispositivo (IndexedDB). Selecciona dos para compararlas.</p>
      <Segmented size="sm" value={only} onChange={setOnly} options={[{ value: 'mine', label: INSTRUMENT_LABEL[s.instrument] }, { value: 'all', label: 'Todas' }]} />
      {cmp.length === 2 && (
        <Card title="Comparación" className="accent">
          {cmp.map((id) => { const r = recs.find((x) => x.id === id)!; return <div key={id}><b>{r.title}</b><audio controls src={urls[id]} /></div>; })}
          <p className="muted small">Escucha ambas seguidas: ¿qué mejoró? ¿qué sigue igual? Anótalo en los comentarios.</p>
        </Card>
      )}
      {list.length === 0 && <Card><p>Aún no hay grabaciones. Graba desde cualquier ejercicio de improvisación o desde la sesión diaria.</p></Card>}
      {list.map((r) => (
        <Card key={r.id} title={r.title} actions={<span className="muted small">{new Date(r.createdAt).toLocaleString()} · {r.durationSec}s · {INSTRUMENT_LABEL[r.instrument]}</span>}>
          <audio controls src={urls[r.id]} />
          {r.selfEval && Object.keys(r.selfEval).length > 0 && <p className="small">Autoevaluación: {Object.entries(r.selfEval).map(([k, v]) => `${k}: ${v}/5`).join(' · ')}</p>}
          <textarea defaultValue={r.notes} placeholder="Comentarios" onBlur={(e) => updateRecording(r.id, { notes: e.target.value })} />
          <div className="row gap">
            <label className="toggle"><input type="checkbox" checked={cmp.includes(r.id)} onChange={() => toggleCmp(r.id)} />Comparar</label>
            <a className="btn sm" href={urls[r.id]} download={`${r.title}.webm`}>Descargar</a>
            <button className="btn sm" onClick={async () => { if (confirm('¿Borrar esta grabación?')) { await deleteRecording(r.id); load(); } }}>Borrar</button>
          </div>
        </Card>
      ))}
      <Card title="Estado de la evaluación por audio">
        <table className="status-table">
          <tbody>
            <tr><td>Etapa 1: grabación, reproducción, comparación, comentarios y autoevaluación guiada</td><td><StatusBadge status="ok" /></td></tr>
            <tr><td>Etapa 2: reconocimiento de notas individuales (monofónico) y comparación de alturas de frases cortas</td><td><StatusBadge status="beta" /></td></tr>
            <tr><td>Etapa 2: precisión rítmica medida</td><td><StatusBadge status="pendiente" /></td></tr>
            <tr><td>Etapa 2: reconocimiento automático de arpegios</td><td><StatusBadge status="pendiente" /></td></tr>
            <tr><td>Etapa 3: análisis avanzado de frases, patrones y recomendaciones desde grabaciones</td><td><StatusBadge status="pendiente" /></td></tr>
            <tr><td>Reconocimiento de acordes de guitarra/piano por micrófono</td><td><StatusBadge status="pendiente" /></td></tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}

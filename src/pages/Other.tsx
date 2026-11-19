import { useEffect, useMemo, useState } from 'react';
import { MODULES } from '../content/lessons';
import { ModuleCard } from './Route';
import { SONGS, songById } from '../content/songs';
import { RESOURCES, youtubeId } from '../content/resources';
import { analyze, keyInterval, parseChart, transposeEvents } from '../theory/progressions';
import { parseNote, pc } from '../theory/notes';
import { BackingPanel } from '../components/BackingPanel';
import { KeySelect } from '../components/ExerciseRunner';
import { Card, Segmented, StatusBadge, useNames, useTransposer } from '../components/common';
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
export function SongsPage() {
  return (
    <div className="page">
      <h1>Canciones y standards</h1>
      <p className="lead">Progresiones armónicas, análisis y ejercicios por instrumento. Por derechos de autor no se incluyen melodías, letras ni partituras: apréndelas de grabaciones o de ediciones con licencia.</p>
      <div className="song-grid">
        {SONGS.map((s) => (
          <a key={s.id} className="song-card" href={`#/cancion/${s.id}`}>
            <b>{s.title}</b>
            <span className="muted small">{s.composer}</span>
            <span className="small">{s.key} · {s.form} · {s.style}</span>
            <span className="lvl">Nivel {s.level}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export function SongPage({ id }: { id: string }) {
  const song = songById(id);
  const t = useTransposer();
  const names = useNames();
  const minor = song?.key.endsWith('m') ?? false;
  const origKey = song ? parseNote(song.key.replace(/m$/, '')) : parseNote('C');
  const [key, setKey] = useState(song ? song.key.replace(/m$/, '') : 'C');
  const [bar, setBar] = useState<[number, number] | null>(null);
  const events = useMemo(() => {
    if (!song) return [];
    const base = parseChart(song.chart);
    const iv = keyInterval(origKey, parseNote(key));
    return transposeEvents(base, iv);
  }, [song, key]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = useMemo(() => (bar ? events.filter((e) => e.bar >= bar[0] && e.bar <= bar[1]).map((e) => ({ ...e, bar: e.bar - bar[0] })) : events), [events, bar]);
  if (!song) return <div className="page">Canción no encontrada.</div>;
  const inst: InstrumentId = t.instrument;
  const marks = analyze(events);
  return (
    <div className="page">
      <a href="#/canciones" className="back">← Canciones</a>
      <h1>{song.title}</h1>
      <p className="lead">{song.composer} · {song.form} · tonalidad original {song.key}{t.isSax && ` (escrito ${names(concertKeyToWritten(origKey, t.sax, minor))}${minor ? 'm' : ''})`} · tempo sugerido {song.tempo}</p>
      <p>{song.overview}</p>
      {song.versionNote && <p className="warn">ℹ {song.versionNote}</p>}
      <Card title="Análisis">
        <ul>{song.analysis.map((a) => <li key={a}>{a}</li>)}</ul>
        <p className="muted small">Detección automática: {marks.filter((m) => m.label.startsWith('ii')).length} ii-V encontrados.</p>
      </Card>
      <Card title="Practicar con acompañamiento">
        <div className="row gap wrap">
          <KeySelect value={key} onChange={setKey} />
          <label className="field inline"><span>Sección</span>
            <select value={bar ? `${bar[0]}-${bar[1]}` : 'all'} onChange={(e) => setBar(e.target.value === 'all' ? null : (e.target.value.split('-').map(Number) as [number, number]))}>
              <option value="all">Tema completo</option>
              {song.sections.map((s, i) => <option key={i} value={`${s.fromBar}-${s.toBar}`}>{s.label} (c. {s.fromBar + 1}–{s.toBar + 1})</option>)}
            </select>
          </label>
        </div>
        <BackingPanel events={shown} style={song.style === 'blues' ? 'blues' : song.style} bpm={Math.min(song.tempo, song.style === 'ballad' ? 70 : 120)} showAnalysis={!bar} sections={bar ? undefined : song.sections} display="guide" />
      </Card>
      <Card title="Ideas de improvisación sobre este tema">
        <Workshop key={key + (bar ? bar.join('-') : '')} events={shown} originalKey={song.key} keyName={key} title={`${song.title}${bar ? ` (compases ${bar[0] + 1}–${bar[1] + 1})` : ''}`} style={song.style === 'blues' ? 'blues' : song.style} bpm={Math.min(song.tempo, song.style === 'ballad' ? 70 : 120)} minor={minor} blues={song.style === 'blues' || song.id.includes('blues') || song.id === 'blue-monk'} prompts={song.tasks[inst]} />
      </Card>
      <Card title={`Tu experiencia en ${INSTRUMENT_LABEL[inst].toLowerCase()}`}>
        <ol>{song.tasks[inst].map((x) => <li key={x}>{x}</li>)}</ol>
        <p className="muted small">El mismo tema genera tres experiencias: cambia de instrumento arriba para ver las tareas de {(['sax', 'guitar', 'piano'] as InstrumentId[]).filter((i) => i !== inst).map((i) => INSTRUMENT_LABEL[i].toLowerCase()).join(' y ')}.</p>
      </Card>
      <Card title="Recursos externos">
        <p className="small">{song.practiceWith}</p>
        <p className="small">Para escuchar grabaciones de referencia, busca «{song.externalSearch}» en tu plataforma de música o vídeo. La app no descarga ni extrae audio de vídeos.</p>
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

import { useEffect, useState } from 'react';
import { update, useAppState } from './progress/store';
import { INSTRUMENT_ICON, INSTRUMENT_LABEL, InstrumentId, SAX_TRANSPOSITION } from './theory/instruments';
import { Today } from './pages/Today';
import { LessonPage, RoutePage } from './pages/Route';
import { Lab } from './pages/Lab';
import { RecordingsPage, ResourcesPage, SongPage, SongsPage, TheoryPage } from './pages/Other';
import { ProgressPage } from './pages/Progress';
import { DiagnosticPage } from './pages/Diagnostic';
import { stopSequence } from './audio/engine';
import { VocabPage } from './pages/Vocab';
import { Home, ReviewPage } from './pages/Home';
import { NodePage, PathPage, SkipTestPage } from './pages/Path';
import { PlacementPage } from './pages/Placement';
import { StudioPage } from './pages/Studio';
import { SoundBadge } from './components/SoundSettings';

const NAV = [
  { path: 'hoy', label: 'Hoy', icon: '☀' },
  { path: 'camino', label: 'Camino', icon: '🧭' },
  { path: 'lab', label: 'Laboratorio', icon: '🎛' },
  { path: 'estudio', label: 'Estudio', icon: '🎧' },
  { path: 'canciones', label: 'Canciones', icon: '🎼' },
  { path: 'vocabulario', label: 'Vocabulario', icon: '🗂' },
  { path: 'teoria', label: 'Teoría', icon: '📘' },
  { path: 'grabaciones', label: 'Grabaciones', icon: '🎙' },
  { path: 'recursos', label: 'Recursos', icon: '🔗' },
  { path: 'progreso', label: 'Progreso', icon: '📈' },
];

function useHash() {
  const [h, setH] = useState(window.location.hash.slice(2) || 'hoy');
  useEffect(() => {
    const on = () => { setH(window.location.hash.slice(2) || 'hoy'); window.scrollTo(0, 0); stopSequence(); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return h;
}

export function App() {
  const s = useAppState();
  const route = useHash();
  const [seg, arg] = route.split('/');
  const setInst = (i: InstrumentId) => update((st) => { st.instrument = i; });
  let page;
  switch (seg) {
    case 'ruta': page = <RoutePage />; break;
    case 'leccion': page = <LessonPage id={arg} />; break;
    case 'lab': page = <Lab />; break;
    case 'teoria': page = <TheoryPage />; break;
    case 'canciones': page = <SongsPage />; break;
    case 'cancion': page = <SongPage id={arg} />; break;
    case 'recursos': page = <ResourcesPage />; break;
    case 'grabaciones': page = <RecordingsPage />; break;
    case 'progreso': page = <ProgressPage />; break;
    case 'diagnostico': page = <DiagnosticPage />; break;
    case 'vocabulario': page = <VocabPage />; break;
    case 'camino': page = <PathPage />; break;
    case 'nodo': page = <NodePage id={decodeURIComponent(arg)} />; break;
    case 'saltar': page = <SkipTestPage unitId={arg} />; break;
    case 'nivel': page = <PlacementPage />; break;
    case 'repaso': page = <ReviewPage />; break;
    case 'estudio': page = <StudioPage />; break;
    case 'sesion': page = <Today />; break;
    default: page = <Home />;
  }
  const navSeg = seg === 'leccion' || seg === 'ruta' ? 'teoria' : seg === 'cancion' ? 'canciones' : seg === 'diagnostico' ? 'progreso' : ['nodo', 'nivel', 'saltar'].includes(seg) ? 'camino' : seg === 'repaso' || seg === 'sesion' ? 'hoy' : seg || 'hoy';
  return (
    <div className="app">
      <header className="top">
        <a className="brand" href="#/hoy"><img src="./icon.svg" alt="" /> <span>Music Improvisation Lab</span></a>
        <div className="inst-switch" role="radiogroup" aria-label="Instrumento">
          {(['sax', 'guitar', 'piano'] as InstrumentId[]).map((i) => (
            <button key={i} role="radio" aria-checked={s.instrument === i} className={s.instrument === i ? 'on' : ''} onClick={() => setInst(i)}>
              <span className="ico">{INSTRUMENT_ICON[i]}</span><span className="lbl">{INSTRUMENT_LABEL[i]}</span>
            </button>
          ))}
        </div>
        <SoundBadge />
        {s.instrument === 'sax' && (
          <button className="sax-type" onClick={() => update((st) => { st.settings.saxType = st.settings.saxType === 'tenor' ? 'alto' : 'tenor'; })} title="Cambiar tipo de saxofón">
            {SAX_TRANSPOSITION[s.settings.saxType].label}
          </button>
        )}
      </header>
      <nav className="side">
        {NAV.map((n) => (
          <a key={n.path} href={`#/${n.path}`} className={navSeg === n.path ? 'on' : ''}><span className="ico">{n.icon}</span><span>{n.label}</span></a>
        ))}
      </nav>
      <main key={s.instrument + route} className={['nodo', 'saltar', 'repaso'].includes(seg) || (seg === 'nivel') ? 'focus' : ''}>{page}</main>
    </div>
  );
}

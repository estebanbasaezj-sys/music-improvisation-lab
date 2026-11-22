import { useEffect, useState } from 'react';
import { update, useAppState } from './progress/store';
import { INSTRUMENT_LABEL, InstrumentId, SAX_TRANSPOSITION } from './theory/instruments';
import { Icon, IconName, InstrumentArt } from './components/Art';
import { currentStreak, xpToday } from './progress/store';
import { Today } from './pages/Today';
import { LessonPage, RoutePage } from './pages/Route';
import { Lab } from './pages/Lab';
import { GreatsPage } from './pages/Greats';
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
import { MixButton, StopAllButton } from './components/Mixer';
import { StreakOverlay } from './components/StreakOverlay';
import { track } from './telemetry/telemetry';
import { RepertoirePage, TunePage } from './pages/Repertoire';
import { AdminPage } from './pages/Admin';
import { PlansPage } from './pages/Plans';
import { mainNav } from './product/profile';
import { ErrorBoundary, inAppBrowser } from './components/ErrorBoundary';

const NAV: { path: string; label: string; icon: IconName }[] = [
  { path: 'hoy', label: 'Hoy', icon: 'sun' },
  { path: 'camino', label: 'Camino', icon: 'route' },
  { path: 'repertorio', label: 'Repertorio', icon: 'books' },
  { path: 'lab', label: 'Laboratorio', icon: 'sliders' },
  { path: 'estudio', label: 'Sacar solos', icon: 'headphones' },
  { path: 'canciones', label: 'Canciones', icon: 'note' },
  { path: 'grandes', label: 'Los grandes', icon: 'crown' },
  { path: 'vocabulario', label: 'Vocabulario', icon: 'cards' },
  { path: 'teoria', label: 'Teoría', icon: 'theory' },
  { path: 'grabaciones', label: 'Grabaciones', icon: 'mic' },
  { path: 'recursos', label: 'Recursos', icon: 'link' },
  { path: 'progreso', label: 'Progreso', icon: 'chart' },
];

function useHash() {
  const [h, setH] = useState(window.location.hash.slice(2) || 'hoy');
  useEffect(() => {
    const on = () => { const h = window.location.hash.slice(2) || 'hoy'; setH(h); window.scrollTo(0, 0); stopSequence(); track('page', h.split('/')[0]); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return h;
}

export function App() {
  const s = useAppState();
  const route = useHash();
  const main = mainNav(s);
  const [moreOpen, setMoreOpen] = useState(false);
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
    case 'repertorio': page = <RepertoirePage />; break;
    case 'tema': page = <TunePage id={arg} />; break;
    case 'admin': page = <AdminPage />; break;
    case 'planes': page = <PlansPage />; break;
    case 'grandes': page = <GreatsPage />; break;
    default: page = <Home />;
  }
  const navSeg = seg === 'leccion' || seg === 'ruta' ? 'teoria' : seg === 'cancion' ? 'canciones' : seg === 'tema' ? 'repertorio' : seg === 'diagnostico' || seg === 'admin' || seg === 'planes' ? 'progreso' : ['nodo', 'nivel', 'saltar'].includes(seg) ? 'camino' : seg === 'repaso' || seg === 'sesion' ? 'hoy' : seg || 'hoy';
  return (
    <div className={`app ${s.settings.profile ? `age-${s.settings.profile}` : ''} ${main ? 'simple' : ''}`}>
      <header className="top">
        <a className="brand" href="#/hoy"><img src="./icon.svg" alt="" /> <span>Music Improvisation Lab</span></a>
        <div className="inst-switch" role="radiogroup" aria-label="Instrumento">
          {(['sax', 'guitar', 'piano'] as InstrumentId[]).map((i) => (
            <button key={i} role="radio" aria-checked={s.instrument === i} className={s.instrument === i ? 'on' : ''} onClick={() => setInst(i)}>
              <InstrumentArt inst={i} size={30} /><span className="lbl">{INSTRUMENT_LABEL[i]}</span>
            </button>
          ))}
        </div>
        <a className={`top-chip streak ${currentStreak(s) ? 'on' : ''}`} href="#/hoy" title="Días de racha"><Icon name="flame" size={18} stroke={2.2} /><b>{currentStreak(s)}</b></a>
        <a className="top-chip xp" href="#/hoy" title="XP de hoy / meta diaria"><Icon name="bolt" size={18} stroke={2.2} /><b>{xpToday(s)}</b><small>/{s.game.dailyGoal}</small></a>
        <MixButton />
        <SoundBadge />
        {s.instrument === 'sax' && (
          <button className="sax-type" onClick={() => update((st) => { st.settings.saxType = st.settings.saxType === 'tenor' ? 'alto' : 'tenor'; })} title="Cambiar tipo de saxofón">
            {SAX_TRANSPOSITION[s.settings.saxType].label}
          </button>
        )}
      </header>
      <nav className="side">
        {NAV.filter((n) => !main || main.includes(n.path) || moreOpen || navSeg === n.path).map((n) => (
          <a key={n.path} href={`#/${n.path}`} className={`${navSeg === n.path ? 'on' : ''} ${main && !main.includes(n.path) ? 'extra' : ''}`}><span className="ico"><Icon name={n.icon} size={22} /></span><span>{n.label}</span></a>
        ))}
        {main && <button className="nav-more" onClick={() => setMoreOpen(!moreOpen)} aria-expanded={moreOpen}><span className="ico">{moreOpen ? '▴' : '▾'}</span><span>{moreOpen ? 'Menos' : 'Más'}</span></button>}
      </nav>
      <StreakOverlay />
      <main key={s.instrument + route} className={['nodo', 'saltar', 'repaso'].includes(seg) || (seg === 'nivel') ? 'focus' : ''}>
        <InAppBanner />
        <ErrorBoundary where={seg || 'hoy'}>{page}</ErrorBoundary>
      </main>
      <StopAllButton />
    </div>
  );
}

function InAppBanner() {
  const app = inAppBrowser();
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem('mil-inapp') === '1'; } catch { return false; } });
  if (!app || hidden) return null;
  const close = () => { setHidden(true); try { sessionStorage.setItem('mil-inapp', '1'); } catch { /* nada */ } };
  return (
    <div className="inapp-banner" role="note">
      <span>Estás dentro de <b>{app}</b>: su navegador suele bloquear el sonido y el micrófono. Para que todo funcione, toca <b>⋯</b> y elige <b>Abrir en el navegador</b> (Safari o Chrome).</span>
      <button className="link small" onClick={close} aria-label="Cerrar aviso">Entendido</button>
    </div>
  );
}

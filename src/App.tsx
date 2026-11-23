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
import { stopAllAudio } from './audio/engine';
import { isMobile } from './audio/unlock';
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
import { ErrorBoundary, inAppBrowser } from './components/ErrorBoundary';
import { BandCallPage } from './pages/BandCall';
import { LevelPage } from './pages/Level';
import { parseHash } from './router';

interface NavItem { path: string; label: string; icon: IconName; hint: string }

/** Las cuatro secciones principales, siempre a la vista. */
const PRIMARY: NavItem[] = [
  { path: 'hoy', label: 'Hoy', icon: 'sun', hint: 'Qué practicar ahora' },
  { path: 'camino', label: 'Camino', icon: 'route', hint: 'Lecciones por niveles' },
  { path: 'repertorio', label: 'Repertorio', icon: 'books', hint: 'Temas para tocar' },
  { path: 'progreso', label: 'Progreso', icon: 'chart', hint: 'Tu avance y ajustes' },
];
/** El resto de herramientas, a un toque desde «Más». */
const MORE: NavItem[] = [
  { path: 'lab', label: 'Laboratorio', icon: 'sliders', hint: 'Taller, cadencias, escalas y acordes' },
  { path: 'estudio', label: 'Sacar solos', icon: 'headphones', hint: 'Separa el instrumento y transcribe' },
  { path: 'canciones', label: 'Canciones', icon: 'note', hint: 'Análisis armónico de standards' },
  { path: 'grandes', label: 'Los grandes', icon: 'crown', hint: 'Frases al estilo de los maestros' },
  { path: 'vocabulario', label: 'Vocabulario', icon: 'cards', hint: 'Tus frases en 12 tonalidades' },
  { path: 'teoria', label: 'Teoría', icon: 'theory', hint: 'Conceptos aplicados' },
  { path: 'grabaciones', label: 'Grabaciones', icon: 'mic', hint: 'Tus tomas guardadas' },
  { path: 'recursos', label: 'Recursos', icon: 'link', hint: 'Vídeos y sitios recomendados' },
  { path: 'ajustar', label: 'Ajustar mi nivel', icon: 'gauge', hint: 'Prueba de nivel y diagnóstico' },
];

function useRoute() {
  const [r, setR] = useState(() => parseHash());
  const [raw, setRaw] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => {
      const next = parseHash();
      // al salir de una pantalla se detiene todo lo que suena
      stopAllAudio();
      setR(next);
      setRaw(window.location.hash);
      window.scrollTo(0, 0);
      track('page', next.seg);
    };
    window.addEventListener('hashchange', on);
    // en el celular, si la app pasa a segundo plano también se detiene (al volver: «Retomar»)
    const vis = () => { if (document.hidden && isMobile()) stopAllAudio(); };
    document.addEventListener('visibilitychange', vis);
    return () => { window.removeEventListener('hashchange', on); document.removeEventListener('visibilitychange', vis); };
  }, []);
  return { ...r, raw };
}

/** A qué sección del menú pertenece cada ruta (para señalar la activa). */
function navSection(seg: string): string {
  if (seg === 'leccion' || seg === 'ruta') return 'teoria';
  if (seg === 'cancion') return 'canciones';
  if (seg === 'tema') return 'repertorio';
  if (seg === 'diagnostico' || seg === 'nivel') return 'ajustar';
  if (seg === 'admin' || seg === 'planes') return 'progreso';
  if (['nodo', 'saltar'].includes(seg)) return 'camino';
  if (seg === 'repaso' || seg === 'sesion' || seg === 'practica') return 'hoy';
  return seg || 'hoy';
}

export function App() {
  const s = useAppState();
  const { seg, arg, raw } = useRoute();
  const [moreOpen, setMoreOpen] = useState(false);
  const setInst = (i: InstrumentId) => update((st) => { st.instrument = i; });
  useEffect(() => { setMoreOpen(false); }, [raw]);
  useEffect(() => {
    if (!moreOpen) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoreOpen(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [moreOpen]);
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
    case 'ajustar': page = <LevelPage />; break;
    case 'repaso': page = <ReviewPage />; break;
    case 'estudio': page = <StudioPage />; break;
    case 'sesion': page = <Today />; break;
    case 'practica': page = <BandCallPage />; break;
    case 'repertorio': page = <RepertoirePage />; break;
    case 'tema': page = <TunePage id={arg} />; break;
    case 'admin': page = <AdminPage />; break;
    case 'planes': page = <PlansPage />; break;
    case 'grandes': page = <GreatsPage />; break;
    default: page = <Home />;
  }
  const active = navSection(seg);
  const activeMore = MORE.find((n) => n.path === active);
  const link = (n: NavItem, cls = '') => (
    <a key={n.path} href={`#/${n.path}`} className={`${cls} ${active === n.path ? 'on' : ''}`} aria-current={active === n.path ? 'page' : undefined}>
      <span className="ico"><Icon name={n.icon} size={22} /></span><span className="nl">{n.label}</span>
    </a>
  );
  return (
    <div className={`app ${s.settings.profile ? `age-${s.settings.profile}` : ''}`}>
      <header className="top">
        <a className="brand" href="#/hoy"><img src="./icon.svg" alt="" /> <span>Music Improvisation Lab</span></a>
        <div className="inst-switch" role="radiogroup" aria-label="Instrumento">
          {(['sax', 'guitar', 'piano'] as InstrumentId[]).map((i) => (
            <button key={i} role="radio" aria-checked={s.instrument === i} aria-label={INSTRUMENT_LABEL[i]} className={s.instrument === i ? 'on' : ''} onClick={() => setInst(i)}>
              <InstrumentArt inst={i} size={30} /><span className="lbl">{INSTRUMENT_LABEL[i]}</span>
            </button>
          ))}
        </div>
        <a className={`top-chip streak ${currentStreak(s) ? 'on' : ''}`} href="#/hoy" title="Días de racha" aria-label={`${currentStreak(s)} días de racha`}><Icon name="flame" size={18} stroke={2.2} /><b>{currentStreak(s)}</b></a>
        <a className="top-chip xp" href="#/hoy" title="XP de hoy / meta diaria" aria-label={`${xpToday(s)} de ${s.game.dailyGoal} XP hoy`}><Icon name="bolt" size={18} stroke={2.2} /><b>{xpToday(s)}</b><small>/{s.game.dailyGoal}</small></a>
        <MixButton />
        <SoundBadge />
        {s.instrument === 'sax' && (
          <button className="sax-type" onClick={() => update((st) => { st.settings.saxType = st.settings.saxType === 'tenor' ? 'alto' : 'tenor'; })} title="Cambiar tipo de saxofón">
            <span className="st-long">{SAX_TRANSPOSITION[s.settings.saxType].label}</span>
            <span className="st-short" aria-hidden="true">{s.settings.saxType === 'tenor' ? 'Tenor' : 'Alto'}</span>
          </button>
        )}
      </header>
      <nav className="side" aria-label="Secciones">
        <div className="nav-primary">
          {PRIMARY.map((n) => link(n, 'nav-main'))}
          <button className={`nav-more-btn ${activeMore ? 'on' : ''} ${moreOpen ? 'open' : ''}`} aria-expanded={moreOpen} aria-controls="more-sheet" onClick={() => setMoreOpen(!moreOpen)}>
            <span className="ico"><Icon name={activeMore ? activeMore.icon : 'grid'} size={22} /></span>
            <span className="nl">{activeMore ? activeMore.label : 'Más'}</span>
          </button>
        </div>
        <div className="nav-more-list">
          <span className="nav-group">Más herramientas</span>
          {MORE.map((n) => link(n, 'nav-sub'))}
        </div>
      </nav>
      {moreOpen && (
        <div className="more-sheet" id="more-sheet" role="dialog" aria-modal="true" aria-label="Más secciones" onClick={(e) => { if (e.target === e.currentTarget) setMoreOpen(false); }}>
          <div className="ms-panel">
            <div className="ms-head"><b>Todas las secciones</b><button className="btn sm" onClick={() => setMoreOpen(false)}>Cerrar</button></div>
            <div className="ms-grid">
              {[...MORE, ...PRIMARY].map((n) => (
                <a key={n.path} href={`#/${n.path}`} className={`ms-item ${active === n.path ? 'on' : ''}`} aria-current={active === n.path ? 'page' : undefined}>
                  <span className="ico"><Icon name={n.icon} size={24} /></span>
                  <span className="ms-txt"><b>{n.label}{active === n.path && <em> · estás aquí</em>}</b><small>{n.hint}</small></span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
      <StreakOverlay />
      <main key={s.instrument + raw} className={['nodo', 'saltar', 'repaso'].includes(seg) || seg === 'nivel' ? 'focus' : ''}>
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

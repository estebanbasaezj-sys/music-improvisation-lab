import './polyfills';
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { loadSamples } from './audio/engine';
import { installAudioUnlock } from './audio/unlock';
import { startTelemetry } from './telemetry/telemetry';
import { ErrorBoundary } from './components/ErrorBoundary';

startTelemetry();

// en celulares el audio solo arranca dentro de un toque: se escucha cada toque de la página
installAudioUnlock();

// descarga y decodifica las muestras en segundo plano (no necesita gesto del usuario)
void loadSamples();

/** Marca que la app se dibujó por primera vez: la pantalla de rescate de index.html ya no hace falta. */
function Booted() {
  useEffect(() => { (window as unknown as { __milBooted?: boolean }).__milBooted = true; }, []);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary where="app">
      <App />
      <Booted />
    </ErrorBoundary>
  </StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => undefined));
}

// Si una sección falla, muestra un aviso con el motivo y cómo seguir, en vez de dejar la página en blanco
// (lo que pasaba en algunos celulares). El resto de la app sigue funcionando.
import { Component, ReactNode } from 'react';
import { track } from '../telemetry/telemetry';

interface Props { children: ReactNode; where?: string }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error) {
    (window as unknown as { __milBooted?: boolean }).__milBooted = true; // este aviso reemplaza al de index.html
    track('error', 'pantalla', { msg: String(error?.message ?? error).slice(0, 200), where: this.props.where ?? '' });
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="card crash" role="alert">
        <h2>Esta sección no pudo abrirse en tu dispositivo</h2>
        <p>El resto de la app funciona. Prueba recargar o vuelve al inicio.</p>
        <div className="row gap">
          <button className="btn primary" onClick={() => window.location.reload()}>Recargar</button>
          <a className="btn" href="#/hoy" onClick={() => this.setState({ error: null })}>Ir al inicio</a>
        </div>
        <details>
          <summary className="small muted">Detalle técnico (para enviarlo si el problema sigue)</summary>
          <code className="small">{String(error?.message ?? error)}</code>
          <p className="small muted">{navigator.userAgent}</p>
        </details>
      </div>
    );
  }
}

/** Instagram, Facebook, TikTok, etc. abren los enlaces en su propio navegador, que suele bloquear el sonido
 *  y el micrófono. Se avisa cómo abrirlo en Safari o Chrome. */
export function inAppBrowser(): string | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return 'Facebook';
  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/musical_ly|TikTok|BytedanceWebview/i.test(ua)) return 'TikTok';
  if (/Snapchat/i.test(ua)) return 'Snapchat';
  if (/\bLine\//i.test(ua)) return 'LINE';
  if (/LinkedInApp/i.test(ua)) return 'LinkedIn';
  if (/Twitter/i.test(ua)) return 'X';
  return null;
}

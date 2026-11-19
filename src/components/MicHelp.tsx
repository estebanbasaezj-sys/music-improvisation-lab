import { isEmbedded } from '../recording/pitch';
import { Card } from './common';
import { DownloadApp } from './DownloadApp';

/** Explica por qué el micrófono en vivo no funciona dentro de claude.ai y qué hacer. */
export function MicHelp({ compact, onlyWhenEmbedded }: { compact?: boolean; onlyWhenEmbedded?: boolean }) {
  const embedded = isEmbedded();
  if (!embedded && onlyWhenEmbedded) return null;
  return (
    <Card title="🎤 Micrófono" className={embedded ? 'accent' : ''}>
      {embedded ? (
        <>
          <p><b>Dentro de claude.ai el navegador no permite que esta página use el micrófono en vivo.</b> No es un problema de tu equipo.</p>
          <p className="small">Mientras tanto, cada ejercicio de tocar tiene <b>📤 Subir grabación</b>: grábate con la grabadora del teléfono o del computador y la app analiza las notas aquí mismo (mismo método que en vivo).</p>
          {!compact && (
            <>
              <p className="small"><b>Para tener micrófono en vivo</b>, abre la app en su propia dirección (gratis, unos 5 minutos):</p>
              <ol className="small">
                <li>Descarga la app con este botón (o el archivo <code>music-improvisation-lab.zip</code> que te envió Claude en el chat) y descomprímela:<DownloadApp /></li>
                <li>Entra en <b>app.netlify.com/drop</b> (crea una cuenta gratuita) y arrastra la carpeta descomprimida.</li>
                <li>Abre la dirección que te da (https://….netlify.app). Ahí el micrófono, la grabación y la instalación como app funcionan. En el teléfono: menú del navegador → «Añadir a pantalla de inicio».</li>
                <li>Para llevar tu progreso: aquí en Progreso → «Exportar progreso», y allí «Importar…».</li>
              </ol>
              <p className="muted small">Fuera de claude.ai todo funciona igual excepto el «Profesor IA», que necesita estar dentro de Claude.</p>
            </>
          )}
        </>
      ) : (
        <p className="small">Micrófono disponible. Si el navegador lo bloquea, actívalo en el candado de la barra de direcciones. Usa auriculares cuando suene el acompañamiento.</p>
      )}
    </Card>
  );
}

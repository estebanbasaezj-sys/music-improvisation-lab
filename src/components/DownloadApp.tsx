// Empaqueta la propia app (archivos publicados) en un .zip para alojarla en otra dirección,
// usando la capacidad `downloads` de claude.ai (la página no puede descargar archivos por sí sola).
import { useEffect, useState } from 'react';
import { zip } from 'fflate';

type Downloads = { save: (r: { filename: string; data: Blob }) => Promise<{ status: string }> };

const README = `MUSIC IMPROVISATION LAB — cómo tenerla en tu propia dirección (con micrófono en vivo)

1. Descomprime este archivo: obtendrás la carpeta "music-improvisation-lab".
2. Entra en https://app.netlify.com/drop (cuenta gratuita) y arrastra esa carpeta.
3. Abre la dirección https://….netlify.app que te dan: ahí funcionan el micrófono en vivo,
   la grabación y la instalación como app ("Añadir a pantalla de inicio").
4. Progreso: en la versión de claude.ai, Progreso → "Exportar progreso"; en la nueva, "Importar…".
El "Profesor IA" solo funciona dentro de Claude.
`;

export function DownloadApp() {
  const [dl, setDl] = useState<Downloads | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const w = window as unknown as { claude?: { use: (n: string) => Promise<unknown> } };
    w.claude?.use?.('downloads').then((d) => setDl(d as Downloads | null)).catch(() => setDl(null));
  }, []);
  if (!dl) return null;
  const run = async () => {
    setBusy(true); setMsg('Preparando el paquete…');
    try {
      const list: string[] = await (await fetch('./app-files.json')).json();
      const files: Record<string, Uint8Array> = {};
      let n = 0;
      for (const f of ['app-index.html', ...list]) {
        const data = new Uint8Array(await (await fetch(`./${f}`)).arrayBuffer());
        files[`music-improvisation-lab/${f === 'app-index.html' ? 'index.html' : f}`] = data;
        n++;
        setMsg(`Preparando el paquete… ${n}/${list.length + 1}`);
      }
      files['music-improvisation-lab/LEEME.txt'] = new TextEncoder().encode(README);
      const out = await new Promise<Uint8Array>((res, rej) => zip(files, { level: 0 }, (e, d) => (e ? rej(e) : res(d))));
      await dl.save({ filename: 'music-improvisation-lab.zip', data: new Blob([out], { type: 'application/zip' }) });
      setMsg('✔ Descargado. Sigue las instrucciones de LEEME.txt.');
    } catch (e) {
      const code = (e as { code?: string })?.code;
      setMsg(code === 'declined' ? 'Descarga cancelada.' : 'No se pudo preparar la descarga en esta vista.');
    }
    setBusy(false);
  };
  return (
    <div className="row gap wrap">
      <button className="btn primary" disabled={busy} onClick={run}>⬇ Descargar la app (.zip, ~6,5 MB)</button>
      {msg && <span className="small">{msg}</span>}
    </div>
  );
}

// Onda con zoom: vista principal (arrastra para elegir el loop, clic para ir a un punto, rueda+Ctrl o los
// botones para acercar) y una vista general debajo para moverte por todo el audio. Muestra en color la pista
// del instrumento elegido sobre la mezcla, las marcas, el cifrado detectado y el cursor de reproducción.
import { useEffect, useMemo, useRef } from 'react';

export interface WaveProps {
  mix: AudioBuffer;
  focus?: AudioBuffer | null; // pista del instrumento (mismo origen de tiempo que la ventana t0)
  t0: number; // inicio de la ventana completa (segundos del original)
  span: number; // duración de la ventana completa
  view: [number, number]; // tramo visible (segundos del original)
  pos: number;
  sel: [number, number] | null;
  markers: { t: number; label: string }[];
  bars: { t: number; label: string }[];
  onView: (v: [number, number]) => void;
  onSeek: (t: number) => void;
  onSelect: (s: [number, number] | null) => void;
}

const RES = 200; // picos por segundo

function peaksOf(buf: AudioBuffer, offsetSec = 0) {
  const sr = buf.sampleRate;
  const n = Math.ceil(buf.duration * RES);
  const out = new Float32Array(n);
  const step = sr / RES;
  const chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
  for (let i = 0; i < n; i++) {
    let m = 0;
    const a = Math.floor(i * step), b = Math.min(buf.length, Math.floor((i + 1) * step));
    for (const d of chans) for (let k = a; k < b; k += 3) { const v = Math.abs(d[k]); if (v > m) m = v; }
    out[i] = m;
  }
  return { data: out, offset: offsetSec };
}

const css = (name: string, fb: string) => (typeof window !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb : fb);

export function Waveform({ mix, focus, t0, span, view, pos, sel, markers, bars, onView, onSeek, onSelect }: WaveProps) {
  const main = useRef<HTMLCanvasElement>(null);
  const over = useRef<HTMLCanvasElement>(null);
  const drag = useRef<number | null>(null);
  const odrag = useRef<number | null>(null);
  const pm = useMemo(() => peaksOf(mix, 0), [mix]);
  const pf = useMemo(() => (focus ? peaksOf(focus, t0) : null), [focus, t0]);
  // ajustar la escala vertical al pico de la ventana completa
  const norm = useMemo(() => {
    let m = 0.05;
    const a = Math.floor(t0 * RES), b = Math.min(pm.data.length, Math.ceil((t0 + span) * RES));
    for (let i = a; i < b; i++) m = Math.max(m, pm.data[i]);
    return 1 / m;
  }, [pm, t0, span]);

  useEffect(() => {
    const draw = (c: HTMLCanvasElement | null, v0: number, v1: number, h: number, detail: boolean) => {
      if (!c) return;
      const w = (c.width = Math.max(300, c.clientWidth * 2));
      c.height = h;
      const g = c.getContext('2d')!;
      g.clearRect(0, 0, w, h);
      const X = (t: number) => ((t - v0) / (v1 - v0)) * w;
      if (sel) { g.fillStyle = 'rgba(242,181,68,.28)'; g.fillRect(X(sel[0]), 0, X(sel[1]) - X(sel[0]), h); }
      const mid = h / 2 + (detail ? 10 : 0);
      const amp = (detail ? h * 0.4 : h * 0.45) * norm;
      const col = (p: { data: Float32Array; offset: number }, color: string) => {
        g.fillStyle = color;
        for (let x = 0; x < w; x++) {
          const ta = v0 + (x / w) * (v1 - v0) - p.offset, tb = v0 + ((x + 1) / w) * (v1 - v0) - p.offset;
          let m = 0;
          for (let i = Math.max(0, Math.floor(ta * RES)); i <= Math.min(p.data.length - 1, Math.floor(tb * RES)); i++) m = Math.max(m, p.data[i]);
          const y = Math.min(h / 2, m * amp);
          g.fillRect(x, mid - y, 1, Math.max(1, y * 2));
        }
      };
      col(pm, pf ? 'rgba(140,140,150,.45)' : css('--accent2', '#5ec2b7'));
      if (pf) col(pf, css('--accent', '#f2b544'));
      if (detail) {
        g.font = '20px system-ui'; g.fillStyle = '#8a8f9c';
        const visible = bars.filter((b) => b.t >= v0 && b.t <= v1);
        visible.forEach((b, i) => { const x = X(b.t); g.fillRect(x, 0, 1, h); if (visible.length < 60 || i % 2 === 0) g.fillText(b.label, x + 4, 22); });
        markers.forEach((m) => { const x = X(m.t); g.fillStyle = '#6aa7ff'; g.fillRect(x, 0, 2, h); g.fillText(`⚑ ${m.label}`, x + 4, h - 10); });
      } else {
        g.strokeStyle = css('--blue', '#6aa7ff'); g.lineWidth = 3;
        g.strokeRect(X(view[0]), 2, Math.max(4, X(view[1]) - X(view[0])), h - 4);
      }
      g.fillStyle = '#ff4b4b';
      g.fillRect(X(pos) - 1, 0, 3, h);
    };
    draw(main.current, view[0], view[1], 240, true);
    draw(over.current, t0, t0 + span, 60, false);
  }, [pm, pf, pos, sel, markers, bars, view, t0, span, norm]);

  const tAt = (e: React.PointerEvent | React.WheelEvent, c: HTMLCanvasElement, v0: number, v1: number) => {
    const r = c.getBoundingClientRect();
    return Math.max(t0, Math.min(t0 + span, v0 + ((e.clientX - r.left) / r.width) * (v1 - v0)));
  };
  const zoomAt = (center: number, factor: number) => {
    const w = Math.max(0.5, Math.min(span, (view[1] - view[0]) * factor));
    let a = center - (center - view[0]) * (w / (view[1] - view[0]));
    a = Math.max(t0, Math.min(t0 + span - w, a));
    onView([a, a + w]);
  };
  return (
    <div className="wave-wrap">
      <canvas ref={main} className="wave big"
        onPointerDown={(e) => { drag.current = tAt(e, main.current!, view[0], view[1]); (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (drag.current !== null) { const t = tAt(e, main.current!, view[0], view[1]); if (Math.abs(t - drag.current) > (view[1] - view[0]) / 200) onSelect([Math.min(t, drag.current), Math.max(t, drag.current)]); } }}
        onPointerUp={(e) => { const t = tAt(e, main.current!, view[0], view[1]); if (drag.current !== null && Math.abs(t - drag.current) <= (view[1] - view[0]) / 200) onSeek(t); drag.current = null; }}
        onWheel={(e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomAt(tAt(e, main.current!, view[0], view[1]), e.deltaY > 0 ? 1.25 : 0.8); } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { const d = ((view[1] - view[0]) * e.deltaX) / 800; const a = Math.max(t0, Math.min(t0 + span - (view[1] - view[0]), view[0] + d)); onView([a, a + (view[1] - view[0])]); } }} />
      <canvas ref={over} className="wave overview"
        onPointerDown={(e) => { odrag.current = 1; (e.target as HTMLElement).setPointerCapture(e.pointerId); const t = tAt(e, over.current!, t0, t0 + span); const w = view[1] - view[0]; const a = Math.max(t0, Math.min(t0 + span - w, t - w / 2)); onView([a, a + w]); }}
        onPointerMove={(e) => { if (!odrag.current) return; const t = tAt(e, over.current!, t0, t0 + span); const w = view[1] - view[0]; const a = Math.max(t0, Math.min(t0 + span - w, t - w / 2)); onView([a, a + w]); }}
        onPointerUp={() => { odrag.current = null; }} />
      <div className="row gap wrap wave-zoom">
        <button className="btn sm" onClick={() => zoomAt(sel ? (sel[0] + sel[1]) / 2 : pos, 0.5)} title="Acercar">＋ Zoom</button>
        <button className="btn sm" onClick={() => zoomAt(sel ? (sel[0] + sel[1]) / 2 : pos, 2)} title="Alejar">－ Zoom</button>
        {sel && <button className="btn sm" onClick={() => { const pad = (sel[1] - sel[0]) * 0.1; onView([Math.max(t0, sel[0] - pad), Math.min(t0 + span, sel[1] + pad)]); }}>⤢ Ver el loop</button>}
        <button className="btn sm" onClick={() => onView([t0, t0 + span])}>Ver todo</button>
        <span className="muted small">Arrastra sobre la onda para marcar el loop · clic para ir a un punto · Ctrl + rueda para zoom · abajo, la vista general.</span>
      </div>
    </div>
  );
}

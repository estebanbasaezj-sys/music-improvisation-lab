// Vista multipista: una franja por instrumento separado, cada una con su propia onda (en la misma ventana
// de tiempo que el editor), volumen, silencio, solo, medidor de nivel en vivo, descarga WAV y la opción de
// elegirla como la pista a estudiar (la que se transcribe y se resalta en la onda principal).
import { useEffect, useMemo, useRef } from 'react';

export type TrackState = { vol: number; mute: boolean; solo: boolean };
export interface LaneInfo { id: string; label: string; icon: string; color: string; buf: AudioBuffer }

export const LANE_STYLE: Record<string, { icon: string; color: string }> = {
  vocals: { icon: '🎤', color: '#b58cff' }, drums: { icon: '🥁', color: '#ff8a4c' }, bass: { icon: '🎻', color: '#6aa7ff' },
  other: { icon: '🎹', color: '#3fb5a8' }, lead: { icon: '✨', color: '#e8a200' }, center: { icon: '◉', color: '#3fb5a8' },
  sides: { icon: '◐', color: '#6aa7ff' }, orig: { icon: '🎵', color: '#3fb5a8' },
};

const RES = 150;
function peaks(buf: AudioBuffer) {
  const n = Math.ceil(buf.duration * RES), out = new Float32Array(n), step = buf.sampleRate / RES;
  const chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
  let max = 1e-4;
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (const d of chans) for (let k = Math.floor(i * step); k < Math.min(d.length, Math.floor((i + 1) * step)); k += 4) { const v = Math.abs(d[k]); if (v > m) m = v; }
    out[i] = m; if (m > max) max = m;
  }
  return { data: out, max };
}

function Lane({ lane, t0, view, pos, sel, effective, focus, mixMax, onSeek, onSelect }: {
  lane: LaneInfo; t0: number; view: [number, number]; pos: number; sel: [number, number] | null; effective: number; focus: boolean; mixMax: number;
  onSeek: (t: number) => void; onSelect: (s: [number, number] | null) => void;
}) {
  const cv = useRef<HTMLCanvasElement>(null);
  const drag = useRef<number | null>(null);
  const pk = useMemo(() => peaks(lane.buf), [lane.buf]);
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const w = (c.width = Math.max(200, c.clientWidth * 2));
    const h = (c.height = 96);
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, w, h);
    const X = (t: number) => ((t - view[0]) / (view[1] - view[0])) * w;
    if (sel) { g.fillStyle = 'rgba(242,181,68,.22)'; g.fillRect(X(sel[0]), 0, X(sel[1]) - X(sel[0]), h); }
    // escala común a todas las pistas (se ve cuál suena más) y el volumen aplicado
    const amp = (h * 0.48) / mixMax * Math.max(0.15, Math.min(1.5, effective || 0.15));
    g.fillStyle = lane.color;
    g.globalAlpha = effective > 0 ? 1 : 0.25;
    for (let x = 0; x < w; x++) {
      const ta = view[0] + (x / w) * (view[1] - view[0]) - t0, tb = view[0] + ((x + 1) / w) * (view[1] - view[0]) - t0;
      let m = 0;
      for (let i = Math.max(0, Math.floor(ta * RES)); i <= Math.min(pk.data.length - 1, Math.floor(tb * RES)); i++) if (pk.data[i] > m) m = pk.data[i];
      const y = Math.min(h / 2, m * amp);
      g.fillRect(x, h / 2 - y, 1, Math.max(1, y * 2));
    }
    g.globalAlpha = 1;
    g.fillStyle = '#ff4b4b';
    g.fillRect(X(pos) - 1, 0, 3, h);
  }, [pk, view, pos, sel, effective, mixMax, lane.color, t0]);
  const tAt = (e: React.PointerEvent) => { const r = cv.current!.getBoundingClientRect(); return view[0] + ((e.clientX - r.left) / r.width) * (view[1] - view[0]); };
  return (
    <canvas ref={cv} className={`lane-wave ${focus ? 'focus' : ''}`}
      onPointerDown={(e) => { drag.current = tAt(e); (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => { if (drag.current !== null) { const t = tAt(e); if (Math.abs(t - drag.current) > (view[1] - view[0]) / 150) onSelect([Math.min(t, drag.current), Math.max(t, drag.current)]); } }}
      onPointerUp={(e) => { const t = tAt(e); if (drag.current !== null && Math.abs(t - drag.current) <= (view[1] - view[0]) / 150) onSeek(t); drag.current = null; }} />
  );
}

export function TrackLanes({ lanes, t0, view, pos, sel, mix, focus, playing, analysers, onMix, onFocus, onSeek, onSelect, onDownload, effective }: {
  lanes: LaneInfo[]; t0: number; view: [number, number]; pos: number; sel: [number, number] | null;
  mix: Record<string, TrackState>; focus: string; playing: boolean; analysers: () => Record<string, AnalyserNode>;
  onMix: (id: string, s: TrackState) => void; onFocus: (id: string) => void; onSeek: (t: number) => void; onSelect: (s: [number, number] | null) => void;
  onDownload: (id: string) => void; effective: (id: string) => number;
}) {
  const meters = useRef<Record<string, HTMLSpanElement | null>>({});
  const mixMax = useMemo(() => Math.max(1e-3, ...lanes.map((l) => peaks(l.buf).max)), [lanes]);
  // medidores de nivel en vivo
  useEffect(() => {
    if (!playing) { Object.values(meters.current).forEach((m) => { if (m) m.style.width = '0%'; }); return; }
    let raf = 0;
    const buf = new Float32Array(256);
    const loop = () => {
      const an = analysers();
      for (const l of lanes) {
        const a = an[l.id], el = meters.current[l.id];
        if (!a || !el) continue;
        a.getFloatTimeDomainData(buf);
        let p = 0;
        for (let i = 0; i < buf.length; i++) p = Math.max(p, Math.abs(buf[i]));
        const db = 20 * Math.log10(p + 1e-6);
        el.style.width = `${Math.max(0, Math.min(100, ((db + 48) / 48) * 100))}%`;
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [playing, lanes, analysers]);
  return (
    <div className="lanes">
      {lanes.map((l) => {
        const s = mix[l.id] ?? { vol: 1, mute: false, solo: false };
        const eff = effective(l.id);
        return (
          <div key={l.id} className={`lane ${l.id === focus ? 'focus' : ''} ${eff === 0 ? 'silent' : ''}`} style={{ ['--lc' as string]: l.color }}>
            <div className="lane-head">
              <div className="lane-title">
                <span className="lane-ico" aria-hidden="true">{l.icon}</span>
                <b>{l.label}</b>
                {l.id === focus ? <span className="lane-badge">★ estudiando</span> : <button className="link small" onClick={() => onFocus(l.id)} title="Transcribir y resaltar esta pista">estudiar esta</button>}
              </div>
              <div className="lane-ctl">
                <button className={`ms ${s.mute ? 'on-m' : ''}`} onClick={() => onMix(l.id, { ...s, mute: !s.mute })} title="Silenciar (mute)">M</button>
                <button className={`ms ${s.solo ? 'on-s' : ''}`} onClick={() => onMix(l.id, { ...s, solo: !s.solo })} title="Escuchar solo esta pista">S</button>
                <input type="range" min={0} max={1.5} step={0.01} value={s.vol} onChange={(e) => onMix(l.id, { ...s, vol: +e.target.value })} onDoubleClick={() => onMix(l.id, { ...s, vol: 1 })} aria-label={`Volumen de ${l.label}`} title="Doble clic: volver a 100 %" />
                <span className="lane-vol">{Math.round(s.vol * 100)} %</span>
                <button className="ms dl" onClick={() => onDownload(l.id)} title="Descargar esta pista (WAV)">⬇</button>
              </div>
              <span className="lane-meter" aria-hidden="true"><span ref={(el) => { meters.current[l.id] = el; }} /></span>
            </div>
            <Lane lane={l} t0={t0} view={view} pos={pos} sel={sel} effective={eff} focus={l.id === focus} mixMax={mixMax} onSeek={onSeek} onSelect={onSelect} />
          </div>
        );
      })}
    </div>
  );
}

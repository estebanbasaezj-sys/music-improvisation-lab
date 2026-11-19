// Estudio de transcripción: carga un audio (archivo, URL directa o una grabación tuya), ralentízalo,
// cambia el tono, repite un fragmento A-B y obtén tonalidad, tempo, acordes en cifrado americano y la
// melodía en partitura (en la notación de tu instrumento). Luego practica improvisando sobre esa armonía.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Analysis, TNote, analyzeAudio, decodeAudio, removeHarmonics, secToBeat, skyline, stretchBuffer, transcribeNotes } from '../audio/studio';
import { PC_NAMES } from '../audio/analysis';
import { Tone, ensureAudio, playSequence, stopSequence, registerActivity, endActivity } from '../audio/engine';
import { TimeStaff } from '../instruments/TimeStaff';
import { parseChart, ChordEvent } from '../theory/progressions';
import { parseChord, chordSymbol } from '../theory/chords';
import { pitchFromMidi, noteName } from '../theory/notes';
import { analyzeLine } from '../theory/line';
import { getAllRecordings, Recording } from '../recording/db';
import { addVocab, useAppState } from '../progress/store';
import { Card, StatusBadge, useTransposer, voiceFor } from '../components/common';
import { Workshop } from '../components/Workshop';

const symOf = (c: { root: number; quality: string }) => `${PC_NAMES[c.root]}${c.quality === 'maj' ? '' : c.quality}`;

export function StudioPage() {
  const t = useTransposer();
  const app = useAppState();
  const [name, setName] = useState('');
  const [orig, setOrig] = useState<AudioBuffer | null>(null);
  const [proc, setProc] = useState<AudioBuffer | null>(null);
  const [speed, setSpeed] = useState(1);
  const [semi, setSemi] = useState(0);
  const [busy, setBusy] = useState<{ label: string; p: number } | null>(null);
  const [err, setErr] = useState('');
  const [url, setUrl] = useState('');
  const [recs, setRecs] = useState<Recording[]>([]);
  const [sel, setSel] = useState<[number, number] | null>(null); // segundos del original
  const [loop, setLoop] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0); // segundos del original
  const [an, setAn] = useState<Analysis | null>(null);
  const [chordEdits, setChordEdits] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<TNote[] | null>(null);
  const [allNotes, setAllNotes] = useState(false);
  const [quant, setQuant] = useState(0.5);
  const [showWorkshop, setShowWorkshop] = useState(false);
  const src = useRef<AudioBufferSourceNode | null>(null);
  const startInfo = useRef<{ ctxT: number; origPos: number } | null>(null);
  const raf = useRef(0);
  useEffect(() => { getAllRecordings().then(setRecs).catch(() => undefined); return () => stop(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // re-procesar velocidad/tono
  useEffect(() => {
    if (!orig) return;
    let cancel = false;
    const id = setTimeout(async () => {
      stop();
      if (speed === 1 && semi === 0) { setProc(orig); return; }
      setBusy({ label: 'Ajustando velocidad y tono', p: 0 });
      const b = await stretchBuffer(orig, speed, semi, (p) => !cancel && setBusy({ label: 'Ajustando velocidad y tono', p }));
      if (!cancel) { setProc(b); setBusy(null); }
    }, 350);
    return () => { cancel = true; clearTimeout(id); };
  }, [orig, speed, semi]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = async (data: ArrayBuffer, n: string) => {
    setErr(''); stop(); setAn(null); setNotes(null); setSel(null); setChordEdits({}); setShowWorkshop(false);
    try {
      await ensureAudio();
      setBusy({ label: 'Decodificando audio', p: 0.5 });
      const b = await decodeAudio(data);
      if (b.duration > 600) throw new Error('El audio dura más de 10 minutos: recórtalo antes.');
      setOrig(b); setProc(b); setName(n); setPos(0);
    } catch (e) { setErr(`No se pudo leer el audio: ${(e as Error).message || 'formato no soportado'}.`); }
    setBusy(null);
  };
  const loadUrl = async () => {
    setErr('');
    if (/youtube\.com|youtu\.be|spotify\.com|apple\.com\/.*music|deezer|tidal/.test(url)) { setErr('Las plataformas de streaming (YouTube, Spotify…) no permiten extraer su audio. Usa un archivo propio o un enlace directo a un .mp3/.wav con permiso de uso.'); return; }
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(String(r.status));
      await load(await r.arrayBuffer(), url.split('/').pop() || 'audio');
    } catch { setErr('No se pudo descargar ese enlace: el servidor no lo permite desde otras páginas (CORS) o la red está bloqueada en esta vista. Descarga el archivo y cárgalo desde tu dispositivo.'); }
  };

  // ------------------------------------------------ reproducción
  const stop = () => {
    cancelAnimationFrame(raf.current);
    try { src.current?.stop(); } catch { /* ya parado */ }
    src.current = null;
    startInfo.current = null;
    setPlaying(false);
    endActivity('studio');
  };
  const stopRef = useRef(stop);
  stopRef.current = stop;
  const studioStopper = useRef(() => stopRef.current()).current;
  const play = async (fromOrig = pos) => {
    if (!proc) return;
    await ensureAudio();
    stop();
    const ctx = Tone.getContext().rawContext as AudioContext;
    const s = ctx.createBufferSource();
    s.buffer = proc;
    s.connect(ctx.destination);
    const a = sel && loop ? sel[0] / speed : 0;
    const b = sel && loop ? sel[1] / speed : proc.duration;
    let off = fromOrig / speed;
    if (sel && loop && (off < a || off >= b)) off = a;
    if (sel && loop) { s.loop = true; s.loopStart = a; s.loopEnd = b; }
    s.start(ctx.currentTime + 0.05, off);
    s.onended = () => { if (src.current === s) { setPlaying(false); endActivity('studio'); } };
    src.current = s;
    registerActivity('studio', studioStopper, `Estudio: audio cargado${speed !== 1 ? ` a ${Math.round(speed * 100)} %` : ''}`);
    startInfo.current = { ctxT: ctx.currentTime + 0.05, origPos: off * speed };
    setPlaying(true);
    const tick = () => {
      if (!startInfo.current) return;
      let el = (ctx.currentTime - startInfo.current.ctxT) * speed + startInfo.current.origPos;
      if (sel && loop && el >= sel[1]) el = sel[0] + ((el - sel[0]) % (sel[1] - sel[0]));
      setPos(Math.max(0, Math.min(orig?.duration ?? 0, el)));
      raf.current = requestAnimationFrame(tick);
    };
    tick();
  };

  // ------------------------------------------------ análisis
  const analyze = async () => {
    if (!orig) return;
    setBusy({ label: 'Analizando', p: 0 });
    try { setAn(await analyzeAudio(orig, (p, label) => setBusy({ label, p }))); } catch (e) { setErr(`Error de análisis: ${(e as Error).message}`); }
    setBusy(null);
  };
  const transcribe = async () => {
    if (!orig) return;
    const [a, b] = sel ?? [0, Math.min(orig.duration, 40)];
    setBusy({ label: 'Transcribiendo notas (modelo Basic Pitch, en tu dispositivo)', p: 0 });
    try { setNotes(await transcribeNotes(orig, a, b, (p) => setBusy({ label: 'Transcribiendo notas (modelo Basic Pitch, en tu dispositivo)', p }))); }
    catch (e) { setErr(`No se pudo transcribir: ${(e as Error).message}. Prueba con un fragmento más corto.`); }
    setBusy(null);
  };

  // acordes por compás
  const bars = useMemo(() => {
    if (!an) return [] as { idx: number; start: number; halves: string[] }[];
    const out: { idx: number; start: number; halves: string[] }[] = [];
    for (let k = 0; k < an.chords.length; k += 2) {
      const h = [an.chords[k], an.chords[k + 1]].filter(Boolean).map((c, j) => chordEdits[k + j] ?? symOf(c));
      out.push({ idx: k / 2, start: an.chords[k].start, halves: h });
    }
    return out;
  }, [an, chordEdits]);
  const selBars = useMemo(() => {
    if (!an || !bars.length) return [0, 0];
    if (!sel) return [0, Math.min(bars.length, 16)];
    const f = bars.findIndex((_, i) => (bars[i + 1]?.start ?? Infinity) > sel[0]);
    const l = bars.findIndex((b) => b.start >= sel[1]);
    return [Math.max(0, f), Math.max(f + 1, l < 0 ? bars.length : l)];
  }, [an, bars, sel]);
  const chart = bars.slice(selBars[0], selBars[1]).map((b) => (b.halves[0] === b.halves[1] || b.halves.length === 1 ? b.halves[0] : b.halves.join(' '))).join(' | ') + ' |';
  const events: ChordEvent[] = useMemo(() => { try { return bars.length ? parseChart(chart) : []; } catch { return []; } }, [chart, bars.length]);
  // melodía cuantizada en tiempos, relativa al primer compás seleccionado
  const melody = useMemo(() => {
    if (!notes || !an) return [];
    const base = (an.downbeatOffset + selBars[0] * 4);
    const src = allNotes ? removeHarmonics(notes) : skyline(notes);
    const ns = src.map((n) => {
      const b0 = secToBeat(n.start, an.beats) - base;
      const b1 = secToBeat(n.start + n.dur, an.beats) - base;
      const s = Math.round(b0 / quant) * quant;
      return { midi: n.midi, start: s, dur: Math.max(quant, Math.round((b1 - b0) / quant) * quant) };
    }).filter((n) => n.start >= 0 && n.start < (selBars[1] - selBars[0]) * 4);
    const clean: typeof ns = [];
    for (const n of ns.sort((x, y) => x.start - y.start || y.midi - x.midi)) {
      const last = clean[clean.length - 1];
      if (last && Math.abs(last.start - n.start) < 1e-6) continue;
      if (last && last.start + last.dur > n.start) last.dur = n.start - last.start;
      clean.push(n);
    }
    return clean;
  }, [notes, an, selBars, quant, allNotes]);
  const keyRoot = an ? pitchFromMidi(60 + an.key.tonic) : pitchFromMidi(60);
  const annotated = useMemo(() => (events.length && melody.length ? analyzeLine(melody, events, { keyRoot, names: { note: t.noteName, chord: t.chordName } }) : []), [events, melody]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = events.reduce((a, e) => a + e.beats, 0);

  const editChord = (k: number) => {
    const cur = chordEdits[k] ?? (an ? symOf(an.chords[k]) : '');
    const v = prompt('Corrige el acorde (cifrado americano, p. ej. Dm7, G7, Cmaj7, Bb7, F#m7b5):', cur);
    if (!v) return;
    try { parseChord(v.trim()); setChordEdits({ ...chordEdits, [k]: chordSymbol(parseChord(v.trim())) }); } catch { alert('No reconozco ese acorde.'); }
  };

  return (
    <div className="page studio">
      <h1>Estudio: escuchar y transcribir</h1>
      <p className="lead">Carga una grabación, ralentízala sin cambiar el tono, repite un fragmento y obtén la armonía en cifrado americano y la melodía en partitura de tu instrumento.</p>
      <Card title="1 · Cargar audio">
        <div className="row gap wrap">
          <label className="btn primary">📂 Elegir archivo<input type="file" accept="audio/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) await load(await f.arrayBuffer(), f.name); }} /></label>
          {recs.length > 0 && (
            <select defaultValue="" onChange={async (e) => { const r = recs.find((x) => x.id === e.target.value); if (r) await load(await r.blob.arrayBuffer(), r.title); }}>
              <option value="" disabled>🎙 Una de mis grabaciones…</option>
              {recs.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
          )}
        </div>
        <div className="row gap wrap" style={{ marginTop: '.5rem' }}>
          <input className="wide" placeholder="O pega un enlace directo a un .mp3 / .wav / .ogg" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button className="btn" disabled={!url} onClick={loadUrl}>Cargar enlace</button>
        </div>
        <p className="muted small">Usa grabaciones propias o con permiso de uso. Las plataformas de streaming no permiten extraer su audio. Todo se procesa en tu dispositivo: el audio no se sube a ningún sitio.</p>
        {err && <p className="warn">{err}</p>}
      </Card>
      {busy && <div className="busy"><span>{busy.label}…</span><div className="pbar"><span style={{ width: `${Math.round(busy.p * 100)}%` }} /></div></div>}
      {orig && (
        <Card title={`2 · Escuchar: ${name}`}>
          <Waveform buf={orig} pos={pos} sel={sel} onSeek={(x) => { setPos(x); if (playing) play(x); }} onSelect={setSel} bars={an ? bars.map((b) => ({ t: b.start, label: b.halves.map((h) => (t.isSax ? t.chordName(parseChord(h)) : h)).join(' ') })) : []} />
          <div className="transport">
            {playing ? <button className="btn stop" onClick={stop}>■ Parar</button> : <button className="btn primary" onClick={() => play()}>▶ Reproducir</button>}
            <span className="tempo">{fmt(pos)} / {fmt(orig.duration)}</span>
            <label className="tempo">Velocidad {Math.round(speed * 100)}%<input type="range" min={0.5} max={1.25} step={0.05} value={speed} onChange={(e) => setSpeed(+e.target.value)} /></label>
            <label className="tempo">Tono {semi > 0 ? '+' : ''}{semi}<input type="range" min={-12} max={12} step={1} value={semi} onChange={(e) => setSemi(+e.target.value)} /></label>
            <label className="toggle"><input type="checkbox" checked={loop} onChange={() => setLoop(!loop)} />Repetir A-B</label>
            {sel && <button className="btn sm" onClick={() => setSel(null)}>Quitar selección</button>}
          </div>
          <p className="muted small">Arrastra sobre la onda para elegir un fragmento (A-B). Velocidad y tono se ajustan con alta calidad (SoundTouch). {sel ? `Fragmento: ${fmt(sel[0])} – ${fmt(sel[1])}.` : ''}</p>
        </Card>
      )}
      {orig && (
        <Card title="3 · Armonía y tempo" actions={<StatusBadge status="beta" />}>
          {!an ? <button className="btn primary" onClick={analyze} disabled={!!busy}>🔎 Detectar tonalidad, tempo y acordes</button> : (
            <>
              <div className="row gap wrap"><span className="pill">Tonalidad: <b>{an.key.name}</b>{t.isSax && ` (para tu saxo: ${t.noteName(pitchFromMidi(60 + an.key.tonic))}${an.key.minor ? 'm' : ''})`}</span><span className="pill">Tempo ≈ <b>{an.bpm}</b> ♩/min</span><span className="pill">{bars.length} compases</span></div>
              <div className="chart">
                {bars.map((b) => (
                  <div key={b.idx} className={`bar ${b.idx >= selBars[0] && b.idx < selBars[1] ? 'cur' : ''}`}>
                    {b.halves.map((h, j) => <button key={j} className="cell" onClick={() => { setPos(b.start); play(b.start); }} onDoubleClick={() => editChord(b.idx * 2 + j)}>{t.isSax ? t.chordName(parseChord(h)) : h}</button>)}
                    <button className="edit" title="Corregir acorde" onClick={() => editChord(b.idx * 2)}>✎</button>
                  </div>
                ))}
              </div>
              <p className="muted small">Estimación automática por análisis del espectro: verifícala de oído y corrige con ✎ (o doble clic). {t.isSax ? 'Cifrado mostrado para tu saxo; ' : ''}Toca un compás para escucharlo.</p>
              <button className="btn" onClick={() => setShowWorkshop(!showWorkshop)}>{showWorkshop ? 'Ocultar' : '✨ Practicar improvisando sobre esta armonía'}</button>
              {showWorkshop && events.length > 0 && <Workshop key={chart} events={events} originalKey={PC_NAMES[an.key.tonic]} keyName={PC_NAMES[an.key.tonic]} minor={an.key.minor} title={`Transcripción: ${name}`} style="swing" bpm={Math.min(140, an.bpm)} />}
            </>
          )}
        </Card>
      )}
      {orig && an && (
        <Card title="4 · Notas y melodía en partitura" actions={<StatusBadge status="beta" />}>
          <p className="small">Transcribe {sel ? 'el fragmento seleccionado' : 'los primeros 40 segundos (o selecciona un fragmento)'} con el modelo Basic Pitch de Spotify (código abierto), que se ejecuta en tu dispositivo. Funciona mejor con un solo instrumento o voz.</p>
          <div className="row gap wrap">
            <button className="btn primary" onClick={transcribe} disabled={!!busy}>🎼 Transcribir notas</button>
            {notes && <>
              <label className="toggle"><input type="checkbox" checked={allNotes} onChange={() => setAllNotes(!allNotes)} />Todas las notas (no solo la melodía)</label>
              <select value={quant} onChange={(e) => setQuant(+e.target.value)}><option value={0.5}>Cuantizar a corcheas</option><option value={0.25}>Cuantizar a semicorcheas</option><option value={1}>Cuantizar a negras</option></select>
              <button className="btn" onClick={() => playSequence(voiceFor(t.instrument), melody.map((n) => ({ midi: n.midi, start: n.start, dur: n.dur })), an.bpm * speed, { label: 'Estudio: la transcripción (notas detectadas)' })}>▶ Escuchar la transcripción</button>
              <button className="btn" onClick={() => stopSequence()}>■</button>
              <button className="btn" disabled={!melody.length} onClick={() => { addVocab({ title: `Transcripción: ${name} (c. ${selBars[0] + 1}–${selBars[1]})`, source: 'Estudio de transcripción', key: noteName(keyRoot), chart, notes: melody, instrument: app.instrument }); alert('Guardada en Mi vocabulario.'); }}>☆ Guardar en vocabulario</button>
            </>}
          </div>
          {notes && (melody.length ? (
            <>
              <p className="muted small">{notes.length} notas detectadas · mostrando {melody.length} en {selBars[1] - selBars[0]} compases {t.isSax ? `(${t.label})` : t.instrument === 'guitar' ? '(guitarra: octava escrita)' : ''}. Colores = función respecto al acorde detectado.</p>
              <TimeStaff notes={annotated.map((a) => ({ pitch: t.pitch(a.pitch), start: a.start, dur: a.dur, role: a.role, label: a.degree }))} chords={events.map((e, i) => ({ start: events.slice(0, i).reduce((s, x) => s + x.beats, 0), beats: e.beats, symbol: t.chordName(e.chord) }))} totalBeats={Math.max(4, total)} firstBarNumber={selBars[0] + 1} />
            </>
          ) : <p className="muted">No se detectaron notas claras en ese fragmento.</p>)}
        </Card>
      )}
    </div>
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function Waveform({ buf, pos, sel, onSeek, onSelect, bars }: { buf: AudioBuffer; pos: number; sel: [number, number] | null; onSeek: (t: number) => void; onSelect: (s: [number, number] | null) => void; bars: { t: number; label: string }[] }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const drag = useRef<number | null>(null);
  const peaks = useMemo(() => {
    const d = buf.getChannelData(0);
    const n = 1200;
    const step = Math.max(1, Math.floor(d.length / n));
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) { let m = 0; for (let k = i * step; k < Math.min(d.length, (i + 1) * step); k += 4) m = Math.max(m, Math.abs(d[k])); out[i] = m; }
    return out;
  }, [buf]);
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const w = (c.width = c.clientWidth * 2);
    const h = (c.height = 220);
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, w, h);
    const T = buf.duration;
    if (sel) { g.fillStyle = 'rgba(242,181,68,.25)'; g.fillRect((sel[0] / T) * w, 0, ((sel[1] - sel[0]) / T) * w, h); }
    g.fillStyle = '#5ec2b7';
    for (let x = 0; x < w; x++) { const p = peaks[Math.floor((x / w) * peaks.length)] * (h * 0.42); g.fillRect(x, h / 2 + 10 - p, 1, p * 2); }
    g.fillStyle = '#888'; g.font = '20px system-ui';
    bars.forEach((b, i) => { const x = (b.t / T) * w; g.fillRect(x, 0, 1, h); if (bars.length < 80 || i % 2 === 0) g.fillText(b.label.split(' ')[0], x + 3, 20); });
    g.fillStyle = '#ff6b6b'; g.fillRect((pos / T) * w, 0, 3, h);
  }, [peaks, pos, sel, bars, buf.duration]);
  const tAt = (e: React.PointerEvent) => { const r = (e.target as HTMLCanvasElement).getBoundingClientRect(); return Math.max(0, Math.min(buf.duration, ((e.clientX - r.left) / r.width) * buf.duration)); };
  return (
    <canvas ref={cv} className="wave" onPointerDown={(e) => { drag.current = tAt(e); (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => { if (drag.current !== null) { const t = tAt(e); if (Math.abs(t - drag.current) > 0.2) onSelect([Math.min(t, drag.current), Math.max(t, drag.current)]); } }}
      onPointerUp={(e) => { const t = tAt(e); if (drag.current !== null && Math.abs(t - drag.current) <= 0.2) onSeek(t); drag.current = null; }} />
  );
}

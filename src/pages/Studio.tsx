// Estudio «Sacar solos»: importa un audio (archivo, enlace, video capturado mientras suena…), guárdalo como
// proyecto, elige el instrumento que quieres estudiar, sepáralo con IA (SCNet en tu navegador) o sin IA,
// juega con volumen, velocidad y tono, haz loop de un fragmento, llévalo a partitura y lee una explicación
// de lo que usa el solo (modo, acordes, recursos).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Analysis, TNote, analyzeAudio, decodeAudio, removeHarmonics, secToBeat, skyline, stretchBuffer, transcribeNotes } from '../audio/studio';
import { PC_NAMES } from '../audio/analysis';
import { Tone, ensureAudio, playSequence, stopSequence, registerActivity, endActivity } from '../audio/engine';
import { Instrument, INSTRUMENT_INFO, leadGain, midSide, rms, sliceBuffer, spectralGain, toWav } from '../audio/stems';
import { STEM_LABEL, StemName, estimateSeconds, hasWebGPU, separateAudio } from '../separation/separate';
import { TimeStaff } from '../instruments/TimeStaff';
import { parseChart, ChordEvent } from '../theory/progressions';
import { parseChord, chordSymbol } from '../theory/chords';
import { pitchFromMidi, noteName } from '../theory/notes';
import { analyzeSolo } from '../theory/soloAnalysis';
import { getAllRecordings, Recording } from '../recording/db';
import { StudioProject, deleteProject, listProjects, saveProject } from '../recording/projects';
import { addVocab, useAppState } from '../progress/store';
import { Card, StatusBadge, useNames, useTransposer, voiceFor } from '../components/common';
import { Workshop } from '../components/Workshop';
import { useOnStopAll } from '../components/Mixer';
import { isEmbedded } from '../recording/pitch';
import { ImportPanel } from './studio/Import';
import { Waveform } from './studio/Waveform';
import { SoloExplanation } from './studio/Explain';

const symOf = (c: { root: number; quality: string }) => `${PC_NAMES[c.root]}${c.quality === 'maj' ? '' : c.quality}`;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}.${Math.floor((s % 1) * 10)}`;
function downloadWav(buf: AudioBuffer, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(toWav(buf));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

type TrackState = { vol: number; mute: boolean; solo: boolean };
interface Stems { from: number; to: number; method: 'ia' | 'centro'; tracks: Record<string, AudioBuffer> }
const TRACK_LABEL: Record<string, string> = { ...STEM_LABEL, lead: '✨ Instrumento realzado', center: 'Centro del estéreo', sides: 'Lados del estéreo', orig: 'Mezcla original' };

/** Pista donde está el instrumento elegido. */
function focusOf(inst: Instrument, stems: Stems | null): string {
  if (!stems) return 'orig';
  const t = stems.tracks;
  if (t.lead && INSTRUMENT_INFO[inst].lead) return 'lead';
  if (stems.method === 'centro') return INSTRUMENT_INFO[inst].lead ? 'center' : 'sides';
  if (inst === 'drums') return 'drums';
  if (inst === 'bass') return 'bass';
  if (inst === 'guitar' || inst === 'piano') return 'other';
  return t.vocals && t.other && rms(t.vocals) >= 0.35 * rms(t.other) ? 'vocals' : 'other';
}

export function StudioPage() {
  const t = useTransposer();
  const names = useNames();
  const app = useAppState();
  const ctx = () => Tone.getContext().rawContext as AudioContext;
  // proyecto
  const [projectId, setProjectId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [orig, setOrig] = useState<AudioBuffer | null>(null);
  const [instrument, setInstrument] = useState<Instrument>(app.instrument === 'sax' ? 'sax' : app.instrument);
  const [stems, setStems] = useState<Stems | null>(null);
  const [mode, setMode] = useState<'full' | 'stems'>('full');
  const [mixState, setMixState] = useState<Record<string, TrackState>>({});
  // edición y reproducción
  const [view, setView] = useState<[number, number]>([0, 1]);
  const [pos, setPos] = useState(0);
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [loop, setLoop] = useState(true);
  const [markers, setMarkers] = useState<{ t: number; label: string }[]>([]);
  const [speed, setSpeed] = useState(1);
  const [semi, setSemi] = useState(0);
  const [master, setMaster] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [proc, setProc] = useState<Record<string, AudioBuffer>>({});
  // análisis
  const [an, setAn] = useState<{ a: Analysis; base: number } | null>(null);
  const [chordEdits, setChordEdits] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<TNote[] | null>(null); // segundos absolutos
  const [allNotes, setAllNotes] = useState(false);
  const [quant, setQuant] = useState(0.5);
  const [showWorkshop, setShowWorkshop] = useState(false);
  // estado general
  const [busy, setBusy] = useState<{ label: string; p: number; cancel?: () => void } | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [recs, setRecs] = useState<Recording[]>([]);
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [gpu, setGpu] = useState<boolean | null>(null);
  const nodes = useRef<{ srcs: AudioBufferSourceNode[]; gains: Record<string, GainNode>; master: GainNode | null }>({ srcs: [], gains: {}, master: null });
  const startInfo = useRef<{ ctxT: number; pos0: number } | null>(null);
  const raf = useRef(0);

  useEffect(() => {
    getAllRecordings().then(setRecs).catch(() => undefined);
    listProjects().then(setProjects).catch(() => undefined);
    hasWebGPU().then(setGpu);
    return () => stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useOnStopAll(() => stop());

  // ventana de trabajo: canción completa o el fragmento separado
  const win: [number, number] = mode === 'stems' && stems ? [stems.from, stems.to] : [0, orig?.duration ?? 1];
  const tracks: Record<string, AudioBuffer> = mode === 'stems' && stems ? stems.tracks : orig ? { orig } : {};
  const focus = focusOf(instrument, mode === 'stems' ? stems : null);
  const trackIds = Object.keys(tracks).sort((a, b) => (a === focus ? -1 : b === focus ? 1 : 0));

  // ------------------------------------------------ velocidad y tono (SoundTouch, por pista)
  useEffect(() => {
    if (!orig) return;
    let cancel = false;
    const id = setTimeout(async () => {
      const wasPlaying = playing;
      stop();
      const out: Record<string, AudioBuffer> = {};
      const ids = Object.keys(tracks);
      if (speed === 1 && semi === 0) { ids.forEach((k) => (out[k] = tracks[k])); setProc(out); return; }
      for (let i = 0; i < ids.length; i++) {
        if (cancel) return;
        setBusy({ label: `Ajustando velocidad y tono (${i + 1}/${ids.length})`, p: i / ids.length });
        out[ids[i]] = await stretchBuffer(tracks[ids[i]], speed, semi, (p) => !cancel && setBusy({ label: `Ajustando velocidad y tono (${i + 1}/${ids.length})`, p: (i + p) / ids.length }));
      }
      if (!cancel) { setProc(out); setBusy(null); if (wasPlaying) setTimeout(() => play(), 50); }
    }, 300);
    return () => { cancel = true; clearTimeout(id); };
  }, [orig, stems, mode, speed, semi]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------ carga
  const resetFor = (b: AudioBuffer) => {
    stop(); setAn(null); setNotes(null); setChordEdits({}); setShowWorkshop(false); setStems(null); setMode('full');
    setOrig(b); setPos(0); setSel(null); setMarkers([]); setView([0, b.duration]); setSpeed(1); setSemi(0); setMixState({});
  };
  const load = async (data: Blob, n: string, src: string) => {
    setErr(''); setMsg('');
    try {
      await ensureAudio();
      setBusy({ label: 'Leyendo el audio', p: 0.5 });
      const b = await decodeAudio(await data.arrayBuffer());
      if (b.duration > 900) throw new Error('el audio dura más de 15 minutos: recórtalo o captura solo la parte que quieres estudiar');
      resetFor(b); setBlob(data); setName(n); setSource(src); setProjectId(null);
    } catch (e) { setErr(`No se pudo leer el audio: ${(e as Error).message || 'formato no soportado'}.`); }
    setBusy(null);
  };
  const openProject = async (p: StudioProject) => {
    setErr(''); setMsg('');
    try {
      await ensureAudio();
      setBusy({ label: 'Abriendo el proyecto', p: 0.3 });
      const b = await decodeAudio(await p.audio.arrayBuffer());
      resetFor(b);
      setBlob(p.audio); setName(p.name); setSource(p.source); setProjectId(p.id); setInstrument(p.instrument);
      setSel(p.loop); setMarkers(p.markers); setSpeed(p.speed); setSemi(p.semi); setChordEdits(p.chordEdits ?? {});
      if (p.stems) {
        const tr: Record<string, AudioBuffer> = {};
        for (const [k, v] of Object.entries(p.stems.tracks)) tr[k] = await decodeAudio(await v.arrayBuffer());
        setStems({ from: p.stems.from, to: p.stems.to, method: p.stems.method, tracks: tr }); setMode('stems'); setView([p.stems.from, p.stems.to]);
      }
    } catch (e) { setErr(`No se pudo abrir el proyecto: ${(e as Error).message}`); }
    setBusy(null);
  };
  const save = async () => {
    if (!blob || !orig) return;
    setBusy({ label: 'Guardando el proyecto', p: 0.5 });
    try {
      const now = new Date().toISOString();
      const id = projectId ?? uid();
      const p: StudioProject = {
        id, name: name || 'Proyecto sin nombre', createdAt: projects.find((x) => x.id === id)?.createdAt ?? now, updatedAt: now, source, audio: blob, instrument,
        loop: sel, markers, speed, semi, chordEdits,
        stems: stems ? { from: stems.from, to: stems.to, method: stems.method, tracks: Object.fromEntries(Object.entries(stems.tracks).map(([k, v]) => [k, toWav(v)])) } : undefined,
      };
      await saveProject(p);
      setProjectId(id);
      setProjects(await listProjects());
      setMsg('✔ Proyecto guardado en este navegador.');
    } catch (e) { setErr(`No se pudo guardar: ${(e as Error).message} (puede que el navegador no tenga espacio).`); }
    setBusy(null);
  };

  // ------------------------------------------------ reproducción multipista
  const effGain = (id: string, st = mixState) => {
    const anySolo = trackIds.some((k) => st[k]?.solo);
    const s = st[id] ?? { vol: 1, mute: false, solo: false };
    return s.mute || (anySolo && !s.solo) ? 0 : s.vol;
  };
  useEffect(() => {
    const g = nodes.current.gains;
    Object.keys(g).forEach((k) => g[k].gain.setTargetAtTime(effGain(k), ctx().currentTime, 0.02));
    nodes.current.master?.gain.setTargetAtTime(master, ctx().currentTime, 0.02);
  }, [mixState, master]); // eslint-disable-line react-hooks/exhaustive-deps

  function stop() {
    cancelAnimationFrame(raf.current);
    nodes.current.srcs.forEach((s) => { try { s.stop(); } catch { /* ya parado */ } });
    nodes.current = { srcs: [], gains: {}, master: null };
    startInfo.current = null;
    setPlaying(false);
    endActivity('studio');
  }
  const stopRef = useRef(stop);
  stopRef.current = stop;
  const stopper = useRef(() => stopRef.current()).current;
  const play = async (from = pos) => {
    if (!orig || !Object.keys(proc).length) return;
    await ensureAudio();
    stop();
    const c = ctx();
    const ws = win[0];
    const loopOn = loop && sel && sel[1] - sel[0] > 0.2;
    const a = loopOn ? Math.max(win[0], sel![0]) : win[0];
    const b = loopOn ? Math.min(win[1], sel![1]) : win[1];
    let p = from;
    if (p < a || p >= b - 0.05) p = a;
    const m = c.createGain();
    m.gain.value = master;
    m.connect(c.destination);
    const t0 = c.currentTime + 0.06;
    const srcs: AudioBufferSourceNode[] = [];
    const gains: Record<string, GainNode> = {};
    for (const id of Object.keys(proc)) {
      if (!tracks[id]) continue;
      const s = c.createBufferSource();
      s.buffer = proc[id];
      const g = c.createGain();
      g.gain.value = effGain(id);
      s.connect(g); g.connect(m);
      if (loopOn) { s.loop = true; s.loopStart = (a - ws) / speed; s.loopEnd = (b - ws) / speed; }
      s.start(t0, Math.max(0, (p - ws) / speed));
      srcs.push(s); gains[id] = g;
    }
    if (!srcs.length) return;
    srcs[0].onended = () => { if (nodes.current.srcs[0] === srcs[0]) { setPlaying(false); endActivity('studio'); cancelAnimationFrame(raf.current); } };
    nodes.current = { srcs, gains, master: m };
    startInfo.current = { ctxT: t0, pos0: p };
    registerActivity('studio', stopper, `Estudio: ${name || 'audio'}${speed !== 1 ? ` · ${Math.round(speed * 100)} %` : ''}${semi ? ` · ${semi > 0 ? '+' : ''}${semi} st` : ''}${loopOn ? ' · loop' : ''}`);
    setPlaying(true);
    const tick = () => {
      if (!startInfo.current) return;
      let el = (c.currentTime - startInfo.current.ctxT) * speed + startInfo.current.pos0;
      if (loopOn && el >= b) el = a + ((el - a) % (b - a));
      setPos(Math.max(win[0], Math.min(win[1], el)));
      raf.current = requestAnimationFrame(tick);
    };
    tick();
  };
  const seek = (x: number) => { setPos(x); if (playing) play(x); };

  // atajos de teclado
  useEffect(() => {
    if (!orig) return;
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space') { e.preventDefault(); if (playing) stop(); else play(); }
      else if (e.key === '[') setSel([pos, Math.max(pos + 0.5, sel?.[1] ?? pos + 4)]);
      else if (e.key === ']') setSel([Math.min(sel?.[0] ?? pos - 4, pos - 0.5), pos]);
      else if (e.key.toLowerCase() === 'l') setLoop((x) => !x);
      else if (e.key.toLowerCase() === 'm') setMarkers((ms) => [...ms, { t: pos, label: String(ms.length + 1) }].sort((x, y) => x.t - y.t));
      else if (e.key === 'ArrowLeft') seek(Math.max(win[0], pos - (e.shiftKey ? 10 : 2)));
      else if (e.key === 'ArrowRight') seek(Math.min(win[1], pos + (e.shiftKey ? 10 : 2)));
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSpeed((s) => Math.min(1.5, Math.round((s + 0.05) * 100) / 100)); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSpeed((s) => Math.max(0.25, Math.round((s - 0.05) * 100) / 100)); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  // ------------------------------------------------ separación
  const regionForSep = (): [number, number] => (sel && sel[1] - sel[0] > 1 ? [sel[0], sel[1]] : [0, orig!.duration]);
  const separateAI = async () => {
    if (!orig) return;
    const [a, b] = regionForSep();
    const dev = gpu ? 'webgpu' : 'wasm';
    const est = estimateSeconds(b - a, dev);
    if (b - a > 90 && !confirm(`Vas a separar ${Math.round(b - a)} s de audio. En este equipo puede tardar unos ${Math.ceil(est / 60)} min. Consejo: marca primero el solo con el loop y separa solo esa parte. ¿Continuar?`)) return;
    setErr(''); setMsg('');
    stop();
    const ac = new AbortController();
    const label = (p: { phase: string; device: string }) => p.phase === 'model' ? 'Preparando el modelo de IA (la primera vez descarga ≈13 MB)' : `Separando instrumentos con IA en tu ${p.device === 'webgpu' ? 'tarjeta gráfica' : 'procesador'} · fragmento ${fmt(a)}–${fmt(b)}`;
    setBusy({ label: 'Preparando el modelo de IA', p: 0, cancel: () => ac.abort() });
    try {
      const tr = await separateAudio(orig, a, b, ctx(), { signal: ac.signal, onProgress: (p) => setBusy({ label: label(p), p: p.phase === 'model' ? 0.02 : p.p, cancel: () => ac.abort() }) });
      const st: Stems = { from: a, to: b, method: 'ia', tracks: tr as Record<StemName, AudioBuffer> };
      setStems(st); setMode('stems'); setView([a, b]); setAn(null); setNotes(null);
      setPos(a); if (sel && (sel[0] < a || sel[1] > b)) setSel(null);
      applyPreset('front', st);
      setMsg('✔ Instrumentos separados. Usa el mezclador para escuchar solo el instrumento, o todo menos él para tocar encima.');
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') setErr(`No se pudo separar con IA: ${(e as Error).message}. Prueba con un fragmento más corto, cierra otras pestañas, o usa la separación sin IA.`);
    }
    setBusy(null);
  };
  const separateCenter = () => {
    if (!orig) return;
    const [a, b] = regionForSep();
    const part = sliceBuffer(orig, a, b, ctx());
    const { center, sides } = midSide(part, ctx());
    const st: Stems = { from: a, to: b, method: 'centro', tracks: { center, sides } };
    setStems(st); setMode('stems'); setView([a, b]); setAn(null); setNotes(null); setPos(a);
    applyPreset('front', st);
    setMsg('Separación sin IA (centro / lados del estéreo): sirve en grabaciones donde cada instrumento está a un lado. Para separar de verdad cada instrumento usa la IA.');
  };
  const enhanceLead = async () => {
    if (!stems || !notes?.length) return;
    const fid = focusOf(instrument, { ...stems, tracks: Object.fromEntries(Object.entries(stems.tracks).filter(([k]) => k !== 'lead')) });
    const base = stems.tracks[fid];
    const rel = (allNotes ? removeHarmonics(notes) : skyline(notes)).map((n) => ({ midi: n.midi, start: n.start - stems.from, dur: n.dur }));
    setBusy({ label: 'Realzando la melodía del solo', p: 0 });
    try {
      const lead = await spectralGain(base, ctx(), leadGain(rel), (p) => setBusy({ label: 'Realzando la melodía del solo', p }));
      const st = { ...stems, tracks: { ...stems.tracks, lead } };
      setStems(st);
      setMixState((m) => ({ ...m, lead: { vol: 1, mute: false, solo: false }, [fid]: { ...(m[fid] ?? { vol: 1, solo: false }), mute: true } }));
      setMsg('✔ Pista «Instrumento realzado»: conserva los armónicos de las notas del solo y baja el resto (piano, guitarra…).');
    } catch (e) { setErr(`No se pudo realzar: ${(e as Error).message}`); }
    setBusy(null);
  };
  function applyPreset(kind: 'solo' | 'front' | 'minus' | 'all', st: Stems | null = stems) {
    const ids = st ? Object.keys(st.tracks) : ['orig'];
    const f = focusOf(instrument, st);
    const v = (id: string): TrackState => {
      const isF = id === f;
      const vol = kind === 'all' ? 1 : kind === 'solo' ? (isF ? 1 : 0) : kind === 'front' ? (isF ? 1 : 0.22) : isF ? 0 : 1;
      return { vol, mute: id === 'lead' ? !isF : false, solo: false };
    };
    setMixState(Object.fromEntries(ids.map((id) => [id, v(id)])));
  }

  // ------------------------------------------------ armonía, tempo y transcripción
  const analyze = async () => {
    if (!orig) return;
    setErr('');
    let buf = orig, base = 0;
    if (mode === 'stems' && stems) {
      // acompañamiento sin el instrumento elegido: acordes más limpios
      // los acordes viven en «resto» (piano, guitarra): se conserva aunque el solista haya caído ahí
      const ids = ['drums', 'bass', 'other', 'center', 'sides'].filter((k) => stems.tracks[k] && !(k === focus && (k === 'drums' || k === 'bass')));
      const ref = stems.tracks[ids[0] ?? focus];
      const acc = ctx().createBuffer(2, ref.length, ref.sampleRate);
      for (const id of ids.length ? ids : [focus]) for (let ch = 0; ch < 2; ch++) { const src = stems.tracks[id].getChannelData(Math.min(ch, stems.tracks[id].numberOfChannels - 1)); const d = acc.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] += src[i] ?? 0; }
      buf = acc; base = stems.from;
    }
    setBusy({ label: 'Analizando armonía y tempo', p: 0 });
    try { setAn({ a: await analyzeAudio(buf, (p, label) => setBusy({ label, p })), base }); } catch (e) { setErr(`Error de análisis: ${(e as Error).message}`); }
    setBusy(null);
  };
  const transcribe = async () => {
    if (!orig) return;
    setErr('');
    const isStems = mode === 'stems' && stems;
    const src = isStems ? stems!.tracks[focus] : orig;
    const off = isStems ? stems!.from : 0;
    const [a, b] = sel ? [sel[0] - off, sel[1] - off] : [0, Math.min(src.duration, 40)];
    const label = `Transcribiendo ${isStems ? `la pista «${TRACK_LABEL[focus]}»` : 'la mezcla'} (Basic Pitch, en tu dispositivo)`;
    setBusy({ label, p: 0 });
    try {
      const ns = await transcribeNotes(src, Math.max(0, a), Math.min(src.duration, b), (p) => setBusy({ label, p }));
      const [lo, hi] = INSTRUMENT_INFO[instrument].range;
      setNotes(ns.map((n) => ({ ...n, start: n.start + off })).filter((n) => n.midi >= lo && n.midi <= hi));
    } catch (e) { setErr(`No se pudo transcribir: ${(e as Error).message}. Prueba con un fragmento más corto.`); }
    setBusy(null);
  };

  // acordes por compás (en el tiempo del análisis)
  const A = an?.a;
  const base = an?.base ?? 0;
  const bars = useMemo(() => {
    if (!A) return [] as { idx: number; start: number; halves: string[] }[];
    const out: { idx: number; start: number; halves: string[] }[] = [];
    for (let k = 0; k < A.chords.length; k += 2) {
      const h = [A.chords[k], A.chords[k + 1]].filter(Boolean).map((c, j) => chordEdits[k + j] ?? symOf(c));
      out.push({ idx: k / 2, start: A.chords[k].start, halves: h });
    }
    return out;
  }, [A, chordEdits]);
  const selBars = useMemo(() => {
    if (!A || !bars.length) return [0, 0];
    if (!sel) return [0, Math.min(bars.length, 16)];
    const s0 = sel[0] - base, s1 = sel[1] - base;
    const f = bars.findIndex((_, i) => (bars[i + 1]?.start ?? Infinity) > s0);
    const l = bars.findIndex((b) => b.start >= s1);
    return [Math.max(0, f), Math.max(f + 1, l < 0 ? bars.length : l)];
  }, [A, bars, sel, base]);
  const chart = bars.slice(selBars[0], selBars[1]).map((b) => (b.halves[0] === b.halves[1] || b.halves.length === 1 ? b.halves[0] : b.halves.join(' '))).join(' | ') + ' |';
  const events: ChordEvent[] = useMemo(() => { try { return bars.length ? parseChart(chart) : []; } catch { return []; } }, [chart, bars.length]);
  const melody = useMemo(() => {
    if (!notes || !A) return [];
    const b0 = A.downbeatOffset + selBars[0] * 4;
    const src = allNotes ? removeHarmonics(notes) : skyline(notes);
    const ns = src.map((n) => {
      const x0 = secToBeat(n.start - base, A.beats) - b0;
      const x1 = secToBeat(n.start - base + n.dur, A.beats) - b0;
      const s = Math.round(x0 / quant) * quant;
      return { midi: n.midi, start: s, dur: Math.max(quant, Math.round((x1 - x0) / quant) * quant) };
    }).filter((n) => n.start >= 0 && n.start < (selBars[1] - selBars[0]) * 4);
    const clean: typeof ns = [];
    for (const n of ns.sort((x, y) => x.start - y.start || y.midi - x.midi)) {
      const last = clean[clean.length - 1];
      if (last && Math.abs(last.start - n.start) < 1e-6) continue;
      if (last && last.start + last.dur > n.start) last.dur = n.start - last.start;
      clean.push(n);
    }
    return clean;
  }, [notes, A, selBars, quant, allNotes, base]);
  const keyRoot = A ? pitchFromMidi(60 + A.key.tonic) : pitchFromMidi(60);
  const report = useMemo(() => (events.length && melody.length >= 4 && A ? analyzeSolo(melody, events, { keyRoot, minor: A.key.minor, blues: false, names: { note: t.noteName, chord: t.chordName }, firstBar: selBars[0] + 1, rangeName: (m) => { const p = t.pitch(pitchFromMidi(m)); return `${names(p)}${p.octave}`; } }) : null), [events, melody, A, t.instrument, t.sax, app.settings.noteNames]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = events.reduce((a, e) => a + e.beats, 0);
  const jumpBar = (bar: number) => { const b = bars[bar - 1]; if (b) seek(b.start + base); };
  const editChord = (k: number) => {
    const cur = chordEdits[k] ?? (A ? symOf(A.chords[k]) : '');
    const v = prompt('Corrige el acorde (cifrado americano, p. ej. Dm7, G7, Cmaj7, Bb7, F#m7b5):', cur);
    if (!v) return;
    try { setChordEdits({ ...chordEdits, [k]: chordSymbol(parseChord(v.trim())) }); } catch { alert('No reconozco ese acorde.'); }
  };
  const info = INSTRUMENT_INFO[instrument];
  const waveBars = bars.map((b) => ({ t: b.start + base, label: b.halves.map((h) => (t.isSax ? t.chordName(parseChord(h)) : h)).join(' ') }));

  return (
    <div className="page studio">
      <div className="page-hero studio-hero">
        <h1>Sacar solos</h1>
        <p className="lead">Importa una grabación, elige el instrumento que quieres estudiar, sepáralo con IA, ralentízalo sin cambiar el tono, repite un fragmento y llévalo a partitura con la explicación de lo que usa: modo, acordes y recursos.</p>
      </div>

      {(!orig || !name) && (
        <Card title="1 · Abrir un audio">
          <ImportPanel onLoad={load} recs={recs} projects={projects} onOpenProject={openProject} onDeleteProject={async (p) => { await deleteProject(p.id); setProjects(await listProjects()); }} />
          {err && <p className="warn">{err}</p>}
        </Card>
      )}
      {busy && (
        <div className="busy">
          <span>{busy.label}…</span>
          <div className="pbar"><span style={{ width: `${Math.round(busy.p * 100)}%` }} /></div>
          {busy.cancel && <button className="btn sm" onClick={busy.cancel}>Cancelar</button>}
        </div>
      )}

      {orig && name && (
        <>
          <div className="project-bar">
            <input className="pname" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nombre del proyecto" />
            <span className="muted small">{source} · {fmt(orig.duration)}</span>
            <button className="btn primary" onClick={save} disabled={!!busy}>💾 Guardar proyecto</button>
            <button className="btn" onClick={() => { stop(); setOrig(null); setName(''); setBlob(null); setStems(null); setProjectId(null); }}>📂 Abrir otro</button>
          </div>
          {err && <p className="warn">{err}</p>}
          {msg && <p className="hint small">{msg}</p>}

          <Card title="2 · ¿Qué instrumento quieres sacar?">
            <div className="inst-pick">
              {(Object.keys(INSTRUMENT_INFO) as Instrument[]).map((k) => (
                <button key={k} className={`layer ${instrument === k ? 'on' : ''}`} onClick={() => setInstrument(k)}><span className="li">{INSTRUMENT_INFO[k].icon}</span><span>{INSTRUMENT_INFO[k].label}</span></button>
              ))}
            </div>
            <p className="small muted">
              {info.lead ? 'Instrumento solista: la IA suele dejarlo en la pista «Voz / solista» o en «resto»; la app elige la que tenga más presencia y, tras transcribir, puedes «realzar la melodía» para quitar el piano o la guitarra de fondo.'
                : instrument === 'guitar' || instrument === 'piano' ? 'Piano y guitarra quedan juntos en la pista «Piano, guitarra y resto»: si suenan los dos a la vez no se pueden separar entre sí.'
                  : `La IA separa ${info.label.toLowerCase()} en su propia pista.`}
              {' '}La partitura filtra las notas al registro del instrumento.
            </p>
          </Card>

          <Card title="3 · Editor: escuchar, loop, velocidad y tono">
            {stems && (
              <div className="row gap wrap mode-switch">
                <button className={`chip ${mode === 'full' ? 'on' : ''}`} onClick={() => { stop(); setMode('full'); setView([0, orig.duration]); }}>Canción completa</button>
                <button className={`chip ${mode === 'stems' ? 'on' : ''}`} onClick={() => { stop(); setMode('stems'); setView([stems.from, stems.to]); setPos(stems.from); }}>✂️ Pistas separadas ({fmt(stems.from)}–{fmt(stems.to)})</button>
              </div>
            )}
            <Waveform mix={orig} focus={mode === 'stems' && stems ? stems.tracks[focus] : null} t0={win[0]} span={win[1] - win[0]} view={[Math.max(win[0], view[0]), Math.min(win[1], Math.max(view[1], view[0] + 0.5))]} pos={pos} sel={sel} markers={markers} bars={waveBars}
              onView={setView} onSeek={seek} onSelect={(s) => setSel(s ? [Math.max(win[0], s[0]), Math.min(win[1], s[1])] : null)} />
            <div className="transport studio-transport">
              {playing ? <button className="btn stop" onClick={stop}>■ Parar</button> : <button className="btn primary" onClick={() => play()} disabled={!Object.keys(proc).length}>▶ Reproducir</button>}
              <span className="tempo mono">{fmt(pos)} / {fmt(win[1])}</span>
              <label className="toggle"><input type="checkbox" checked={loop} onChange={() => setLoop(!loop)} />Loop A-B</label>
              <button className="btn sm" onClick={() => setSel([pos, Math.max(pos + 0.5, sel?.[1] ?? Math.min(win[1], pos + 4))])} title="Inicio del loop aquí ( [ )">A ⟵</button>
              <button className="btn sm" onClick={() => setSel([Math.min(sel?.[0] ?? Math.max(win[0], pos - 4), pos - 0.5), pos])} title="Fin del loop aquí ( ] )">⟶ B</button>
              {sel && <button className="btn sm" onClick={() => setSel(null)}>Quitar loop</button>}
              <button className="btn sm" onClick={() => setMarkers((ms) => [...ms, { t: pos, label: String(ms.length + 1) }].sort((x, y) => x.t - y.t))} title="Marca en el cursor (M)">⚑ Marca</button>
            </div>
            <div className="sliders">
              <label>Velocidad <b>{Math.round(speed * 100)} %</b><input type="range" min={0.25} max={1.5} step={0.05} value={speed} onChange={(e) => setSpeed(+e.target.value)} /></label>
              <label>Tono <b>{semi > 0 ? '+' : ''}{semi} semitonos</b><input type="range" min={-12} max={12} step={1} value={semi} onChange={(e) => setSemi(+e.target.value)} /></label>
              <label>Volumen <b>{Math.round(master * 100)} %</b><input type="range" min={0} max={2} step={0.05} value={master} onChange={(e) => setMaster(+e.target.value)} /></label>
            </div>
            <div className="chip-row">
              {[0.5, 0.75, 1].map((s) => <button key={s} className={`chip ${speed === s ? 'on' : ''}`} onClick={() => setSpeed(s)}>{s === 1 ? 'Velocidad normal' : `${s * 100} %`}</button>)}
              {t.isSax && <button className="chip" onClick={() => setSemi(t.sax === 'tenor' ? 2 : -3)} title="Transpone el audio para que coincida con tu partitura de saxo">Afinar a mi saxo ({t.sax === 'tenor' ? '+2' : '−3'})</button>}
              {markers.map((m, i) => <button key={i} className="chip" onClick={() => seek(m.t)} onDoubleClick={() => setMarkers(markers.filter((_, j) => j !== i))} title="Doble clic para borrar">⚑ {m.label} · {fmt(m.t)}</button>)}
            </div>
            <p className="muted small">Atajos: espacio = reproducir/parar · [ y ] = inicio/fin del loop · L = activar loop · M = marca · ← → = mover 2 s (Mayús: 10 s) · ↑ ↓ = velocidad. Velocidad y tono con SoundTouch (alta calidad).</p>
          </Card>

          <Card title="4 · Separar instrumentos" actions={<StatusBadge status="beta" />}>
            {!stems || mode === 'full' ? (
              <>
                <p className="small">Separa {sel && sel[1] - sel[0] > 1 ? <b>el loop marcado ({fmt(sel[0])}–{fmt(sel[1])})</b> : <b>todo el audio</b>} en pistas: voz/solista, batería, bajo y resto (piano, guitarra…). Se calcula en tu {gpu ? 'tarjeta gráfica (WebGPU)' : 'procesador'}; tiempo estimado ≈ {Math.max(5, estimateSeconds((sel && sel[1] - sel[0] > 1 ? sel[1] - sel[0] : orig.duration), gpu ? 'webgpu' : 'wasm'))} s.{!sel && orig.duration > 60 ? ' Consejo: marca primero el solo con el loop: es mucho más rápido.' : ''}</p>
                <div className="row gap wrap">
                  <button className="btn primary" onClick={separateAI} disabled={!!busy}>✂️ Separar con IA</button>
                  <button className="btn" onClick={separateCenter} disabled={!!busy}>Sin IA: centro / lados (instantáneo)</button>
                </div>
                <p className="muted small">IA: modelo SCNet (Tong et al., 2024; pesos con licencia MIT) mediante ONNX Runtime Web; la primera vez descarga ≈13 MB y queda guardado. Tu audio no sale de tu equipo.</p>
                {isEmbedded() && <p className="warn small">Dentro de otra página (por ejemplo claude.ai) el navegador puede bloquear la descarga del modelo: si falla, abre la app desde su dirección propia (GitHub Pages).</p>}
              </>
            ) : (
              <>
                <div className="chip-row">
                  <button className="chip" onClick={() => applyPreset('solo')}>🎧 Solo el instrumento</button>
                  <button className="chip" onClick={() => applyPreset('front')}>⭐ Instrumento al frente</button>
                  <button className="chip" onClick={() => applyPreset('minus')}>🎷 Todo menos el instrumento (toca tú)</button>
                  <button className="chip" onClick={() => applyPreset('all')}>Mezcla original</button>
                </div>
                <div className="stem-mixer">
                  {trackIds.map((id) => {
                    const s = mixState[id] ?? { vol: 1, mute: false, solo: false };
                    const level = rms(tracks[id]);
                    return (
                      <div key={id} className={`stem-row ${id === focus ? 'focus' : ''}`}>
                        <span className="stem-name">{id === focus ? '★ ' : ''}{TRACK_LABEL[id] ?? id}<small>{level < 0.003 ? 'casi vacía' : level < 0.02 ? 'poca presencia' : 'con contenido'}</small></span>
                        <input type="range" min={0} max={1.5} step={0.05} value={s.vol} onChange={(e) => setMixState({ ...mixState, [id]: { ...s, vol: +e.target.value } })} aria-label={`Volumen ${TRACK_LABEL[id]}`} />
                        <button className={`btn sm ${s.mute ? 'on-red' : ''}`} onClick={() => setMixState({ ...mixState, [id]: { ...s, mute: !s.mute } })}>{s.mute ? 'Silenciada' : 'Silenciar'}</button>
                        <button className={`btn sm ${s.solo ? 'on-green' : ''}`} onClick={() => setMixState({ ...mixState, [id]: { ...s, solo: !s.solo } })}>Solo</button>
                        <button className="btn sm" onClick={() => downloadWav(tracks[id], `${name} - ${TRACK_LABEL[id] ?? id}.wav`)}>⬇ WAV</button>
                      </div>
                    );
                  })}
                </div>
                <div className="row gap wrap">
                  {INSTRUMENT_INFO[instrument].lead && (notes?.length ? <button className="btn" onClick={enhanceLead} disabled={!!busy}>✨ Realzar la melodía del solo (quita el acompañamiento de su pista)</button> : <span className="muted small">Para «realzar la melodía», transcribe primero el solo (paso 6).</span>)}
                  <button className="btn" onClick={() => { if (confirm('¿Descartar las pistas separadas?')) { stop(); setStems(null); setMode('full'); setView([0, orig.duration]); } }}>Descartar pistas</button>
                </div>
              </>
            )}
          </Card>

          <Card title="5 · Armonía y tempo" actions={<StatusBadge status="beta" />}>
            {!A ? (
              <>
                <button className="btn primary" onClick={analyze} disabled={!!busy}>🔎 Detectar tonalidad, tempo y acordes{mode === 'stems' && stems ? ' (sin el solista)' : ''}</button>
                {mode === 'stems' && stems && <p className="muted small">Se analiza el acompañamiento sin el instrumento elegido: los acordes salen más limpios.</p>}
              </>
            ) : (
              <>
                <div className="row gap wrap"><span className="pill">Tonalidad: <b>{A.key.name}</b>{t.isSax && ` (para tu saxo: ${t.noteName(pitchFromMidi(60 + A.key.tonic))}${A.key.minor ? 'm' : ''})`}</span><span className="pill">Tempo ≈ <b>{A.bpm}</b> ♩/min</span><span className="pill">{bars.length} compases</span><button className="btn sm" onClick={() => setAn(null)}>Volver a analizar</button></div>
                <div className="chart">
                  {bars.map((b) => (
                    <div key={b.idx} className={`bar ${b.idx >= selBars[0] && b.idx < selBars[1] ? 'cur' : ''}`}>
                      {b.halves.map((h, j) => <button key={j} className="cell" onClick={() => seek(b.start + base)} onDoubleClick={() => editChord(b.idx * 2 + j)}>{t.isSax ? t.chordName(parseChord(h)) : h}</button>)}
                      <button className="edit" title="Corregir acorde" onClick={() => editChord(b.idx * 2)}>✎</button>
                    </div>
                  ))}
                </div>
                <p className="muted small">Estimación automática: verifícala de oído y corrige con ✎. Toca un compás para ir ahí.</p>
                <button className="btn" onClick={() => setShowWorkshop(!showWorkshop)}>{showWorkshop ? 'Ocultar' : '✨ Practicar improvisando sobre esta armonía'}</button>
                {showWorkshop && events.length > 0 && <Workshop key={chart} events={events} originalKey={PC_NAMES[A.key.tonic]} keyName={PC_NAMES[A.key.tonic]} minor={A.key.minor} title={`Transcripción: ${name}`} style="swing" bpm={Math.min(140, A.bpm)} />}
              </>
            )}
          </Card>

          {A && (
            <Card title="6 · Partitura del solo" actions={<StatusBadge status="beta" />}>
              <p className="small">Transcribe {sel ? 'el loop marcado' : 'los primeros 40 s'} de {mode === 'stems' && stems ? <>la pista <b>{TRACK_LABEL[focus]}</b></> : 'la mezcla (separa primero para mejores resultados)'} con Basic Pitch (Spotify, código abierto, en tu dispositivo). Se muestran las notas en el registro de {info.label.toLowerCase()}, en la notación de tu instrumento.</p>
              <div className="row gap wrap">
                <button className="btn primary" onClick={transcribe} disabled={!!busy}>🎼 Transcribir notas</button>
                {notes && <>
                  <label className="toggle"><input type="checkbox" checked={allNotes} onChange={() => setAllNotes(!allNotes)} />Todas las notas (acordes)</label>
                  <select value={quant} onChange={(e) => setQuant(+e.target.value)}><option value={0.5}>Cuantizar a corcheas</option><option value={0.25}>A semicorcheas</option><option value={1 / 3}>A tresillos</option><option value={1}>A negras</option></select>
                  <button className="btn" onClick={() => playSequence(voiceFor(t.instrument), melody.map((n) => ({ midi: n.midi, start: n.start, dur: n.dur })), A.bpm * speed, { label: `Transcripción: ${name}`, swing: quant === 0.5 })}>▶ Escuchar la transcripción</button>
                  <button className="btn" onClick={() => stopSequence()}>■</button>
                  <button className="btn" disabled={!melody.length} onClick={() => { addVocab({ title: `${name} (c. ${selBars[0] + 1}–${selBars[1]})`, source: 'Sacar solos', key: noteName(keyRoot), chart, notes: melody, instrument: app.instrument }); setMsg('✔ Guardado en Mi vocabulario.'); }}>☆ Guardar en vocabulario</button>
                </>}
              </div>
              {notes && (melody.length ? (
                <>
                  <p className="muted small">{notes.length} notas detectadas · {melody.length} en {selBars[1] - selBars[0]} compases {t.isSax ? `(${t.label})` : t.instrument === 'guitar' ? '(guitarra: octava escrita)' : ''}. Colores = función de cada nota sobre el acorde.</p>
                  <TimeStaff notes={(report?.annotated ?? []).map((a) => ({ pitch: t.pitch(a.pitch), start: a.start, dur: a.dur, role: a.role, label: a.degree }))} chords={events.map((e, i) => ({ start: events.slice(0, i).reduce((s, x) => s + x.beats, 0), beats: e.beats, symbol: t.chordName(e.chord) }))} totalBeats={Math.max(4, total)} firstBarNumber={selBars[0] + 1} />
                </>
              ) : <p className="muted">No se detectaron notas claras en ese fragmento y registro. Prueba con la pista separada o con otro instrumento.</p>)}
            </Card>
          )}

          {report && (
            <Card title="7 · ¿Qué está tocando? Explicación del solo" className="accent">
              <SoloExplanation report={report} onJump={jumpBar} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}

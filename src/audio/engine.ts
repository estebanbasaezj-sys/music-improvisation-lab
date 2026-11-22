// Motor de audio. Usa muestras reales (MuseScore General, MIT; Salamander Grand Piano, CC-BY 3.0)
// empaquetadas como "sprites" mp3 en /samples. Mientras cargan (o si fallan) se usa síntesis.
// Opcionalmente envía MIDI a un sintetizador/plugin externo (Web MIDI API).
import * as Tone from 'tone';
import { getState } from '../progress/store';
import { isMobile, resumeAudioNow } from './unlock';

export type Voice = 'piano' | 'guitar' | 'sax' | 'bass' | 'rhodes';
export type Bus = 'melody' | 'comp' | 'bass' | 'drums';
export type DrumHit =
  | 'kick_soft' | 'kick' | 'snare_ghost' | 'snare' | 'stick' | 'hh_pedal' | 'hh_closed' | 'hh_open'
  | 'ride_soft' | 'ride' | 'ride_hard' | 'ride_bell' | 'crash'
  | 'brush_tap_soft' | 'brush_tap' | 'brush_slap' | 'brush_swirl';

// ---------------- estado de carga (observable por la UI) ----------------
export interface SoundStatus { state: 'idle' | 'loading' | 'ready' | 'error'; loaded: number; total: number; error?: string }
let status: SoundStatus = { state: 'idle', loaded: 0, total: 0 };
const statusListeners = new Set<() => void>();
const setStatus = (s: Partial<SoundStatus>) => { status = { ...status, ...s }; statusListeners.forEach((l) => l()); };
export const getSoundStatus = () => status;
export const subscribeSound = (l: () => void) => { statusListeners.add(l); return () => statusListeners.delete(l); };

// ---------------- mezcla ----------------
const mtof = (m: number) => Tone.Frequency(m, 'midi').toFrequency();

class Mixer {
  limiter = new Tone.Limiter(-1).toDestination();
  comp = new Tone.Compressor({ threshold: -18, ratio: 2.5, attack: 0.01, release: 0.2 }).connect(this.limiter);
  master = new Tone.Volume(-2).connect(this.comp);
  reverb = new Tone.Reverb({ decay: 2.4, preDelay: 0.02, wet: 1 }).connect(this.master);
  buses: Record<Bus, Tone.Volume> = {
    melody: new Tone.Volume(0).connect(this.master),
    comp: new Tone.Volume(-5).connect(this.master),
    bass: new Tone.Volume(-2).connect(this.master),
    drums: new Tone.Volume(-6).connect(this.master),
  };
  sends: Record<Bus, Tone.Gain> = {
    melody: new Tone.Gain(0.22).connect(this.reverb),
    comp: new Tone.Gain(0.18).connect(this.reverb),
    bass: new Tone.Gain(0.04).connect(this.reverb),
    drums: new Tone.Gain(0.1).connect(this.reverb),
  };
  constructor() {
    (Object.keys(this.buses) as Bus[]).forEach((b) => this.buses[b].connect(this.sends[b]));
  }
}

// ---------------- síntesis de respaldo ----------------
class SynthFallback {
  piano: Tone.PolySynth;
  sax: Tone.MonoSynth;
  bass: Tone.MonoSynth;
  guitar: Tone.PolySynth;
  click: Tone.Synth;
  noise: Tone.NoiseSynth;
  kick: Tone.MembraneSynth;
  constructor(mx: Mixer) {
    this.piano = new Tone.PolySynth(Tone.FMSynth, { harmonicity: 2.01, modulationIndex: 1.4, envelope: { attack: 0.004, decay: 1.2, sustain: 0.1, release: 0.8 }, volume: -10 }).connect(mx.buses.comp);
    this.guitar = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.003, decay: 0.8, sustain: 0.05, release: 0.5 }, volume: -10 }).connect(mx.buses.comp);
    this.sax = new Tone.MonoSynth({ oscillator: { type: 'sawtooth' }, filter: { type: 'lowpass', Q: 1.5 }, envelope: { attack: 0.04, sustain: 0.8, release: 0.12 }, filterEnvelope: { baseFrequency: 500, octaves: 2.4 }, volume: -16 }).connect(mx.buses.melody);
    this.bass = new Tone.MonoSynth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.4, sustain: 0.3, release: 0.15 }, filterEnvelope: { baseFrequency: 180, octaves: 2 }, volume: -6 }).connect(mx.buses.bass);
    this.click = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 }, volume: -12 }).connect(mx.master);
    this.noise = new Tone.NoiseSynth({ envelope: { attack: 0.001, decay: 0.08, sustain: 0 }, volume: -28 }).connect(mx.buses.drums);
    this.kick = new Tone.MembraneSynth({ envelope: { attack: 0.001, decay: 0.25, sustain: 0 }, volume: -14 }).connect(mx.buses.drums);
  }
}

// ---------------- muestras ----------------
interface Manifest {
  license: Record<string, string>;
  instruments: Record<string, { file: string; slotSec: number; slots: { midi: number; vel: number; id?: string }[] }>;
}

const RELEASE: Record<string, number> = { piano: 1.0, rhodes: 0.7, guitar: 0.5, tenor: 0.12, alto: 0.12, bass: 0.25 };
const SAMPLE_BUS: Record<string, Bus> = { piano: 'comp', rhodes: 'comp', guitar: 'comp', tenor: 'melody', alto: 'melody', bass: 'bass' };

class SampleBank {
  samplers: Record<string, Tone.Sampler> = {};
  drums: Partial<Record<string, Record<string, Tone.ToneAudioBuffer>>> = {};
  license: Record<string, string> = {};
}

let mixer: Mixer | null = null;
let synth: SynthFallback | null = null;
const bank = new SampleBank();
let started: Promise<void> | null = null;
let loadPromise: Promise<void> | null = null;

function ensureGraph() {
  if (!mixer) {
    mixer = new Mixer();
    synth = new SynthFallback(mixer);
  }
  return mixer;
}

/** Recorta cada ranura del sprite desde su ataque real (independiente del retardo del códec mp3).
 *  Con `mono` mezcla los canales en uno: en celulares la mitad de memoria (los teléfonos modestos cerraban
 *  la página al decodificar todas las muestras en estéreo). */
function sliceSprite(buf: AudioBuffer, slotSec: number, count: number, mono = false): AudioBuffer[] {
  const ctx = Tone.getContext().rawContext as BaseAudioContext;
  const sr = buf.sampleRate;
  const slotLen = Math.floor(slotSec * sr);
  const ch0 = buf.getChannelData(0);
  const chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
  const outCh = mono ? 1 : buf.numberOfChannels;
  const out: AudioBuffer[] = [];
  for (let i = 0; i < count; i++) {
    const s0 = i * slotLen;
    const s1 = Math.min(buf.length, s0 + slotLen);
    let peak = 0;
    for (let j = s0; j < s1; j++) peak = Math.max(peak, Math.abs(ch0[j]));
    let on = s0;
    const thr = peak * 0.02;
    while (on < s1 && Math.abs(ch0[on]) < thr) on++;
    on = Math.max(s0, on - Math.floor(0.002 * sr));
    const len = Math.max(1, s1 - on - Math.floor(0.01 * sr));
    const b = ctx.createBuffer(outCh, len, sr);
    for (let c = 0; c < outCh; c++) {
      const dst = b.getChannelData(c);
      if (mono && chans.length > 1) {
        for (let k = 0; k < len; k++) { let v = 0; for (const ch of chans) v += ch[on + k]; dst[k] = v / chans.length; }
      } else dst.set(chans[c].subarray(on, on + len));
      // normalización suave por ranura (evita saltos de volumen entre notas)
      const g = peak > 0 ? Math.min(4, 0.6 / peak) : 1;
      const fade = Math.floor(0.03 * sr);
      for (let k = 0; k < len; k++) dst[k] *= g * (k > len - fade ? (len - k) / fade : 1);
    }
    out.push(b);
  }
  return out;
}

/** Descarga y prepara las muestras (puede llamarse antes del primer gesto del usuario). */
export function loadSamples(base = './samples/'): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const mx = ensureGraph();
      setStatus({ state: 'loading', loaded: 0 });
      const man: Manifest = await (await fetch(base + 'manifest.json')).json();
      bank.license = man.license;
      // primero lo que se usa enseguida (tu instrumento y la base), de a uno: decodificar todo a la vez
      // duplicaba el pico de memoria y en celulares la página se cerraba
      const st = getState();
      const mine = st.instrument === 'sax' ? st.settings.saxType : st.instrument;
      const order = [mine, 'piano', 'bass', 'drums_jazz'];
      const rank = (n: string) => { const i = order.indexOf(n); return i < 0 ? order.length : i; };
      const entries = Object.entries(man.instruments).sort((a, b) => rank(a[0]) - rank(b[0]));
      const mono = isMobile();
      setStatus({ total: entries.length });
      let done = 0;
      // las descargas van en paralelo (son mp3 livianos); la decodificación, de a una
      const downloads = entries.map(([, ins]) => fetch(base + ins.file).then((r) => { if (!r.ok) throw new Error(`${ins.file}: ${r.status}`); return r.arrayBuffer(); }));
      downloads.forEach((d) => d.catch(() => undefined));
      let failed = 0;
      const loadOne = async ([name, ins]: [string, Manifest['instruments'][string]], k: number) => {
        const arr = await downloads[k];
        const decoded = await Tone.getContext().rawContext.decodeAudioData(arr);
        const parts = sliceSprite(decoded, ins.slotSec, ins.slots.length, mono);
        if (name.startsWith('drums')) {
          const kit: Record<string, Tone.ToneAudioBuffer> = {};
          ins.slots.forEach((s, i) => { kit[s.id ?? String(s.midi)] = new Tone.ToneAudioBuffer(parts[i]); });
          bank.drums[name] = kit;
        } else {
          const urls: Record<string, Tone.ToneAudioBuffer> = {};
          ins.slots.forEach((s, i) => { urls[Tone.Frequency(s.midi, 'midi').toNote()] = new Tone.ToneAudioBuffer(parts[i]); });
          bank.samplers[name] = new Tone.Sampler({ urls, release: RELEASE[name] ?? 0.4, volume: name === 'bass' ? 0 : -2 }).connect(mx.buses[SAMPLE_BUS[name] ?? 'comp']);
        }
        done++;
        setStatus({ loaded: done });
      };
      for (let k = 0; k < entries.length; k++) {
        // si falla un instrumento, ese sigue con síntesis y los demás cargan igual
        try { await loadOne(entries[k], k); } catch { failed++; }
      }
      if (failed === entries.length) throw new Error('No se pudieron cargar las muestras de sonido');
      setStatus({ state: 'ready' });
    } catch (e) {
      setStatus({ state: 'error', error: (e as Error).message });
    }
  })();
  return loadPromise;
}

export const sampleLicenses = () => bank.license;

/** Debe llamarse desde un gesto del usuario (requisito de los navegadores). */
export async function ensureAudio(): Promise<void> {
  // síncrono, antes de cualquier espera: así cuenta como parte del toque (iPhone lo exige)
  resumeAudioNow();
  if (!started) {
    started = (async () => {
      const mx = ensureGraph();
      await mx.reverb.ready;
      void loadSamples();
    })();
  }
  await started;
  if (Tone.getContext().state !== 'running') {
    // fuera de un toque el navegador no deja reanudar: se espera un momento y se sigue (el siguiente toque
    // en la página lo reanuda; antes la app quedaba esperando para siempre y no volvía a sonar)
    await Promise.race([Tone.start().catch(() => undefined), new Promise((r) => setTimeout(r, 1200))]);
  }
}
export const audioReady = () => !!mixer;

export function setBusVolume(bus: Bus, db: number) { ensureGraph().buses[bus].volume.rampTo(db, 0.05); }
export function setMasterVolume(db: number) { ensureGraph().master.volume.rampTo(db, 0.05); }

// ---------------- MIDI externo (plugins) ----------------
const GM_DRUM: Record<DrumHit, number> = {
  kick_soft: 36, kick: 36, snare_ghost: 38, snare: 38, stick: 37, hh_pedal: 44, hh_closed: 42, hh_open: 46,
  ride_soft: 51, ride: 51, ride_hard: 51, ride_bell: 53, crash: 49, brush_tap_soft: 38, brush_tap: 38, brush_slap: 39, brush_swirl: 40,
};
const MIDI_CH: Record<Bus, number> = { melody: 0, comp: 1, bass: 2, drums: 9 };
let midiOut: MIDIOutput | null = null;
let midiOnly = false;
export async function listMidiOutputs(): Promise<{ id: string; name: string }[]> {
  if (!('requestMIDIAccess' in navigator)) throw new Error('Este navegador no soporta Web MIDI (usa Chrome o Edge).');
  const acc = await navigator.requestMIDIAccess();
  return Array.from(acc.outputs.values()).map((o) => ({ id: o.id, name: o.name ?? o.id }));
}
export async function setMidiOutput(id: string | null, only = false) {
  midiOnly = only && !!id;
  if (!id) { midiOut = null; return; }
  const acc = await navigator.requestMIDIAccess();
  midiOut = acc.outputs.get(id) ?? null;
}
function sendMidi(bus: Bus, midis: number[], durSec: number, time: number, vel: number) {
  if (!midiOut) return;
  const ch = MIDI_CH[bus];
  const at = performance.now() + Math.max(0, (time - Tone.now()) * 1000);
  const v = Math.max(1, Math.min(127, Math.round(vel * 127)));
  for (const m of midis) {
    midiOut.send([0x90 | ch, m, v], at);
    midiOut.send([0x80 | ch, m, 0], at + durSec * 1000);
  }
}

// ---------------- disparo de notas ----------------
const voiceBus = (v: Voice, role: 'melody' | 'comp'): Bus => (v === 'bass' ? 'bass' : role);
let guitarFallback = 0;

/** Toca notas (MIDI). `role` decide el canal de mezcla: melodía (lo que tocas tú) o acompañamiento. */
export function triggerNotes(voice: Voice, midis: number[], durSec: number, time?: number, velocity = 0.8, role: 'melody' | 'comp' = 'melody') {
  const mx = mixer;
  if (!mx || !synth || !midis.length) return;
  const t = time ?? Tone.now() + 0.03;
  markBusy(t, durSec);
  const bus = voiceBus(voice, role);
  sendMidi(bus, midis, durSec, t, velocity);
  if (midiOnly) return;
  const sampleName = voice === 'sax' ? getState().settings.saxType : voice;
  const s = bank.samplers[sampleName];
  if (s) {
    // el sampler queda conectado a su canal por defecto; para melodía de piano/guitarra lo reenviamos
    const freqs = midis.map(mtof);
    if (voice === 'guitar' && midis.length > 1) freqs.forEach((f, k) => s.triggerAttackRelease(f, durSec, t + k * 0.014, velocity));
    else s.triggerAttackRelease(freqs, durSec, t, velocity);
    return;
  }
  // respaldo sintético
  switch (voice) {
    case 'piano': case 'rhodes': synth.piano.triggerAttackRelease(midis.map(mtof), durSec, t, velocity); break;
    case 'guitar': midis.forEach((m, k) => synth!.guitar.triggerAttackRelease(mtof(m), durSec, t + k * 0.014, velocity)); guitarFallback++; break;
    case 'sax': synth.sax.triggerAttackRelease(mtof(midis[0]), durSec, t, velocity); break;
    case 'bass': synth.bass.triggerAttackRelease(mtof(midis[0]), durSec, t, velocity); break;
  }
}

export function triggerDrum(hit: DrumHit, time: number, velocity = 0.8, kit: 'jazz' | 'brush' = 'jazz') {
  const mx = mixer;
  if (!mx) return;
  sendMidi('drums', [GM_DRUM[hit]], 0.1, time, velocity);
  markBusy(time, 0.2);
  if (midiOnly) return;
  const k = bank.drums[kit === 'brush' ? 'drums_brush' : 'drums_jazz'];
  const buf = k?.[hit] ?? bank.drums.drums_jazz?.[hit] ?? bank.drums.drums_jazz?.[hit.replace('brush_tap', 'snare_ghost')];
  if (buf) {
    const g = new Tone.Gain(velocity * 1.1).connect(mx.buses.drums);
    const src = new Tone.ToneBufferSource(buf).connect(g);
    drumSources.add(src);
    src.onended = () => { drumSources.delete(src); src.dispose(); g.dispose(); };
    src.start(time);
    return;
  }
  if (!synth) return;
  if (hit.startsWith('kick')) synth.kick.triggerAttackRelease('C1', 0.1, time, velocity);
  else synth.noise.triggerAttackRelease('32n', time, velocity * 0.6);
}

// clic de metrónomo: un «bip» corto generado una vez y reproducido como buffer, para que cada clic
// agendado pueda cancelarse (al volver a escuchar o con «Detener audio")
const clickBufs: { hi?: Tone.ToneAudioBuffer; lo?: Tone.ToneAudioBuffer } = {};
function makeClick(freq: number) {
  const ctx = Tone.getContext().rawContext as BaseAudioContext;
  const sr = ctx.sampleRate;
  const n = Math.floor(sr * 0.05);
  const b = ctx.createBuffer(1, n, sr);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) { const t = i / sr; d[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 85) * 0.9; }
  return new Tone.ToneAudioBuffer(b);
}
export function click(time: number, accent: boolean) {
  const mx = mixer;
  if (!mx) return;
  markBusy(time, 0.05);
  const buf = accent ? (clickBufs.hi ??= makeClick(1760)) : (clickBufs.lo ??= makeClick(1320));
  const g = new Tone.Gain(accent ? 0.55 : 0.36).connect(mx.master);
  const src = new Tone.ToneBufferSource(buf).connect(g);
  drumSources.add(src);
  src.onended = () => { drumSources.delete(src); src.dispose(); g.dispose(); };
  src.start(time);
}

/** Cancela golpes y clics ya agendados (sin tocar acompañamientos), p.ej. al volver a pulsar «Escuchar». */
export function cancelScheduled() {
  drumSources.forEach((src) => { try { src.stop(); } catch { /* ya parado */ } });
  drumSources.clear();
  Object.values(bank.samplers).forEach((s) => s.releaseAll());
}
/** Espera a que terminen de cargar las muestras (como mucho `ms`). */
export async function waitSamples(ms = 3000) {
  if (!loadPromise) return;
  await Promise.race([loadPromise, new Promise((r) => setTimeout(r, ms))]);
}
export const drumsLoaded = () => !!bank.drums.drums_jazz;

export interface NoteEvent {
  midi: number | number[];
  start: number; // en tiempos (negras)
  dur: number; // en tiempos
}

let seqTimers: number[] = [];
let seqEndTimer: number | null = null;

export function stopSequence() {
  seqTimers.forEach((t) => clearTimeout(t));
  seqTimers = [];
  if (seqEndTimer) clearTimeout(seqEndTimer);
  seqEndTimer = null;
  Object.values(bank.samplers).forEach((s) => s.releaseAll());
  synth?.sax.triggerRelease();
  endActivity('seq');
}

// ---------------- actividad global: botón «Detener audio» ----------------
// Todo lo que suena más de un instante se registra aquí con su función de parada. El botón flotante
// aparece mientras haya algo registrado (o notas agendadas a futuro) y `stopAllAudio` lo detiene todo.
const activity = new Map<string, () => void>();
const activityLabel = new Map<string, string>();
const DEFAULT_LABEL: Record<string, string> = { seq: 'Frase o ejemplo', transport: 'Acompañamiento', studio: 'Estudio: audio cargado' };
const activitySubs = new Set<() => void>();
const drumSources = new Set<Tone.ToneBufferSource>();
let busyUntil = 0;
const notifyActivity = () => activitySubs.forEach((f) => f());
function markBusy(t: number, dur: number) {
  // solo cuenta lo agendado a futuro (secuencias, demostraciones); un clic en una nota no muestra el botón
  if (!mixer || t - Tone.now() < 0.4) return;
  const was = busyUntil > Tone.now();
  busyUntil = Math.max(busyUntil, t + dur);
  if (!was) notifyActivity();
}
/**
 * Registra algo que está sonando, con un nombre para la barra «Sonando ahora». Si ya había algo con el mismo
 * id (p. ej. otro acompañamiento) lo para antes. El video de YouTube y el audio de la app no suenan a la vez:
 * iniciar uno pausa el otro.
 */
export function registerActivity(id: string, stop: () => void, label?: string) {
  const prev = activity.get(id);
  activity.delete(id);
  if (prev && prev !== stop) { try { prev(); } catch { /* ya parado */ } }
  const isVideo = id.startsWith('yt-');
  for (const [k, f] of [...activity]) {
    if (k.startsWith('yt-') !== isVideo) { activity.delete(k); activityLabel.delete(k); try { f(); } catch { /* ya parado */ } }
  }
  activity.set(id, stop);
  activityLabel.set(id, label ?? DEFAULT_LABEL[id] ?? 'Audio');
  notifyActivity();
}
export function setActivityLabel(id: string, label: string) {
  if (activity.has(id)) { activityLabel.set(id, label); notifyActivity(); }
}
export function endActivity(id: string) {
  activityLabel.delete(id);
  if (activity.delete(id)) notifyActivity();
}
/** Nombres de lo que suena ahora (para la barra «Sonando ahora»). */
export function activityLabels(): string[] {
  const out = [...activityLabel.values()];
  if (!out.length && mixer && busyUntil > Tone.now()) out.push('Ejemplo de audio');
  return out;
}
export function isAudioActive() {
  return activity.size > 0 || (!!mixer && busyUntil > Tone.now());
}
export function subscribeActivity(f: () => void) {
  activitySubs.add(f);
  return () => { activitySubs.delete(f); };
}
export const STOP_ALL_EVENT = 'mil:stopall';
/** Detiene absolutamente todo lo que suena (acompañamientos, frases, metrónomo, estudio, demostraciones). */
export function stopAllAudio() {
  const fns = [...activity.values()];
  activity.clear();
  activityLabel.clear();
  fns.forEach((f) => { try { f(); } catch { /* ignorar */ } });
  stopSequence();
  const tr = Tone.getTransport();
  tr.stop();
  tr.cancel();
  Object.values(bank.samplers).forEach((s) => s.releaseAll());
  drumSources.forEach((src) => { try { src.stop(); } catch { /* ya parado */ } });
  drumSources.clear();
  if (synth) { synth.sax.triggerRelease(); synth.bass.triggerRelease(); synth.piano.releaseAll(); synth.guitar.releaseAll(); }
  if (midiOut) for (let ch = 0; ch < 16; ch++) midiOut.send([0xb0 | ch, 123, 0]);
  busyUntil = 0;
  window.dispatchEvent(new Event(STOP_ALL_EVENT));
  notifyActivity();
}

/** Mezcla global (capas activas y sonido de teclado), leída en vivo en cada nota del acompañamiento. */
export function getMix() {
  const s = getState().sound;
  return { layers: s.layers, keys: s.keys };
}

/** Proporción del swing según el tempo: tresillo a tempo lento/medio, más recto a tempo rápido. */
export function swingRatio(bpm: number) {
  if (bpm <= 140) return 2 / 3;
  if (bpm >= 240) return 0.57;
  return 2 / 3 - ((bpm - 140) / 100) * (2 / 3 - 0.57);
}
export function swingBeat(b: number, ratio = 2 / 3): number {
  const whole = Math.floor(b + 1e-9);
  const frac = b - whole;
  if (Math.abs(frac - 0.5) < 1e-6) return whole + ratio;
  return b;
}

/** Tiempos (enteros) que contienen semicorcheas: allí no se aplica swing. */
export function sixteenthBeats(starts: number[]): Set<number> {
  const out = new Set<number>();
  for (const b of starts) { const f = b - Math.floor(b + 1e-9); if (Math.abs(f - 0.25) < 1e-6 || Math.abs(f - 0.75) < 1e-6) out.add(Math.floor(b + 1e-9)); }
  return out;
}

/** Reproduce una secuencia de notas fuera del transporte (escalas, arpegios, frases). */
export async function playSequence(
  voice: Voice,
  events: NoteEvent[],
  bpm: number,
  opts: { swing?: boolean; onNote?: (index: number) => void; onEnd?: () => void; label?: string } = {}
) {
  await ensureAudio();
  stopSequence();
  registerActivity('seq', () => { stopSequence(); opts.onEnd?.(); }, opts.label);
  const spb = 60 / bpm;
  const t0 = Tone.now() + 0.08;
  const r = swingRatio(bpm);
  const straight = sixteenthBeats(events.map((e) => e.start));
  const sw = (b: number) => (opts.swing && !straight.has(Math.floor(b + 1e-9)) ? swingBeat(b, r) : b);
  let end = 0;
  events.forEach((e, idx) => {
    const start = sw(e.start);
    const stop = sw(e.start + e.dur);
    const ms = Array.isArray(e.midi) ? e.midi : [e.midi];
    const dur = Math.max(0.06, (stop - start) * spb * (voice === 'sax' ? 0.95 : 1));
    // acento natural: notas a contratiempo un poco más fuertes en swing (como un saxofonista)
    const vel = opts.swing && Math.abs(e.start % 1 - 0.5) < 1e-6 ? 0.85 : 0.75;
    triggerNotes(voice, ms, dur, t0 + start * spb, vel, 'melody');
    end = Math.max(end, stop);
    if (opts.onNote) seqTimers.push(window.setTimeout(() => opts.onNote!(idx), (start * spb + 0.08) * 1000));
  });
  seqEndTimer = window.setTimeout(() => { seqEndTimer = null; endActivity('seq'); opts.onEnd?.(); }, (end * spb + 0.3) * 1000);
}

export { Tone };

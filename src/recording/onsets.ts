// Detector de golpes (palmas, percusión con las manos, golpes en la mesa) por micrófono.
// Trabaja sobre el mismo AudioContext que el motor de audio, así que los instantes que reporta están en
// el mismo reloj que los clics agendados y se pueden comparar directamente con la partitura rítmica.
//
// Para poder escuchar el metrónomo SIN auriculares, el detector conoce los instantes de cada clic:
// durante la cuenta mide qué tan fuerte llega el clic al micrófono (calibración) y, mientras suena el
// ritmo, en la ventana de cada clic solo acepta golpes claramente más fuertes que ese clic.
import { Tone } from '../audio/engine';

export interface ClapEvent { time: number; level: number }

/** Núcleo del detector (sin Web Audio, para poder probarlo): recibe bloques de muestras ya filtradas. */
export class ClapDetector {
  private floor = 1e-5;
  private prev = 0;
  private last = -1;
  private clicks: { from: number; to: number; calib: boolean }[] = [];
  private clickE = 0;
  constructor(private onClap: (e: ClapEvent) => void, private inputLatency = 0.015) {}

  /** `blockEnd`: instante (reloj del AudioContext) en que termina el bloque capturado. Devuelve el pico de energía. */
  process(x: Float32Array, blockEnd: number, sr: number): number {
    const N = x.length;
    const HOP = 128;
    let peak = 0;
    for (let i = 0; i + HOP <= N; i += HOP) {
      let e = 0;
      for (let j = i; j < i + HOP; j++) e += x[j] * x[j];
      e /= HOP;
      peak = Math.max(peak, e);
      const t = blockEnd - (N - i) / sr - this.inputLatency;
      const win = this.clicks.find((c) => t >= c.from && t <= c.to);
      if (win?.calib) { this.clickE = Math.max(this.clickE, e); this.prev = e; continue; }
      let th = Math.max(0.0012, this.floor * 9);
      if (win) th = Math.max(th, this.clickE * 2.5); // en la ventana de un clic, exigir un golpe más fuerte que el clic
      if (e > th && e > this.prev * 2.2 && t - this.last > 0.11) {
        this.last = t;
        this.onClap({ time: t, level: Math.sqrt(e) });
      }
      // nivel de fondo: se adapta despacio y no aprende de los golpes ni de los clics
      if (e < th && !win) this.floor = this.floor * 0.995 + e * 0.005;
      this.prev = e;
    }
    return peak;
  }

  /**
   * Informa de los clics agendados (instantes del AudioContext). Los de la cuenta sirven para calibrar;
   * `outLat` es la latencia de salida (el clic se oye y se capta un poco después de agendarse).
   */
  setClicks(countIn: number[], pulse: number[], outLat: number) {
    const w = (t: number, calib: boolean) => ({ from: t + outLat - 0.015, to: t + outLat + 0.09, calib });
    this.clickE = 0;
    this.clicks = [...countIn.map((t) => w(t, true)), ...pulse.map((t) => w(t, false))];
  }
}

export class ClapListener {
  private stream: MediaStream | null = null;
  private nodes: AudioNode[] = [];
  private det: ClapDetector | null = null;
  active = false;

  async start(onClap: (e: ClapEvent) => void, onLevel?: (rms: number) => void) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const ctx = Tone.getContext().rawContext as AudioContext;
    if (ctx.state !== 'running') await ctx.resume().catch(() => undefined);
    const track = this.stream.getAudioTracks()[0];
    const lat = (track?.getSettings() as MediaTrackSettings & { latency?: number })?.latency;
    this.det = new ClapDetector(onClap, typeof lat === 'number' && lat > 0 && lat < 0.2 ? lat : 0.015);
    const src = ctx.createMediaStreamSource(this.stream);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1100; // las palmas son ricas en agudos; así se ignora gran parte del bajo y la voz
    const sp = ctx.createScriptProcessor(512, 1, 1);
    const mute = ctx.createGain();
    mute.gain.value = 0;
    src.connect(hp); hp.connect(sp); sp.connect(mute); mute.connect(ctx.destination);
    this.nodes = [src, hp, sp, mute];
    this.active = true;
    sp.onaudioprocess = (ev) => {
      // el bloque recién capturado termina aproximadamente en el instante actual del contexto
      const peak = this.det!.process(ev.inputBuffer.getChannelData(0), ctx.currentTime, ctx.sampleRate);
      onLevel?.(Math.sqrt(peak));
    };
  }

  setClicks(countIn: number[], pulse: number[], outLat: number) {
    this.det?.setClicks(countIn, pulse, outLat);
  }

  stop() {
    this.active = false;
    this.nodes.forEach((n) => { try { n.disconnect(); } catch { /* ya desconectado */ } });
    const sp = this.nodes[2] as ScriptProcessorNode | undefined;
    if (sp) sp.onaudioprocess = null;
    this.nodes = [];
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}

// Detector de golpes (palmas, percusión con las manos, golpes en la mesa) por micrófono.
// Trabaja sobre el mismo AudioContext que el motor de audio, así que los instantes que reporta están en
// el mismo reloj que los clics agendados y se pueden comparar directamente con la partitura rítmica.
import { Tone } from '../audio/engine';

export interface ClapEvent { time: number; level: number }

/** Detección de ataques por energía (filtro paso alto + umbral adaptativo + tiempo de rebote). */
export class ClapListener {
  private stream: MediaStream | null = null;
  private nodes: AudioNode[] = [];
  private floor = 1e-5;
  private prev = 0;
  private last = -1;
  private inputLatency = 0.015;

  async start(onClap: (e: ClapEvent) => void, onLevel?: (rms: number) => void) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const ctx = Tone.getContext().rawContext as AudioContext;
    const track = this.stream.getAudioTracks()[0];
    const lat = (track?.getSettings() as MediaTrackSettings & { latency?: number })?.latency;
    if (typeof lat === 'number' && lat > 0 && lat < 0.2) this.inputLatency = lat;
    const src = ctx.createMediaStreamSource(this.stream);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1100; // las palmas son ricas en agudos; así se ignora gran parte del bajo y la voz
    const N = 512;
    const sp = ctx.createScriptProcessor(N, 1, 1);
    const mute = ctx.createGain();
    mute.gain.value = 0;
    src.connect(hp); hp.connect(sp); sp.connect(mute); mute.connect(ctx.destination);
    this.nodes = [src, hp, sp, mute];
    const sr = ctx.sampleRate;
    const HOP = 128;
    sp.onaudioprocess = (ev) => {
      const x = ev.inputBuffer.getChannelData(0);
      const blockEnd = ctx.currentTime; // el bloque recién capturado termina aproximadamente ahora
      let peak = 0;
      for (let i = 0; i < N; i += HOP) {
        let e = 0;
        for (let j = i; j < i + HOP; j++) e += x[j] * x[j];
        e /= HOP;
        peak = Math.max(peak, e);
        const t = blockEnd - (N - i) / sr - this.inputLatency;
        const th = Math.max(0.0012, this.floor * 9);
        if (e > th && e > this.prev * 2.2 && t - this.last > 0.11) {
          this.last = t;
          onClap({ time: t, level: Math.sqrt(e) });
        }
        // nivel de fondo: se adapta despacio y no aprende de los golpes
        if (e < th) this.floor = this.floor * 0.995 + e * 0.005;
        this.prev = e;
      }
      onLevel?.(Math.sqrt(peak));
    };
  }

  stop() {
    this.nodes.forEach((n) => { try { n.disconnect(); } catch { /* ya desconectado */ } });
    const sp = this.nodes[2] as ScriptProcessorNode | undefined;
    if (sp) sp.onaudioprocess = null;
    this.nodes = [];
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}

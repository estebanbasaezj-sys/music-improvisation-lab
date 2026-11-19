// Separación de instrumentos con IA en el navegador.
// Modelo: SCNet (Tong et al., ICASSP 2024; pesos con licencia MIT) exportado a ONNX por @audio/neural-separate.
// Se descarga una sola vez desde Hugging Face (≈13 MB, comprobado por SHA-256) y queda en la caché del navegador.
// Separa cuatro pistas: voz/instrumento solista («vocals»), batería, bajo y el resto (piano, guitarra…).
import type { SepMessage, SepRequest } from './worker';

export type StemName = 'vocals' | 'drums' | 'bass' | 'other';
export const STEM_LABEL: Record<StemName, string> = { vocals: 'Voz / solista', drums: 'Batería', bass: 'Bajo', other: 'Piano, guitarra y resto' };

export interface SepProgress { phase: 'model' | 'run'; p: number; device: 'webgpu' | 'wasm' }

/** ¿Hay una GPU utilizable por WebGPU (no la emulación por CPU)? */
export async function hasWebGPU(): Promise<boolean> {
  try {
    type Adapter = { info?: { isFallbackAdapter?: boolean; architecture?: string } };
    const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<Adapter | null> } }).gpu;
    const a = await gpu?.requestAdapter();
    return !!a && !a.info?.isFallbackAdapter && a.info?.architecture !== 'swiftshader';
  } catch { return false; }
}

/** Estimación del tiempo de cálculo (segundos) según el dispositivo. */
export const estimateSeconds = (durSec: number, device: 'webgpu' | 'wasm') => Math.round(durSec * (device === 'webgpu' ? 1.5 : 6));

// Solo para pruebas automáticas: permite usar otro modelo/pesos servidos localmente.
const testOverride = () => (globalThis as { __SEP_TEST__?: { model: string; weights: string } }).__SEP_TEST__;

let seq = 0;

/**
 * Separa el fragmento [from, to) de `buf`. Devuelve un AudioBuffer por pista, de la duración del fragmento.
 * `signal` permite cancelar (termina el worker).
 */
export async function separateAudio(buf: AudioBuffer, from: number, to: number, ctx: BaseAudioContext, opts: { onProgress?: (p: SepProgress) => void; signal?: AbortSignal; device?: 'webgpu' | 'wasm' } = {}): Promise<Record<StemName, AudioBuffer>> {
  const sr = buf.sampleRate;
  const a = Math.max(0, Math.floor(from * sr));
  const b = Math.min(buf.length, Math.ceil(to * sr));
  const ch = (i: number) => buf.getChannelData(Math.min(i, buf.numberOfChannels - 1)).slice(a, b);
  const device = opts.device ?? ((await hasWebGPU()) ? 'webgpu' : 'wasm');
  const run = (dev: 'webgpu' | 'wasm') => new Promise<Record<string, Float32Array[]>>((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    const id = ++seq;
    const t = testOverride();
    const req: SepRequest = { id, channels: [ch(0), ch(1)], sampleRate: sr, model: t?.model ?? 'scnet', device: dev, weights: t?.weights };
    let started = false;
    opts.onProgress?.({ phase: 'model', p: 0, device: dev });
    const abort = () => { worker.terminate(); reject(new DOMException('Cancelado', 'AbortError')); };
    opts.signal?.addEventListener('abort', abort, { once: true });
    worker.onmessage = (e: MessageEvent<SepMessage>) => {
      const m = e.data;
      if (m.id !== id) return;
      if (m.type === 'progress') { started = true; opts.onProgress?.({ phase: 'run', p: m.p, device: dev }); }
      else if (m.type === 'done') { opts.signal?.removeEventListener('abort', abort); worker.terminate(); resolve(m.stems); }
      else { opts.signal?.removeEventListener('abort', abort); worker.terminate(); reject(new Error(m.message + (started ? '' : ' (al cargar el modelo)'))); }
    };
    worker.onerror = (e) => { worker.terminate(); reject(new Error(e.message || 'Error en el proceso de separación')); };
    worker.postMessage(req, req.channels.map((c) => c.buffer));
  });
  let stems: Record<string, Float32Array[]>;
  try {
    stems = await run(device);
  } catch (e) {
    if ((e as DOMException).name === 'AbortError' || device === 'wasm') throw e;
    stems = await run('wasm'); // la GPU falló (memoria, controlador): repetir en CPU
  }
  const out = {} as Record<StemName, AudioBuffer>;
  for (const [name, chans] of Object.entries(stems)) {
    const ab = ctx.createBuffer(chans.length, chans[0].length, sr);
    chans.forEach((c, i) => ab.getChannelData(i).set(c));
    out[name as StemName] = ab;
  }
  return out;
}

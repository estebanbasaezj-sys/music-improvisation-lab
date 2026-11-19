// Web Worker: separa un fragmento de audio en pistas (stems) con @audio/neural-separate (ONNX Runtime Web).
// Corre fuera del hilo principal para que la interfaz siga respondiendo durante varios minutos de cálculo.
import separate from '@audio/neural-separate';

export interface SepRequest {
  id: number;
  channels: Float32Array[];
  sampleRate: number;
  model: string;
  device: 'webgpu' | 'wasm';
  weights?: string;
}
export type SepMessage =
  | { id: number; type: 'progress'; p: number }
  | { id: number; type: 'done'; stems: Record<string, Float32Array[]>; sampleRate: number }
  | { id: number; type: 'error'; message: string };

const post = (m: SepMessage, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(m, transfer);

self.onmessage = async (e: MessageEvent<SepRequest>) => {
  const { id, channels, sampleRate, model, device, weights } = e.data;
  try {
    const res = await separate(channels, {
      sampleRate,
      model: model as 'scnet',
      device,
      weights,
      progress: ({ chunk, totalChunks }) => post({ id, type: 'progress', p: chunk / totalChunks }),
    });
    const transfer: Transferable[] = [];
    for (const chs of Object.values(res.stems)) for (const c of chs) transfer.push(c.buffer);
    post({ id, type: 'done', stems: res.stems, sampleRate: res.sampleRate }, transfer);
  } catch (err) {
    post({ id, type: 'error', message: (err as Error)?.message ?? String(err) });
  }
};

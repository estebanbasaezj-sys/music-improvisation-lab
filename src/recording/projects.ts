// Proyectos del Estudio guardados en IndexedDB: el audio original, las pistas separadas (WAV) y los ajustes
// (instrumento, loop, marcas, velocidad, tono, acordes corregidos). Todo queda en este navegador.
import type { Instrument } from '../audio/stems';

export interface StudioProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  source: string; // de dónde vino: archivo, enlace, captura…
  audio: Blob;
  instrument: Instrument;
  loop: [number, number] | null;
  markers: { t: number; label: string }[];
  speed: number;
  semi: number;
  stems?: { from: number; to: number; method: 'ia' | 'centro'; tracks: Record<string, Blob> };
  chordEdits?: Record<number, string>;
}

const DB = 'mil-projects';
const STORE = 'projects';
function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
export const saveProject = (p: StudioProject) => tx('readwrite', (s) => s.put(p));
export const deleteProject = (id: string) => tx('readwrite', (s) => s.delete(id));
export async function listProjects(): Promise<StudioProject[]> {
  const all = await tx<StudioProject[]>('readonly', (s) => s.getAll() as IDBRequest<StudioProject[]>);
  return all.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

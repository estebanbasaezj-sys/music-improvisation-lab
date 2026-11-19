// Grabaciones en IndexedDB (los audios pueden ocupar varios MB; localStorage no sirve).
import { InstrumentId } from '../theory/instruments';

export interface RecordingMeta {
  id: string;
  createdAt: string;
  instrument: InstrumentId;
  title: string;
  context: string; // ejercicio o lección
  durationSec: number;
  notes: string;
  selfEval?: Record<string, number>; // criterio → 1..5 (autoevaluación)
  mimeType: string;
}
export interface Recording extends RecordingMeta {
  blob: Blob;
}

const DB = 'mil-recordings';
const STORE = 'recordings';

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

export const saveRecording = (r: Recording) => tx('readwrite', (s) => s.put(r));
export const deleteRecording = (id: string) => tx('readwrite', (s) => s.delete(id));
export const getAllRecordings = async (): Promise<Recording[]> => {
  const all = await tx<Recording[]>('readonly', (s) => s.getAll() as IDBRequest<Recording[]>);
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
};
export async function updateRecording(id: string, patch: Partial<RecordingMeta>) {
  const all = await getAllRecordings();
  const r = all.find((x) => x.id === id);
  if (r) await saveRecording({ ...r, ...patch });
}

// Profesor IA: usa la capacidad `sample` de los Artifacts de Claude (cuando la app se abre en claude.ai).
import { estimateTokens, timedAi } from '../telemetry/telemetry';
// Fuera de Claude no existe y la UI lo oculta. Toda respuesta musical se VALIDA: se descartan notas
// mal formadas y luego el analizador de la app etiqueta cada nota contra el acorde real.
import { chordSymbol } from '../theory/chords';
import { ChordEvent } from '../theory/progressions';
import { midi as midiOf, parsePitch } from '../theory/notes';
import { LineNote, chordStarts } from '../theory/line';

type SampleFn = ((input: string | { role: 'user' | 'assistant'; content: string }[], opts?: Record<string, unknown>) => Promise<{ text: string; truncated: boolean }>) & {
  json: <T>(input: string, opts?: Record<string, unknown>) => Promise<T>;
};

let samplePromise: Promise<SampleFn | null> | null = null;
export function getSample(): Promise<SampleFn | null> {
  if (!samplePromise) {
    const w = window as unknown as { claude?: { use: (n: string) => Promise<unknown> } };
    samplePromise = w.claude?.use ? (w.claude.use('sample') as Promise<SampleFn | null>).catch(() => null) : Promise.resolve(null);
  }
  return samplePromise;
}

export interface AiError { code: string; message?: string; text?: string }
export function aiErrorText(e: unknown): string {
  const code = (e as AiError)?.code;
  switch (code) {
    case 'not_granted': case 'sampling_disabled': case 'not_declared': case 'capability_disabled': return 'El profesor IA no está permitido en esta vista.';
    case 'rate_limited': return 'Demasiadas consultas seguidas o límite de uso alcanzado. Prueba en un rato.';
    case 'invalid_json': return 'La respuesta no llegó en el formato esperado. Pulsa de nuevo para reintentar.';
    case 'cancelled': return '';
    case 'refused': return 'La IA no pudo responder a esta petición; reformúlala.';
    default: return 'No se pudo contactar con el profesor IA. Reintenta en un momento.';
  }
}

export function progressionText(evts: ChordEvent[]): string {
  const bars: string[][] = [];
  evts.forEach((e) => (bars[e.bar] ??= []).push(`${chordSymbol(e.chord)}${e.beats !== 4 ? ` (${e.beats} tiempos)` : ''}`));
  return bars.map((b, i) => `Compás ${i + 1}: ${(b ?? []).join(', ')}`).join('\n');
}

export interface AiSolo { title: string; summary: string; phrases: { title: string; explanation: string; start: number; end: number }[]; notes: LineNote[]; dropped: number }

interface RawSolo {
  title?: string;
  summary?: string;
  phrases?: { title?: string; explanation?: string; notes?: { pitch?: string; start?: number; dur?: number }[] }[];
}

export async function requestAiSolo(sample: SampleFn, p: {
  events: ChordEvent[]; key: string; style: string; idea: string; level: number; range: { lo: number; hi: number }; extra: string; instrument: string;
}, signal?: AbortSignal): Promise<AiSolo> {
  const total = p.events.reduce((s, e) => s + e.beats, 0);
  const lo = noteOf(p.range.lo);
  const hi = noteOf(p.range.hi);
  const prompt = `Eres un profesor de improvisación de jazz con mucha experiencia. Escribe un solo ORIGINAL de ejemplo (no copies ni transcribas solos grabados de nadie) para que un alumno de ${p.instrument} lo escuche, lo imite y "copie ideas".

Progresión (alturas de concierto, compás de 4/4, ${total / 4} compases, tonalidad ${p.key}):
${progressionText(p.events)}

Estilo: ${p.style}. Nivel del alumno: ${['', 'principiante', 'intermedio', 'avanzado'][p.level]}.
Idea o técnica que debe demostrar el solo: ${p.idea}.
${p.extra ? `Petición del alumno: ${p.extra}\n` : ''}
Reglas musicales:
- Rango de alturas (concierto): de ${lo} a ${hi}.
- Notas del acorde (sobre todo 3ª y 7ª) en tiempos fuertes; cromatismos y notas de paso en tiempos débiles.
- Frases de 1 a 4 compases separadas por silencios; desarrolla y repite ideas.
- Escribe las corcheas rectas (la app aplica el swing). Duraciones permitidas: 0.5, 1, 1.5, 2, 3, 4.
- "start" es el tiempo de inicio en negras desde el comienzo de la progresión (0 = tiempo 1 del compás 1). Las notas no se solapan. Último inicio < ${total}.
- Nombres de nota en notación inglesa con octava científica (C4 = do central), con # o b: "Eb4", "F#3".

Responde SOLO con JSON con esta forma exacta:
{"title": "...", "summary": "2-3 frases en español: qué demuestra el solo y qué escuchar", "phrases": [{"title": "Frase 1 (compases 1-2)", "explanation": "en español: qué notas usa sobre cada acorde y por qué funcionan; técnica concreta", "notes": [{"pitch": "F4", "start": 0, "dur": 0.5}]}]}`;
  const raw = await timedAi({ op: 'profesor-solo', where: 'cloud', model: 'claude (capacidad sample)', tokensIn: estimateTokens(prompt) },
    () => sample.json<RawSolo>(prompt, { cache: false, signal }), (r) => ({ tokensOut: estimateTokens(JSON.stringify(r ?? {})) }));
  let dropped = 0;
  const notes: LineNote[] = [];
  const phrases: AiSolo['phrases'] = [];
  for (const ph of raw?.phrases ?? []) {
    const ns: LineNote[] = [];
    for (const n of ph.notes ?? []) {
      try {
        const start = Number(n.start);
        const dur = Number(n.dur);
        if (!Number.isFinite(start) || !Number.isFinite(dur) || start < 0 || start >= total || dur <= 0 || dur > 8) { dropped++; continue; }
        let m = midiOf(parsePitch(String(n.pitch).replace('♯', '#').replace('♭', 'b')));
        while (m < p.range.lo - 5) m += 12;
        while (m > p.range.hi + 5) m -= 12;
        ns.push({ midi: m, start: Math.round(start * 4) / 4, dur: Math.round(Math.min(dur, total - start) * 4) / 4 || 0.25, tech: 'ia' });
      } catch { dropped++; }
    }
    if (!ns.length) continue;
    notes.push(...ns);
    const s = Math.min(...ns.map((x) => x.start));
    const e = Math.max(...ns.map((x) => x.start + x.dur));
    phrases.push({ title: String(ph.title ?? `Frase ${phrases.length + 1}`), explanation: String(ph.explanation ?? ''), start: s, end: e });
  }
  notes.sort((a, b) => a.start - b.start);
  const clean: LineNote[] = [];
  for (const n of notes) {
    const prev = clean[clean.length - 1];
    if (prev && n.start < prev.start + 1e-6) { dropped++; continue; }
    if (prev && prev.start + prev.dur > n.start) prev.dur = n.start - prev.start;
    clean.push(n);
  }
  if (!clean.length) throw { code: 'invalid_json', message: 'sin notas válidas' } as AiError;
  return { title: String(raw.title ?? 'Solo de la IA'), summary: String(raw.summary ?? ''), phrases, notes: clean, dropped };
}

export async function askTeacher(sample: SampleFn, history: { role: 'user' | 'assistant'; content: string }[], context: string, onText: (t: string) => void, signal?: AbortSignal) {
  const rules = `Eres el profesor de "Music Improvisation Lab", una app para aprender improvisación en saxofón, guitarra y piano. Respondes en español, de forma breve y práctica (80% práctica, 20% teoría): explica el porqué con un ejemplo concreto de notas y propone un ejercicio que el alumno pueda tocar ya. Si hablas de notas para saxofón, aclara si son de concierto o escritas. No inventes enlaces ni recursos.

Contexto de lo que el alumno está viendo ahora:
${context}`;
  const { text } = await timedAi({ op: 'profesor-pregunta', where: 'cloud', model: 'claude (capacidad sample)', tokensIn: estimateTokens(rules + history.map((h) => h.content).join('\n')) },
    () => sample([{ role: 'user', content: rules }, ...history], { cache: false, signal, onText: ({ text }: { text: string }) => onText(text) }) as Promise<{ text: string }>,
    (r) => ({ tokensOut: estimateTokens(r.text) }));
  return text;
}

export const aiStats = (an: { start: number; role: string }[]) => {
  const on = an.filter((a) => a.start % 1 === 0);
  const ok = on.filter((a) => ['guide', 'chord', 'tension'].includes(a.role)).length;
  return { onBeat: on.length, onBeatChordTones: ok, chromatic: an.filter((a) => a.role === 'chromatic').length };
};

function noteOf(m: number) {
  const n = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][((m % 12) + 12) % 12];
  return `${n}${Math.floor(m / 12) - 1}`;
}
export { chordStarts };

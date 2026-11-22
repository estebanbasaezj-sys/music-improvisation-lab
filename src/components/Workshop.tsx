// Taller de improvisación: Escucha ideas → Repite después de mí → Transforma → Tu turno → Profesor IA.
// Metodología: imitar, asimilar, innovar (una idea por chorus, vocabulario en contexto armónico).
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackingStyle } from '../audio/backing';
import { IDEAS, IdeaId, ideaById } from '../theory/improv';
import { LEVELS, Level, WAYS, WAY_FROM_IDEA, WayId, generateWay, passageOptions, wayAvailable, wayById } from '../theory/ways';
import { ScalePick, modeOver, pickNotes, pickPcs } from '../theory/cadence';
import { scaleById } from '../theory/scales';
import { trackFeature } from '../telemetry/telemetry';
import { WayPicker, SPEED_FACTOR, Speed } from './WayPicker';
import { ChordEvent, progressionById, realize } from '../theory/progressions';
import { Note, noteName, parseNote } from '../theory/notes';
import { ChosenScale, LineNote, analyzeLine } from '../theory/line';
import { sliceEvents, sliceLine } from '../theory/section';
import { useAppState } from '../progress/store';
import { SoloPlayer, PlayerPhrase } from './SoloPlayer';
import { BackingPanel } from './BackingPanel';
import { Recorder } from './Recorder';
import { KeySelect } from './ExerciseRunner';
import { Segmented, soloRange, useNames, useTransposer } from './common';
import { AiSolo, aiErrorText, aiStats, askTeacher, getSample, progressionText, requestAiSolo } from '../ai/teacher';
import { INSTRUMENT_LABEL } from '../theory/instruments';

export interface WorkshopProps {
  progression?: string;
  events?: ChordEvent[]; // para canciones (en su tonalidad original)
  originalKey?: string;
  keyName: string;
  style: BackingStyle;
  bpm: number;
  prompts?: string[];
  scale?: string;
  ideas?: IdeaId[];
  title?: string;
  blues?: boolean;
  minor?: boolean;
  minutes?: number;
}

type Tab = 'ideas' | 'repite' | 'transforma' | 'turno' | 'ia';

export function Workshop(props: WorkshopProps) {
  const t = useTransposer();
  const names = useNames();
  const app = useAppState();
  const [key, setKey] = useState(props.keyName);
  const prog = props.progression ? progressionById(props.progression) : null;
  const blues = props.blues ?? (props.progression ? ['blues12', 'jazzBlues', 'minorBlues'].includes(props.progression) : false);
  const minor = props.minor ?? prog?.minor ?? false;
  const events = useMemo<ChordEvent[]>(() => {
    if (prog) return realize(prog, parseNote(key));
    return props.events ?? [];
  }, [prog, key, props.events]);
  const keyRoot = parseNote(key);
  const exNames = { note: t.noteName, chord: t.chordName };
  // pasaje: toda la progresión, bloques de 4 compases o un ii–V–I concreto
  const passages = useMemo(() => passageOptions(events, exNames), [events, t.instrument, t.sax, app.settings.noteNames]); // eslint-disable-line react-hooks/exhaustive-deps
  const [passageId, setPassageId] = useState('all');
  const passage = passages.find((p) => p.id === passageId) ?? passages[0];
  const section = useMemo(() => (passage.from === 0 && passage.to >= events.reduce((s, e) => s + e.beats, 0) ? events : sliceEvents(events, passage.from, passage.to)), [events, passage.from, passage.to]);
  useEffect(() => { if (!passages.some((p) => p.id === passageId)) setPassageId('all'); }, [passages, passageId]);
  const kid = app.settings.profile === 'nino';
  const [level, setLevel] = useState<Level>(kid ? 1 : 2);
  const firstWay = (): WayId => {
    const fromIdea = props.ideas?.map((i) => WAY_FROM_IDEA[i]).find((w) => wayAvailable(w, { events, level }).ok);
    return fromIdea ?? (blues ? 'blues' : 'modos');
  };
  const [way, setWay] = useState<WayId>(firstWay);
  const [seed, setSeed] = useState(1);
  const [speed, setSpeed] = useState<Speed>('normal');
  const [tab, setTab] = useState<Tab>('ideas');
  const range = soloRange(t.instrument, app.settings.saxType);
  // si la forma elegida no está disponible en este nivel o pasaje, se usa la primera disponible
  const activeWay: WayId = wayAvailable(way, { events: section, level }).ok ? way : (WAYS.find((w) => wayAvailable(w.id, { events: section, level }).ok)?.id ?? 'modos');
  const scaleName = (p: ScalePick) => `${t.noteName(p.root)} ${scaleById(p.scale).name.toLowerCase()}`;
  const solo = useMemo(() => generateWay(activeWay, { events: section, keyRoot, minor, blues, range, level, seed, names: exNames, scaleName }), [activeWay, section, key, minor, blues, range.lo, range.hi, level, seed, t.instrument, t.sax, app.settings.noteNames]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = useMemo<(ChosenScale | undefined)[] | undefined>(() => solo?.picks?.map((p) => ({ pcs: pickPcs(p), notes: pickNotes(p), name: scaleName(p) })), [solo]); // eslint-disable-line react-hooks/exhaustive-deps
  const bpm = Math.round(LEVELS[level - 1].bpm * SPEED_FACTOR[speed]);
  const w = wayById(activeWay);
  useEffect(() => { trackFeature('generador-solos', { forma: activeWay, nivel: level }); }, [activeWay, level]);
  const ctxText = `${prog ? prog.name : props.title ?? 'Progresión'} en ${names(keyRoot)}${minor ? ' menor' : ''} (concierto)`;
  const chordsLine = useMemo(() => {
    const bars: string[][] = [];
    events.forEach((e) => (bars[e.bar] ??= []).push(t.chordName(e.chord)));
    return bars.map((b) => (b ?? []).join(' ')).join(' | ');
  }, [events, t]);
  const scaleChips = useMemo(() => {
    if (!solo?.picks) return [];
    const seen = new Map<string, string>();
    section.forEach((e, i) => {
      const s = t.chordName(e.chord);
      if (seen.has(s)) return;
      const p = solo.picks![i];
      const mode = modeOver(p, e.chord.root);
      seen.set(s, `${scaleName(p)}${mode ? ` (= ${t.noteName(e.chord.root)} ${mode.toLowerCase()})` : ''}`);
    });
    return [...seen.entries()];
  }, [solo, section]); // eslint-disable-line react-hooks/exhaustive-deps
  const playerKey = `${activeWay}-${seed}-${level}-${key}-${passage.id}-${speed}`;
  const source = `${w.name} · nivel ${level}`;

  return (
    <div className="workshop">
      <div className="ctx">
        <div><b>Sobre:</b> {ctxText}{t.isSax && ` · para tu saxo: ${t.noteName(keyRoot)}`}</div>
        <div className="ctx-chords">{chordsLine}</div>
      </div>
      <div className="row between wrap">
        {prog ? <KeySelect value={key} onChange={setKey} /> : <span />}
        <span className="muted small">Método: escucha la idea → repítela → transfórmala → úsala tú → grábate.</span>
      </div>
      <Segmented value={tab} onChange={setTab} options={[
        { value: 'ideas', label: '1 · Escucha ideas' }, { value: 'repite', label: '2 · Repite después de mí' }, { value: 'transforma', label: '3 · Transforma' },
        { value: 'turno', label: '4 · Tu turno' }, { value: 'ia', label: '✨ Profesor IA' },
      ]} />
      {(tab === 'ideas' || tab === 'repite' || tab === 'transforma') && (
        <WayPicker events={section} passages={passages} passage={passage.id} onPassage={(id) => { setPassageId(id); setSeed(1); }} level={level} onLevel={(l) => { setLevel(l); setSeed(1); }}
          way={activeWay} onWay={(id) => { setWay(id); setSeed(1); }} onAnother={() => setSeed(seed + 1)} speed={speed} onSpeed={setSpeed} />
      )}
      {(tab === 'ideas' || tab === 'repite' || tab === 'transforma') && !solo && <p className="warn">Esta forma no genera notas en este pasaje. Prueba otra forma u otro pasaje.</p>}
      {tab === 'ideas' && solo && (
        <>
          {scaleChips.length > 0 && (
            <div className="wp-scales small"><span className="muted">Qué escala suena en cada acorde:</span> {scaleChips.map(([c, s]) => <span key={c} className="pill"><b>{c}</b> → {s}</span>)}</div>
          )}
          <SoloPlayer key={playerKey} events={section} notes={solo.notes} keyRoot={keyRoot} blues={blues} style={props.style} bpm={bpm} phrases={solo.phrases} title={solo.title} summary={solo.summary} source={source} scales={chosen} />
          <div className="cx-challenge"><b>🎯 Ahora tú:</b> {w.challenge} <span className="muted small">Pulsa «▶ Base (tocas tú)» y toca con esta forma; luego pasa a la siguiente con «Siguiente ▶».</span></div>
        </>
      )}
      {tab === 'repite' && solo && <SoloPlayer key={`r-${playerKey}`} events={section} notes={solo.notes} keyRoot={keyRoot} blues={blues} style={props.style} bpm={Math.min(bpm, 110)} phrases={solo.phrases} source={source} scales={chosen} guidedRepeat />}
      {tab === 'transforma' && solo && <Transformer key={`t-${playerKey}`} events={section} solo={{ notes: solo.notes, phrases: solo.phrases }} keyRoot={keyRoot} blues={blues} style={props.style} bpm={bpm} source={source} />}
      {tab === 'turno' && <YourTurn {...props} events={events} keyRoot={keyRoot} challenge={w.challenge} />}
      {tab === 'ia' && <AiPanel events={events} keyRoot={keyRoot} blues={blues} minor={minor} style={props.style} bpm={props.bpm} range={range} contextText={`${ctxText}\n${progressionText(events)}`} />}
    </div>
  );
}

// ---------------------------------------------------------------- Transformar
type TransformId = 'displace' | 'displace1' | 'rhythm' | 'ending' | 'octave' | 'truncate';
const TRANSFORMS: { id: TransformId; name: string; why: string }[] = [
  { id: 'displace', name: 'Desplazar medio tiempo', why: 'Las mismas notas suenan con otro acento: lo que caía en el tiempo ahora cae a contratiempo. Observa cómo cambian los colores: el desplazamiento cambia la función armónica.' },
  { id: 'displace1', name: 'Desplazar un tiempo', why: 'Empezar la frase en el tiempo 2 en vez del 1 (fraseo rítmico): más sorpresa y menos "cuadratura".' },
  { id: 'rhythm', name: 'Mismas notas, ritmo en negras', why: 'Al simplificar el ritmo oyes mejor el contorno; luego vuelve a añadir corcheas a tu manera.' },
  { id: 'ending', name: 'Cambiar el final', why: 'Termina en otra nota del acorde (3ª ↔ 5ª ↔ 9ª): misma pregunta, otra respuesta.' },
  { id: 'octave', name: 'Otra octava', why: 'Cambiar de registro da contraste sin cambiar la idea.' },
  { id: 'truncate', name: 'Solo el principio', why: 'Quedarte con las primeras notas y repetirlas crea un motivo más fácil de desarrollar.' },
];

function transform(notes: LineNote[], id: TransformId, len: number, events: ChordEvent[], range: { lo: number; hi: number }): LineNote[] {
  const clip = (ns: LineNote[]) => ns.filter((n) => n.start < len - 1e-9).map((n) => ({ ...n, dur: Math.min(n.dur, len - n.start) }));
  switch (id) {
    case 'displace': return clip(notes.map((n) => ({ ...n, start: n.start + 0.5 })));
    case 'displace1': return clip(notes.map((n) => ({ ...n, start: n.start + 1 })));
    case 'rhythm': return clip(notes.map((n, i) => ({ ...n, start: i, dur: 1 })));
    case 'octave': {
      const avg = notes.reduce((s, n) => s + n.midi, 0) / Math.max(1, notes.length);
      const d = avg + 12 <= range.hi ? 12 : -12;
      return notes.map((n) => ({ ...n, midi: n.midi + d }));
    }
    case 'truncate': {
      const head = notes.slice(0, Math.min(4, notes.length));
      const span = Math.ceil((head[head.length - 1].start + head[head.length - 1].dur) * 2) / 2;
      const rep = head.map((n) => ({ ...n, start: n.start + Math.max(2, span + 0.5) }));
      return clip([...head, ...rep]);
    }
    case 'ending': {
      const last = notes[notes.length - 1];
      const an = analyzeLine([last], sliceEvents(events, 0, len));
      const deg = an[0]?.degree;
      const c = sliceEvents(events, 0, len).find((_, i, arr) => {
        let s = 0; for (let k = 0; k < i; k++) s += arr[k].beats;
        return last.start >= s && last.start < s + arr[i].beats;
      })?.chord;
      if (!c) return notes;
      const options = [3, 4, 7, 2, 9].map((x) => x); // b3/3/5/9/13 aprox. por semitonos sobre la fundamental
      const rootPc = ((c.root.letter >= 0 ? [0, 2, 4, 5, 7, 9, 11][c.root.letter] + c.root.acc : 0) + 12) % 12;
      let best = last.midi;
      for (let m = last.midi - 5; m <= last.midi + 5; m++) {
        const rel = (((m - rootPc) % 12) + 12) % 12;
        if (m !== last.midi && options.includes(rel) && analyzeLine([{ ...last, midi: m }], sliceEvents(events, 0, len))[0].degree !== deg) { best = m; break; }
      }
      return [...notes.slice(0, -1), { ...last, midi: best }];
    }
  }
}

function Transformer({ events, solo, keyRoot, blues, style, bpm, source }: { events: ChordEvent[]; solo: { notes: LineNote[]; phrases: PlayerPhrase[] }; keyRoot: Note; blues: boolean; style: BackingStyle; bpm: number; source: string }) {
  const t = useTransposer();
  const app = useAppState();
  const [pi, setPi] = useState(0);
  const [tid, setTid] = useState<TransformId>('displace');
  const p = solo.phrases[Math.min(pi, solo.phrases.length - 1)];
  if (!p) return <p className="muted">Este ejemplo no tiene frases que transformar. Pulsa «Otro ejemplo».</p>;
  const from = Math.floor(p.start / 4) * 4;
  const to = Math.min(events.reduce((s, e) => s + e.beats, 0), Math.max(from + 4, Math.ceil((p.end - 0.01) / 4) * 4));
  const sec = sliceEvents(events, from, to);
  const orig = sliceLine(solo.notes, from, to);
  const tr = TRANSFORMS.find((x) => x.id === tid)!;
  const out = orig.length ? transform(orig, tid, to - from, sec, soloRange(t.instrument, app.settings.saxType)) : [];
  return (
    <div>
      <p className="small">Copiar una idea es el primer paso; el segundo es <b>hacerla tuya</b>. Elige una frase del ejemplo y una transformación: compara el original con el resultado y toca ambos.</p>
      <div className="row gap wrap">
        <label className="field inline"><span>Frase</span>
          <select value={pi} onChange={(e) => setPi(+e.target.value)}>{solo.phrases.map((x, i) => <option key={i} value={i}>{x.title}</option>)}</select>
        </label>
        <label className="field inline"><span>Transformación</span>
          <select value={tid} onChange={(e) => setTid(e.target.value as TransformId)}>{TRANSFORMS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        </label>
      </div>
      <p className="hint">💡 {tr.why}</p>
      <h4>Original</h4>
      <SoloPlayer key={`o-${pi}`} events={sec} notes={orig} keyRoot={keyRoot} blues={blues} style={style} bpm={bpm} source={source} hideSave phrases={[]} />
      <h4>Transformada: {tr.name}</h4>
      <SoloPlayer key={`t-${pi}-${tid}`} events={sec} notes={out} keyRoot={keyRoot} blues={blues} style={style} bpm={bpm} source={`${source} (transformada)`} phrases={[{ start: 0, end: to - from, title: `${p.title.split(' · ')[0]} · ${tr.name}`, text: 'Toca la versión transformada y luego inventa la tuya. Guárdala si te gusta.' }]} />
    </div>
  );
}

// ---------------------------------------------------------------- Tu turno
function YourTurn(props: WorkshopProps & { events: ChordEvent[]; keyRoot: Note; challenge: string }) {
  const [left, setLeft] = useState((props.minutes ?? 4) * 60);
  const [running, setRunning] = useState(false);
  const challenges = [props.challenge, ...(props.prompts ?? [])];
  const [ci, setCi] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);
  return (
    <div>
      <div className="challenge">
        <span className="muted small">Reto {ci + 1} de {challenges.length} · una idea por chorus</span>
        <p className="big-text">{challenges[ci]}</p>
        <div className="row gap">
          <button className="btn sm" disabled={ci === 0} onClick={() => setCi(ci - 1)}>←</button>
          <button className="btn sm" disabled={ci >= challenges.length - 1} onClick={() => setCi(ci + 1)}>Siguiente reto →</button>
          <span className={`timer ${left === 0 ? 'done' : ''}`}>⏱ {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} {left === 0 && '¡Tiempo!'}</span>
        </div>
      </div>
      <BackingPanel events={props.events} style={props.style} bpm={props.bpm} display="guide" fixedScale={props.scale ? { scale: props.scale, root: props.keyRoot } : null} onPlayingChange={setRunning} />
      <details className="rec-inline" open><summary>● Grábate y escúchate</summary><Recorder context={`Tu turno: ${challenges[ci]}`} criteria={['Cumplí el reto', 'Las notas encajan con los acordes', 'Tempo estable', 'Frases con principio y final', 'Hay espacio']} /></details>
    </div>
  );
}

// ---------------------------------------------------------------- Profesor IA
function AiPanel({ events, keyRoot, blues, minor, style, bpm, range, contextText }: { events: ChordEvent[]; keyRoot: Note; blues: boolean; minor: boolean; style: BackingStyle; bpm: number; range: { lo: number; hi: number }; contextText: string }) {
  const t = useTransposer();
  const [avail, setAvail] = useState<boolean | null>(null);
  const [idea, setIdea] = useState('libre');
  const [extra, setExtra] = useState('');
  const [level, setLevel] = useState(2);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [solo, setSolo] = useState<AiSolo | null>(null);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => { getSample().then((s) => setAvail(!!s)); return () => ctl.current?.abort(); }, []);
  const total = events.reduce((s, e) => s + e.beats, 0);
  const section = total > 64 ? sliceEvents(events, 0, 64) : events;
  const gen = async () => {
    const s = await getSample();
    if (!s) return;
    ctl.current?.abort();
    ctl.current = new AbortController();
    setBusy(true); setErr('');
    try {
      const r = await requestAiSolo(s, {
        events: section, key: `${noteName(keyRoot)}${minor ? ' menor' : ' mayor'}`, style, level, range, extra, instrument: INSTRUMENT_LABEL[t.instrument].toLowerCase(),
        idea: idea === 'libre' ? 'libre: combina notas guía, aproximaciones cromáticas, motivos y espacio' : `${ideaById(idea as IdeaId).name}: ${ideaById(idea as IdeaId).short}`,
      }, ctl.current.signal);
      setSolo(r);
    } catch (e) { setErr(aiErrorText(e)); }
    setBusy(false);
  };
  if (avail === null) return <p className="muted">Comprobando si el profesor IA está disponible…</p>;
  if (!avail) return <div className="card accent"><p><b>Profesor IA no disponible aquí.</b> Funciona cuando abres la app dentro de Claude (claude.ai): Claude escribe solos de ejemplo sobre esta progresión, explica cada frase y responde tus preguntas. Mientras tanto, los ejemplos de «Escucha ideas» funcionan siempre, sin conexión.</p></div>;
  const an = solo ? analyzeLine(solo.notes, section, { keyRoot, blues }) : [];
  const st = aiStats(an);
  return (
    <div>
      <p className="small">Pide a Claude un solo de ejemplo sobre {total > 64 ? 'los primeros 16 compases de ' : ''}esta progresión. La app <b>verifica cada nota</b> contra el acorde que suena y la colorea según su función: si la IA se equivoca, lo verás (rojo = cromatismo sin resolver).</p>
      <div className="row gap wrap">
        <label className="field inline"><span>Idea</span>
          <select value={idea} onChange={(e) => setIdea(e.target.value)}>
            <option value="libre">Libre (mezcla de recursos)</option>
            {IDEAS.filter((i) => blues || !i.needsBlues).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </label>
        <label className="field inline"><span>Nivel</span>
          <select value={level} onChange={(e) => setLevel(+e.target.value)}><option value={1}>Sencillo</option><option value={2}>Intermedio</option><option value={3}>Avanzado</option></select>
        </label>
        <input className="wide" placeholder="Opcional: «más blues», «frases cortas», «usa enclosures»…" value={extra} onChange={(e) => setExtra(e.target.value)} />
        {busy ? <button className="btn stop" onClick={() => ctl.current?.abort()}>■ Detener</button> : <button className="btn primary" onClick={gen}>✨ Crear solo con IA</button>}
      </div>
      {busy && <p className="muted">Claude está componiendo y explicando el solo (puede tardar 30–60 s)…</p>}
      {err && <p className="warn">{err}</p>}
      {solo && (
        <>
          <p className="small muted">Verificación de la app: {st.onBeatChordTones} de {st.onBeat} notas en tiempo fuerte son notas del acorde o tensiones; {st.chromatic} cromatismo(s) sin resolver{solo.dropped ? `; ${solo.dropped} nota(s) descartadas por formato inválido` : ''}.</p>
          <SoloPlayer events={section} notes={solo.notes} keyRoot={keyRoot} blues={blues} style={style} bpm={bpm} title={solo.title} summary={(t.isSax ? '(La IA explica en alturas de concierto; la partitura está escrita para tu saxo.) ' : '') + solo.summary} phrases={solo.phrases.map((p) => ({ start: p.start, end: p.end, title: p.title, text: p.explanation }))} source="Profesor IA" />
        </>
      )}
      <AskTeacher context={contextText + (solo ? `\nSolo mostrado: ${solo.title}. ${solo.summary}` : '')} />
    </div>
  );
}

export function AskTeacher({ context, compact }: { context: string; compact?: boolean }) {
  const [avail, setAvail] = useState<boolean | null>(null);
  const [q, setQ] = useState('');
  const [hist, setHist] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [live, setLive] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => { getSample().then((s) => setAvail(!!s)); return () => ctl.current?.abort(); }, []);
  if (!avail) return compact ? null : null;
  const send = async () => {
    const s = await getSample();
    if (!s || !q.trim()) return;
    const h = [...hist, { role: 'user' as const, content: q.trim() }].slice(-8);
    setHist(h); setQ(''); setBusy(true); setErr(''); setLive('');
    ctl.current = new AbortController();
    try {
      const text = await askTeacher(s, h, context.slice(0, 6000), setLive, ctl.current.signal);
      setHist([...h, { role: 'assistant', content: text }]);
      setLive('');
    } catch (e) { setErr(aiErrorText(e)); }
    setBusy(false);
  };
  return (
    <div className="ask">
      <h4>💬 Pregúntale al profesor</h4>
      {hist.map((m, i) => <div key={i} className={`msg ${m.role}`}>{m.content}</div>)}
      {busy && <div className="msg assistant">{live || 'Pensando…'}</div>}
      {err && <p className="warn">{err}</p>}
      <div className="row gap">
        <input className="wide" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !busy && send()} placeholder="Ej.: ¿por qué funciona la b3 sobre el IV7? ¿Qué toco en el compás 9?" />
        {busy ? <button className="btn stop" onClick={() => ctl.current?.abort()}>■</button> : <button className="btn primary" onClick={send}>Enviar</button>}
      </div>
    </div>
  );
}

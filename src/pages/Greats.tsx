// «El lenguaje de los grandes»: para cada músico, sus recursos más emblemáticos convertidos en frases que se
// escuchan sobre una cadencia, se ven en partitura y se copian a «Mi vocabulario» para practicarlas en las 12
// tonalidades. Las frases son ORIGINALES, construidas con los recursos de cada músico; para sus frases reales
// la ficha enlaza a los libros oficiales (sus solos y transcripciones tienen derechos de autor).
import { useEffect, useMemo, useState } from 'react';
import { CADENCES, ExCtx, ExResult, Figure, ScalePick, buildExercise, cadenceById, cadenceEvents, exerciseById, scaleOptions } from '../theory/cadence';
import { Level, WayId, generateWay } from '../theory/ways';
import { GREATS, Great, greatById } from '../content/greats';
import { parseNote, noteName } from '../theory/notes';
import { scaleById } from '../theory/scales';
import { eventsToChart } from '../theory/section';
import { addVocab, useAppState } from '../progress/store';
import { trackFeature } from '../telemetry/telemetry';
import { SoloPlayer } from '../components/SoloPlayer';
import { GreatPanel, LickSources } from '../components/GreatPanel';
import { KeySelect } from '../components/ExerciseRunner';
import { Card, soloRange, useTransposer } from '../components/common';

type Ctx = ExCtx & { level?: Level };
interface Resource { id: string; name: string; how: string; run: (c: Ctx) => ExResult | null; seeded?: boolean }

const ex = (id: string, figure?: Figure) => (c: Ctx) => buildExercise(exerciseById(id), { ...c, figure: figure ?? c.figure });
const way = (id: WayId, level: Level, figure?: Figure) => (c: Ctx) => {
  const r = generateWay(id, { events: c.events, keyRoot: c.keyRoot, minor: c.minor, blues: c.blues, range: c.range, level, seed: c.seed, names: c.names, scaleName: c.scaleName, figure });
  return r ? { notes: r.notes, phrases: r.phrases } : null;
};

const RESOURCES: Record<Great['id'], Resource[]> = {
  parker: [
    { id: 'p-linea', name: 'Línea bebop con enclosures y la b9', how: 'Su sonido completo: corcheas largas, notas del acorde en los tiempos, enclosures en los cambios y el arpegio b9 sobre el V7.', run: way('parker', 4), seeded: true },
    { id: 'p-encl', name: 'Enclosure a la 3ª', how: 'Nota de la escala por arriba, medio tono por abajo y llegada a la 3ª en el tiempo 1.', run: ex('apr-encl-ab') },
    { id: 'p-b9', name: 'La b9 que resuelve', how: '3-5-b7-b9 sobre el V7; la b9 baja medio tono a la 5ª del acorde siguiente.', run: ex('fra-b9') },
    { id: 'p-bebop', name: 'Escala bebop', how: 'Bajando desde una nota del acorde con la nota de paso cromática: las notas del acorde caen en los tiempos.', run: ex('beb-escala') },
    { id: 'p-blues', name: 'El blues dentro del bebop', how: 'La b3 que sube a la 3ª y la b5 de paso, en medio de líneas bebop.', run: ex('fra-blues') },
  ],
  coltrane: [
    { id: 'c-linea', name: '1-2-3-5 + pentatónicas superpuestas', how: 'Patrones digitales en un acorde y pentatónicas superpuestas en el siguiente.', run: way('coltrane', 4) },
    { id: 'c-1235', name: 'Patrón 1-2-3-5', how: 'Fundamental, 2ª, 3ª y 5ª de cada acorde, de ida y de vuelta.', run: ex('ide-1235') },
    { id: 'c-sheets', name: '«Sheets of sound» (semicorcheas)', how: 'El mismo patrón en semicorcheas: líneas muy densas que recorren cada acorde.', run: ex('ide-1235', 's') },
    { id: 'c-penta', name: 'Pentatónicas superpuestas', how: 'Pentatónicas que empiezan en otra nota del acorde (sobre Dm7, Mi menor = 9-11-5-13-1).', run: ex('fra-penta') },
  ],
  miles: [
    { id: 'm-espacio', name: 'Pocas notas y mucho espacio', how: 'Registro medio, 9ª y 13ª, y silencio entre frases.', run: way('miles', 2), seeded: true },
    { id: 'm-guia', name: 'Notas largas: 3ª y 7ª', how: 'Melodías de notas guía, cantables y sin saltos.', run: way('guia', 1) },
    { id: 'm-motivo', name: 'Motivo corto que vuelve', how: 'Una idea de 2–3 notas que se repite adaptada a cada acorde.', run: way('motivo', 2), seeded: true },
  ],
  lester: [
    { id: 'l-linea', name: 'Línea horizontal y relajada', how: 'La escala de la tonalidad como una sola melodía, entrando después del tiempo y repitiendo notas.', run: way('lester', 3) },
    { id: 'l-tonalidad', name: 'Pensar en la tonalidad', how: 'Una escala para toda la progresión: sobre cada acorde, las mismas notas cambian de función.', run: way('tonalidad', 3) },
    { id: 'l-penta', name: 'Pentatónica cantable', how: 'Pentatónicas de cada acorde, en corcheas tranquilas: melodías de swing.', run: way('pentatonicas', 3) },
  ],
  rollins: [
    { id: 'r-motivo', name: 'Improvisación temática', how: 'Un motivo que se repite, se varía, se desplaza y se extiende.', run: way('rollins', 3), seeded: true },
    { id: 'r-desp', name: 'Desplazamiento rítmico', how: 'La misma idea empezando en el «y» del 1 o en el tiempo 2.', run: ex('com-desp') },
    { id: 'r-espacio', name: 'Ritmo y espacio', how: 'Pocas notas en contratiempos y anticipaciones.', run: way('espacio', 3), seeded: true },
  ],
  cannonball: [
    { id: 'a-linea', name: 'Bebop que termina en blues', how: 'Líneas bebop alternadas con frases de blues.', run: way('cannonball', 4), seeded: true },
    { id: 'a-aprox', name: 'Aproximaciones cromáticas', how: 'Corcheas que llegan a la 3ª de cada acorde desde medio tono abajo.', run: ex('beb-aprox'), seeded: true },
    { id: 'a-blues', name: 'b3 → 3 en cada acorde', how: 'La 3ª que se dobla de menor a mayor: el sabor «soul».', run: ex('fra-blues') },
  ],
  bbking: [
    { id: 'b-pregunta', name: 'Pregunta y respuesta', how: 'Una frase que pregunta, espacio, y otra que responde.', run: way('bbking', 2), seeded: true },
    { id: 'b-blues', name: 'La 3ª que se dobla', how: 'b3 → 3 y la b5 de paso: el corazón del blues.', run: ex('fra-blues') },
    { id: 'b-pocas', name: 'Economía', how: 'Muy pocas notas, largas y con intención.', run: way('pregunta', 1) },
  ],
};
const CONTEXTS = ['iiVI', 'blues', 'iiVImin', 'turnaround', 'dorianVamp', 'V-I'];

export function GreatsPage() {
  const t = useTransposer();
  const app = useAppState();
  const [gid, setGid] = useState<Great['id']>('parker');
  const [cadId, setCadId] = useState('iiVI');
  const cad = cadenceById(cadId);
  const [key, setKey] = useState(cad.defaultKey);
  const g = greatById(gid);
  return (
    <div className="page">
      <h1>El lenguaje de los grandes</h1>
      <p className="lead">Los recursos más emblemáticos de cada músico, convertidos en frases que escuchas sobre una cadencia, ves en partitura y <b>copias a «Mi vocabulario»</b> para practicarlas en las 12 tonalidades.</p>
      <p className="small muted">Las frases son originales, construidas con los recursos de cada músico: sus solos reales y los libros que los transcriben tienen derechos de autor. En cada ficha encontrarás qué escuchar y los libros oficiales con sus frases reales.</p>
      <div className="greats-grid">
        {GREATS.map((x) => (
          <button key={x.id} className={`great-card ${x.id === gid ? 'on' : ''}`} onClick={() => { setGid(x.id); trackFeature('grandes', { musico: x.id }); }}>
            <span className="great-ico" aria-hidden="true">{({ parker: '🐦', coltrane: '🌀', miles: '🎺', lester: '🎩', rollins: '🌉', cannonball: '🔥', bbking: '🎸' } as Record<string, string>)[x.id]}</span>
            <b>{x.name}</b><small>{x.instrument} · {x.era}</small>
          </button>
        ))}
      </div>
      <Card>
        <GreatPanel id={gid} />
        <div className="row gap wrap">
          <label className="field inline"><span>Sobre</span>
            <select value={cadId} onChange={(e) => { setCadId(e.target.value); setKey(cadenceById(e.target.value).defaultKey); }}>
              {CONTEXTS.map((id) => <option key={id} value={id}>{CADENCES.find((c) => c.id === id)!.name}</option>)}
            </select>
          </label>
          <KeySelect value={key} onChange={setKey} />
        </div>
        <h3 className="greats-h">Recursos emblemáticos de {g.name}</h3>
        {RESOURCES[gid].map((r) => <ResourceCard key={`${gid}-${r.id}-${cadId}-${key}`} great={g} res={r} cadId={cadId} keyName={key} instrumentKey={`${t.instrument}-${app.settings.saxType}`} />)}
      </Card>
      <Card title="Más fuentes para aprender frases de los grandes">
        <LickSources />
        <p className="small muted">Método recomendado: escucha la grabación muchas veces, canta la frase, sácala con «Sacar solos» (velocidad lenta y bucle), tócala sobre la base y llévala a las 12 tonalidades desde «Mi vocabulario».</p>
      </Card>
    </div>
  );
}

function ResourceCard({ great, res, cadId, keyName }: { great: Great; res: Resource; cadId: string; keyName: string; instrumentKey: string }) {
  const t = useTransposer();
  const app = useAppState();
  const cad = cadenceById(cadId);
  const keyRoot = parseNote(keyName);
  const [seed, setSeed] = useState(1);
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (!copied) return; const h = setTimeout(() => setCopied(false), 3000); return () => clearTimeout(h); }, [copied]);
  const events = useMemo(() => cadenceEvents(cad, keyRoot), [cad, keyName]); // eslint-disable-line react-hooks/exhaustive-deps
  const picks = useMemo<ScalePick[]>(() => events.map((_, i) => scaleOptions(cad, events, i)[0]), [events, cad]);
  const range = soloRange(t.instrument, app.settings.saxType);
  const ctx: Ctx = { events, picks, range, keyRoot, minor: !!cad.minor, blues: !!cad.blues, loops: !!cad.loops, seed, names: { note: t.noteName, chord: t.chordName }, scaleName: (p) => `${t.noteName(p.root)} ${scaleById(p.scale).name.toLowerCase()}` };
  const r = useMemo(() => res.run(ctx), [res, events, seed, range.lo, range.hi, t.instrument, t.sax]); // eslint-disable-line react-hooks/exhaustive-deps
  const copy = () => {
    if (!r) return;
    addVocab({ title: `${great.name} · ${res.name}`, source: 'El lenguaje de los grandes', key: noteName(keyRoot), chart: eventsToChart(events), notes: r.notes.map(({ midi, start, dur, tech }) => ({ midi, start, dur, tech })), instrument: t.instrument });
    trackFeature('grandes-copiar', { musico: great.id, recurso: res.id });
    setCopied(true);
  };
  return (
    <div className="res-card">
      <div className="res-head">
        <div><b>{res.name}</b><p className="small muted">{res.how}</p></div>
        <div className="row gap wrap">
          {res.seeded && <button className="btn sm" onClick={() => setSeed(seed + 1)}>🎲 Otra frase</button>}
          <button className="btn sm primary" onClick={copy} disabled={!r}>★ Copiar a mi vocabulario</button>
        </div>
      </div>
      {copied && <p className="ok small">Copiada en «Mi vocabulario»: allí la practicas en las 12 tonalidades.</p>}
      {r ? <SoloPlayer key={`${seed}`} events={events} notes={r.notes} keyRoot={keyRoot} blues={!!cad.blues} style={cad.blues ? 'blues' : 'swing'} bpm={res.id.includes('sheets') ? 60 : 100} phrases={r.phrases} source={`${great.name} · ${res.name}`} />
        : <p className="warn small">Este recurso necesita un V7 que resuelva: elige «ii – V – I mayor», «blues» o «V7 → I».</p>}
    </div>
  );
}

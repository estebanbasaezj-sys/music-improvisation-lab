import { useEffect, useMemo, useState } from 'react';
import { PROGRESSIONS, progressionById, realize } from '../theory/progressions';
import { QUALITIES, VOICING_LABELS, VoicingType, parseChord, chordSymbol } from '../theory/chords';
import { SCALES, MODE_ORDER } from '../theory/scales';
import { parseNote } from '../theory/notes';
import { BackingStyle, STYLE_LABEL, startMetronome, stopMetronome, setTransportBpm } from '../audio/backing';
import { BackingPanel } from '../components/BackingPanel';
import { ScaleView } from '../components/ScaleView';
import { ChordsView } from '../components/ChordsView';
import { KeySelect, PhrasePlayer } from '../components/ExerciseRunner';
import { PitchCheck } from '../components/PitchCheck';
import { Card, Segmented, useNames } from '../components/common';
import { SpotProvider, fragWords, useInitialParams, useSpot } from '../practice/spot';
import { replaceParams } from '../router';
import { WAYS } from '../theory/ways';
import { PHRASES } from '../content/phrases';
import { Workshop } from '../components/Workshop';
import { CadenceExplorer } from '../components/CadenceExplorer';

type Tab = 'cadencias' | 'taller' | 'escalas' | 'acordes' | 'progresiones' | 'frases' | 'metronomo' | 'afinador';

const TABS: Tab[] = ['cadencias', 'taller', 'escalas', 'acordes', 'progresiones', 'frases', 'metronomo', 'afinador'];
const TAB_TITLE: Record<Tab, string> = { cadencias: 'Explorar una cadencia', taller: 'Taller de improvisación', escalas: 'Escalas y modos', acordes: 'Acordes', progresiones: 'Progresiones y acompañamiento', frases: 'Frases', metronomo: 'Metrónomo', afinador: 'Detector de notas' };

export function Lab() {
  const names = useNames();
  return (
    <SpotProvider describe={(p) => {
      const tab = (TABS.includes(p.get('tab') as Tab) ? p.get('tab') : 'cadencias') as Tab;
      const prog = p.get('prog') ?? (tab === 'taller' ? 'blues12' : null);
      const way = p.get('forma') ? WAYS.find((w) => w.id === p.get('forma')) : null;
      const bits = [prog && tab === 'taller' ? progressionById(prog).name : null, way ? way.name : null, p.get('nivel') ? `nivel ${p.get('nivel')}` : null, p.get('tono') ? names(parseNote(p.get('tono')!)) : null, p.get('bpm') ? `♩ = ${p.get('bpm')}` : null, p.get('frag') ? fragWords(p.get('frag')) : null].filter(Boolean);
      return { id: `lab:${tab}`, title: `Laboratorio · ${TAB_TITLE[tab]}`, detail: bits.join(' · ') || 'Donde lo dejaste' };
    }}>
      <LabBody />
    </SpotProvider>
  );
}

function LabBody() {
  const params = useInitialParams();
  const [tab, setTabState] = useState<Tab>(() => (TABS.includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : 'cadencias'));
  const setTab = (t: Tab) => { setTabState(t); replaceParams({ tab: t === 'cadencias' ? null : t, prog: null, estilo: null, tono: null, pasaje: null, nivel: null, forma: null, v: null, vel: null, fig: null, paso: null, bpm: null, bpmBase: null, frag: null }); };
  return (
    <div className="page">
      <h1>Laboratorio</h1>
      <Segmented value={tab} onChange={setTab} options={[
        { value: 'cadencias', label: '🧭 Explorar una cadencia' }, { value: 'taller', label: '✨ Taller de improvisación' }, { value: 'escalas', label: 'Escalas y modos' }, { value: 'acordes', label: 'Acordes' }, { value: 'progresiones', label: 'Progresiones y acompañamiento' },
        { value: 'frases', label: 'Frases' }, { value: 'metronomo', label: 'Metrónomo' }, { value: 'afinador', label: 'Detector de notas' },
      ]} />
      {tab === 'cadencias' && <CadenceExplorer />}
      {tab === 'taller' && <WorkshopLab />}
      {tab === 'escalas' && <ScalesLab />}
      {tab === 'acordes' && <ChordsLab />}
      {tab === 'progresiones' && <ProgLab />}
      {tab === 'frases' && <PhrasesLab />}
      {tab === 'metronomo' && <MetronomeLab />}
      {tab === 'afinador' && <Card title="Detector de notas (micrófono)"><p className="small">Toca una nota sostenida: la app muestra la nota detectada y la desviación en cents. Funciona con una sola nota a la vez (saxofón, voz, notas sueltas de guitarra o piano); no reconoce acordes.</p><PitchCheck /></Card>}
    </div>
  );
}

function WorkshopLab() {
  const params = useInitialParams();
  const spot = useSpot();
  const [prog, setProgState] = useState(() => { const p = params.get('prog'); return p && PROGRESSIONS.some((x) => x.id === p) ? p : 'blues12'; });
  const [style, setStyleState] = useState<BackingStyle>(() => { const e = params.get('estilo'); return e && e in STYLE_LABEL ? (e as BackingStyle) : 'swing'; });
  const setProg = (p: string) => { setProgState(p); spot?.set({ prog: p, tono: null, pasaje: null, forma: null, v: null, bpm: null, bpmBase: null, frag: null }); };
  const setStyle = (e: BackingStyle) => { setStyleState(e); spot?.set({ estilo: e === 'swing' ? null : e }); };
  const p = progressionById(prog);
  return (
    <Card>
      <p className="small">Elige una progresión: la app te muestra solos de ejemplo explicados frase a frase, te los hace repetir sobre la base, te ayuda a transformarlos y luego te propone retos para improvisar tú.</p>
      <div className="row gap wrap">
        <label className="field inline"><span>Progresión</span>
          <select value={prog} onChange={(e) => setProg(e.target.value)}>{PROGRESSIONS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        </label>
        <label className="field inline"><span>Estilo</span>
          <select value={style} onChange={(e) => setStyle(e.target.value as BackingStyle)}>{Object.entries(STYLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
      </div>
      <Workshop key={prog} progression={prog} keyName={p.minor ? 'C' : prog.startsWith('blues') || prog === 'jazzBlues' ? 'F' : 'C'} style={style} bpm={prog === 'rhythmA' ? 140 : 110} />
    </Card>
  );
}

function ScalesLab() {
  const [key, setKey] = useState('C');
  const [scale, setScale] = useState('major');
  const groups = [
    { label: 'Mayores y menores', ids: ['major', 'minor', 'harmonicMinor'] },
    { label: 'Pentatónicas y blues', ids: ['pentMajor', 'pentMinor', 'blues', 'bluesMajor'] },
    { label: 'Modos', ids: MODE_ORDER },
    { label: 'Jazz', ids: ['phrygianDominant', 'dimHW', 'bebopDominant', 'bebopMajor', 'bebopDorian', 'melodicMinor', 'locrian2', 'altered', 'lydianDominant', 'mixolydianb13'] },
  ];
  return (
    <Card>
      <div className="row gap wrap">
        <KeySelect value={key} onChange={setKey} />
        <label className="field inline"><span>Escala / modo</span>
          <select value={scale} onChange={(e) => setScale(e.target.value)}>
            {groups.map((g) => <optgroup key={g.label} label={g.label}>{g.ids.map((id) => <option key={id} value={id}>{SCALES.find((s) => s.id === id)!.name}</option>)}</optgroup>)}
          </select>
        </label>
      </div>
      <ScaleView scaleId={scale} keyName={key} />
    </Card>
  );
}

function ChordsLab() {
  const names = useNames();
  const [key, setKey] = useState('C');
  const [q, setQ] = useState('maj7');
  const [extra, setExtra] = useState<string[]>([]);
  const sym = key + (q === 'maj' ? '' : q);
  const symbols = useMemo(() => [sym, ...extra], [sym, extra]);
  return (
    <Card>
      <div className="row gap wrap">
        <KeySelect value={key} onChange={setKey} label="Fundamental (concierto)" />
        <label className="field inline"><span>Tipo</span>
          <select value={q} onChange={(e) => setQ(e.target.value)}>{QUALITIES.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.id === 'maj' ? 'mayor' : x.id})</option>)}</select>
        </label>
        <button className="btn" onClick={() => setExtra([...extra, sym])}>+ Añadir a la secuencia</button>
        {extra.length > 0 && <button className="btn" onClick={() => setExtra([])}>Vaciar</button>}
      </div>
      <p className="muted small">Construye una secuencia para practicar conducción de voces. Actual: {symbols.map((s) => chordSymbol(parseChord(s))).join(' → ')} · {names(parseNote(key))}</p>
      <ChordsView key={symbols.join()} symbols={symbols} voiceLead={symbols.length > 1} voicings={symbols.length > 1 ? undefined : (Object.keys(VOICING_LABELS) as VoicingType[])} />
    </Card>
  );
}

function ProgLab() {
  const [key, setKey] = useState('F');
  const [prog, setProg] = useState('blues12');
  const [style, setStyle] = useState<BackingStyle>('swing');
  const [bpm, setBpm] = useState(110);
  const [custom, setCustom] = useState('');
  const p = progressionById(prog);
  const events = useMemo(() => realize(p, parseNote(key)), [p, key]);
  return (
    <Card>
      <div className="row gap wrap">
        <label className="field inline"><span>Progresión</span>
          <select value={prog} onChange={(e) => setProg(e.target.value)}>{PROGRESSIONS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        </label>
        <KeySelect value={key} onChange={setKey} />
        <label className="field inline"><span>Estilo inicial</span>
          <select value={style} onChange={(e) => setStyle(e.target.value as BackingStyle)}>{Object.entries(STYLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
        <label className="field inline"><span>Tempo inicial</span><input type="number" min={40} max={260} value={bpm} onChange={(e) => setBpm(+e.target.value || 100)} /></label>
      </div>
      <p className="muted small">{p.description}</p>
      <BackingPanel events={events} style={style} bpm={bpm} display="scales" showAnalysis />
      <details>
        <summary>Escribir mi propia progresión</summary>
        <CustomProg value={custom} onChange={setCustom} style={style} bpm={bpm} />
      </details>
    </Card>
  );
}

function CustomProg({ value, onChange, style, bpm }: { value: string; onChange: (s: string) => void; style: BackingStyle; bpm: number }) {
  const [evts, setEvts] = useState<ReturnType<typeof realize> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const parse = async () => {
    try {
      const { parseChart } = await import('../theory/progressions');
      setEvts(parseChart(value));
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <div>
      <p className="small">Compases separados por «|». Dos acordes en un compás = 2 tiempos cada uno. Ej.: <code>Dm7 | G7 | Cmaj7 | A7</code></p>
      <input className="wide" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Cm7 F7 | Bbmaj7 | Am7b5 D7 | Gm6" />
      <button className="btn" onClick={parse}>Cargar</button>
      {err && <p className="warn">{err}</p>}
      {evts && <BackingPanel events={evts} style={style} bpm={bpm} showAnalysis display="chords" />}
    </div>
  );
}

function PhrasesLab() {
  const [id, setId] = useState(PHRASES[0].id);
  return (
    <Card>
      <label className="field inline"><span>Frase</span>
        <select value={id} onChange={(e) => setId(e.target.value)}>{PHRASES.map((p) => <option key={p.id} value={p.id}>{p.title} (nivel {p.level})</option>)}</select>
      </label>
      <PhrasePlayer key={id} phraseId={id} />
    </Card>
  );
}

function MetronomeLab() {
  const [bpm, setBpm] = useState(100);
  const [on, setOn] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [bpb, setBpb] = useState(4);
  useEffect(() => () => stopMetronome(), []);
  const metroOff = () => { setOn(false); setBeat(-1); };
  useEffect(() => { if (on) setTransportBpm(bpm); }, [bpm, on]);
  return (
    <Card title="Metrónomo">
      <div className="metro">
        <div className="metro-bpm">{bpm}</div>
        <input type="range" min={30} max={280} value={bpm} onChange={(e) => setBpm(+e.target.value)} />
        <div className="row gap">
          <button className="btn" onClick={() => setBpm(Math.max(30, bpm - 5))}>−5</button>
          <button className={`btn big ${on ? 'stop' : 'primary'}`} onClick={() => { if (on) { stopMetronome(); setOn(false); setBeat(-1); } else { startMetronome(bpm, bpb, setBeat, metroOff); setOn(true); } }}>{on ? '■ Parar' : '▶ Iniciar'}</button>
          <button className="btn" onClick={() => setBpm(Math.min(280, bpm + 5))}>+5</button>
        </div>
        <Segmented size="sm" value={bpb} onChange={(v) => { setBpb(v); if (on) startMetronome(bpm, v, setBeat, metroOff); }} options={[2, 3, 4].map((n) => ({ value: n, label: `${n}/4` }))} />
        <div className="beats">{Array.from({ length: bpb }, (_, i) => <span key={i} className={`beat ${beat === i ? (i === 0 ? 'count' : 'on') : ''}`} />)}</div>
        <p className="muted small">Consejo de swing: pon el metrónomo a la mitad del tempo y siente los clics como tiempos 2 y 4.</p>
      </div>
    </Card>
  );
}

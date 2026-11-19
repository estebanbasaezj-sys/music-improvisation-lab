// "Mi camino": niveles → unidades → nodos (Aprende, Practica, Toca, Desafío), al estilo Duolingo.
import { useMemo, useState } from 'react';
import { LEVELS, PathNode, Unit, nodeById, nodesFor, resolveKey, unitsFor } from '../learn/curriculum';
import { Celebration, ItemSession, SessionResult, buildItems, commitSession, useGenCtx } from '../learn/LessonRunner';
import { completeNode, markNodesByTest, unlockAchievement, useAppState, addXp } from '../progress/store';
import { INSTRUMENT_LABEL, InstrumentId } from '../theory/instruments';
import { Workshop } from '../components/Workshop';
import { BackingPanel } from '../components/BackingPanel';
import { ChordsView } from '../components/ChordsView';
import { PhrasePlayer } from '../components/ExerciseRunner';
import { Recorder } from '../components/Recorder';
import { progressionById, realize } from '../theory/progressions';
import { parseNote } from '../theory/notes';
import { lessonById } from '../content/lessons';
import { Card } from '../components/common';

const KIND_ICON: Record<string, string> = { learn: '📖', practice: '🎯', play: '🎷', challenge: '🏆' };
const KIND_NAME: Record<string, string> = { learn: 'Aprende', practice: 'Practica', play: 'Toca', challenge: 'Desafío' };

export function usePathState(inst: InstrumentId) {
  const s = useAppState();
  const nodes = useMemo(() => nodesFor(inst), [inst]);
  const ps = s.path[inst];
  const doneSet = new Set(Object.keys(ps.nodes));
  const current = nodes.find((n) => !doneSet.has(n.id)) ?? nodes[nodes.length - 1];
  return { nodes, ps, doneSet, current };
}

export function PathPage() {
  const s = useAppState();
  const inst = s.instrument;
  const { nodes, ps, doneSet, current } = usePathState(inst);
  const [sel, setSel] = useState<string | null>(null);
  const units = unitsFor(inst);
  return (
    <div className="page path-page">
      <h1>Mi camino · {INSTRUMENT_LABEL[inst]}</h1>
      {ps.level === null ? (
        <Card className="accent">
          <p><b>¿Ya sabes tocar {INSTRUMENT_LABEL[inst].toLowerCase()}?</b> Haz la prueba de nivel (5–10 minutos, con ejercicios reales y tu instrumento) y empezarás donde te corresponde. Si empiezas de cero, comienza por el Nivel 0.</p>
          <div className="row gap wrap"><a className="btn primary" href="#/nivel">🧭 Prueba de nivel</a><a className="btn" href={`#/nodo/${nodes[0].id}`}>Empezar desde cero</a></div>
        </Card>
      ) : (
        <p className="lead">Nivel de partida según tu prueba: <b>{ps.level} · {LEVELS[ps.level].name}</b>. <a href="#/nivel">Repetir prueba</a></p>
      )}
      {LEVELS.map((lv) => {
        const lvUnits = units.filter((u) => u.level === lv.n);
        const lvNodes = nodes.filter((n) => n.unit.level === lv.n);
        const doneN = lvNodes.filter((n) => doneSet.has(n.id)).length;
        return (
          <section key={lv.n} className="level" style={{ ['--lv' as string]: lv.color }}>
            <div className="level-head">
              <span className="lv-badge">Nivel {lv.n}</span>
              <div><h2>{lv.name}</h2><p className="muted small">{lv.desc}</p></div>
              <span className="lv-prog">{doneN}/{lvNodes.length}</span>
            </div>
            {lvUnits.map((u) => <UnitBlock key={u.id} unit={u} nodes={nodes.filter((n) => n.unit.id === u.id)} doneSet={doneSet} ps={ps} current={current} sel={sel} setSel={setSel} inst={inst} />)}
          </section>
        );
      })}
    </div>
  );
}

function UnitBlock({ unit, nodes, doneSet, ps, current, sel, setSel, inst }: { unit: Unit; nodes: PathNode[]; doneSet: Set<string>; ps: ReturnType<typeof usePathState>['ps']; current: PathNode; sel: string | null; setSel: (s: string | null) => void; inst: InstrumentId }) {
  const unitLocked = nodes[0].index > current.index;
  return (
    <div className={`unit ${unitLocked ? 'locked' : ''}`}>
      <div className="unit-head">
        <div>
          <b>{unit.title}</b>{unit.track !== 'shared' && <span className="pill small">{INSTRUMENT_LABEL[unit.track]}</span>}
          <div className="small muted">{unit.goal}</div>
        </div>
        <div className="row gap">
          {unit.guide?.length ? <details className="guide"><summary>📘 Guía</summary>{unit.guide.map((g) => <a key={g} href={`#/leccion/${g}`}>{lessonById(g)?.title}</a>)}</details> : null}
          {unitLocked && <a className="btn sm" href={`#/saltar/${unit.id}`} title="Prueba para saltar hasta aquí">⏩ Saltar con prueba</a>}
        </div>
      </div>
      <div className="nodes">
        {nodes.map((n, k) => {
          const done = doneSet.has(n.id);
          const isCur = n.id === current.id;
          const locked = !done && n.index > current.index;
          const st = ps.nodes[n.id];
          return (
            <div key={n.id} className="node-wrap" style={{ marginLeft: `${[0, 18, 32, 18, 0][k % 5] * 2}%` }}>
              <button className={`node ${done ? 'done' : ''} ${isCur ? 'cur' : ''} ${locked ? 'lock' : ''} ${n.kind}`} onClick={() => setSel(sel === n.id ? null : n.id)} aria-label={`${KIND_NAME[n.kind]} — ${unit.title}`}>
                <span>{locked ? '🔒' : KIND_ICON[n.kind]}</span>
              </button>
              {done && st && <div className="node-stars">{[1, 2, 3].map((x) => <i key={x} className={x <= st.stars ? 'on' : ''}>★</i>)}</div>}
              {isCur && <div className="node-start">EMPEZAR</div>}
              {sel === n.id && (
                <div className="node-pop">
                  <b>{KIND_NAME[n.kind]}: {unit.title}</b>
                  <p className="small">{n.kind === 'learn' ? 'Conceptos nuevos con ejercicios fáciles.' : n.kind === 'practice' ? 'Más ejercicios, más variados.' : n.kind === 'play' ? unit.play?.text : 'Todo lo de la unidad. Tienes 3 vidas.'}</p>
                  {locked ? <p className="small muted">Completa lo anterior o usa «Saltar con prueba».</p> : <a className="btn primary" href={`#/nodo/${n.id}`}>{done ? 'Repasar (+XP)' : 'Empezar'}</a>}
                  {st?.byTest && <p className="small muted">Superado en la prueba de nivel.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {nodes.length > 0 && inst && null}
    </div>
  );
}

// ---------------------------------------------------------------- nodo
export function NodePage({ id }: { id: string }) {
  const s = useAppState();
  const inst = s.instrument;
  const node = nodeById(inst, id);
  const [seed] = useState(() => Math.floor(Math.random() * 1e6));
  const diff: 1 | 2 | 3 = node?.kind === 'learn' ? 1 : node?.kind === 'practice' ? 2 : 3;
  const ctx = useGenCtx(seed, diff);
  const [result, setResult] = useState<{ res: SessionResult; xp: number; stars: number } | null>(null);
  const items = useMemo(() => (node && node.kind !== 'play' ? buildItems(node.unit.items, node.kind === 'learn' ? 8 : node.kind === 'practice' ? 10 : 12, ctx, !s.game.micOk) : []), [node, ctx]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!node) return <div className="page"><p>Esta lección no existe para {INSTRUMENT_LABEL[inst]}.</p><a href="#/camino">Volver al camino</a></div>;
  const exit = () => { window.location.hash = '#/camino'; };
  if (result) {
    return <div className="page"><Celebration res={result.res} xp={result.xp} stars={result.stars} failed={result.res.failed} title={`${KIND_NAME[node.kind]} completado`} onContinue={() => (result.res.failed ? window.location.reload() : exit())} /></div>;
  }
  if (node.kind === 'play') return <div className="page"><PlayNode node={node} onDone={(stars) => { completeNode(inst, node.id, stars, stars / 3); addXp(15); exit(); }} /></div>;
  return (
    <div className="page lesson-page">
      <ItemSession items={items} ctx={ctx} hearts={node.kind === 'challenge' ? 3 : undefined} intro={node.kind === 'learn' ? node.unit.tips : undefined} title={`${node.unit.title} · ${KIND_NAME[node.kind]}`}
        onExit={exit}
        onFinish={(res) => {
          const acc = res.answered ? res.correct / res.answered : 1;
          const stars = res.failed ? 0 : acc >= 0.95 ? 3 : acc >= 0.8 ? 2 : 1;
          const xp = res.failed ? 5 : 10 + (acc >= 0.999 ? 5 : 0) + (node.kind === 'challenge' ? 10 : 0);
          commitSession(inst, res, xp);
          if (!res.failed) { completeNode(inst, node.id, stars, acc); if (node.kind === 'challenge') unlockAchievement('unit'); }
          setResult({ res, xp, stars });
        }} />
    </div>
  );
}

function PlayNode({ node, onDone }: { node: PathNode; onDone: (stars: number) => void }) {
  const s = useAppState();
  const p = node.unit.play!;
  const key = 'key' in p && p.key ? resolveKey(p.key, s.instrument, s.settings.saxType) : 'C';
  const events = useMemo(() => ('progression' in p ? realize(progressionById(p.progression), parseNote(key)) : []), [p, key]);
  return (
    <div>
      <a className="back" href="#/camino">← Mi camino</a>
      <h1>🎷 {node.unit.title}: ¡a tocar!</h1>
      <p className="lead">{p.text}</p>
      {p.k === 'workshop' && <Workshop progression={p.progression} keyName={key} style={p.style} bpm={p.bpm} ideas={p.ideas} prompts={p.prompts} />}
      {p.k === 'backing' && (
        <>
          <ol className="prompts">{p.prompts.map((x) => <li key={x}>{x}</li>)}</ol>
          <BackingPanel events={events} style={p.style} bpm={p.bpm} display="chords" />
          <details className="rec-inline"><summary>● Grábate</summary><Recorder context={node.unit.title} criteria={['Toqué a tiempo con la base', 'Las notas sonaron limpias', 'Me divertí']} /></details>
        </>
      )}
      {p.k === 'chords' && <ChordsView symbols={p.symbols} voiceLead={p.voiceLead} />}
      {p.k === 'phrase' && <PhrasePlayer phraseId={p.phrase} keyName={p.key} />}
      {p.k === 'song' && <a className="btn primary big" href={`#/cancion/${p.song}`}>Abrir el tema en la biblioteca →</a>}
      {p.k === 'studio' && <a className="btn primary big" href="#/estudio">Abrir el Estudio de transcripción →</a>}
      {p.k === 'record' && <Recorder context={node.unit.title} criteria={p.criteria} />}
      <Card title="¿Cómo te fue?">
        <div className="rate">
          <button className="btn" onClick={() => onDone(1)}>Me costó</button>
          <button className="btn" onClick={() => onDone(2)}>Bien</button>
          <button className="btn primary" onClick={() => onDone(3)}>¡Muy bien!</button>
        </div>
        <p className="muted small">Autoevaluación: marca cómo te sentiste tocando. Completa el nodo y suma 15 XP.</p>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- saltar con prueba
export function SkipTestPage({ unitId }: { unitId: string }) {
  const s = useAppState();
  const inst = s.instrument;
  const nodes = nodesFor(inst);
  const unit = unitsFor(inst).find((u) => u.id === unitId);
  const [seed] = useState(() => Math.floor(Math.random() * 1e6));
  const ctx = useGenCtx(seed, 3);
  const [res, setRes] = useState<SessionResult | null>(null);
  const items = useMemo(() => (unit ? buildItems(unit.items, 10, ctx, !s.game.micOk) : []), [unit, ctx]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!unit) return <div className="page">Unidad no encontrada.</div>;
  if (res) {
    const acc = res.answered ? res.correct / res.answered : 0;
    const ok = !res.failed && acc >= 0.8;
    return (
      <div className="page">
        <Celebration res={res} xp={ok ? 20 : 5} stars={ok ? 1 : 0} failed={!ok} title="¡Saltaste hasta aquí!" onContinue={() => {
          commitSession(inst, res, ok ? 20 : 5);
          if (ok) {
            const upto = nodes.filter((n) => n.index < (nodes.find((x) => x.unit.id === unit.id)?.index ?? 0));
            markNodesByTest(inst, upto.map((n) => n.id), s.path[inst].level ?? unit.level);
          }
          window.location.hash = '#/camino';
        }} extra={!ok ? <p>Necesitabas al menos 80% sin perder las 3 vidas.</p> : <p>Todo lo anterior queda superado; esta unidad empieza ahora.</p>} />
      </div>
    );
  }
  return <div className="page lesson-page"><ItemSession items={items} ctx={ctx} hearts={3} requeueWrong={false} title={`Prueba para saltar a: ${unit.title}`} onExit={() => (window.location.hash = '#/camino')} onFinish={setRes} /></div>;
}

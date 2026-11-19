// "Mi camino": niveles → unidades → nodos (Aprende, Practica, Toca, Desafío), al estilo Duolingo.
import { useEffect, useMemo, useState } from 'react';
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
import { InstrumentArt, Mascot, NodeGlyph } from '../components/Art';
import { lessonLength } from '../product/profile';

const KIND_NAME: Record<string, string> = { learn: 'Aprende', practice: 'Practica', play: 'Toca', challenge: 'Desafío' };

export function usePathState(inst: InstrumentId) {
  const s = useAppState();
  const nodes = useMemo(() => nodesFor(inst), [inst]);
  const ps = s.path[inst];
  const doneSet = new Set(Object.keys(ps.nodes));
  const current = nodes.find((n) => !doneSet.has(n.id)) ?? nodes[nodes.length - 1];
  return { nodes, ps, doneSet, current };
}

const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function PathPage() {
  const s = useAppState();
  const inst = s.instrument;
  const { nodes, ps, doneSet, current } = usePathState(inst);
  const [sel, setSel] = useState<string | null>(null);
  const units = unitsFor(inst);
  // por defecto solo se abre donde vas: tu nivel y tu unidad actual (los demás capítulos quedan cerrados)
  const [openLv, setOpenLv] = useState<Set<number>>(() => new Set([current.unit.level]));
  const [openU, setOpenU] = useState<Set<string>>(() => new Set([current.unit.id]));
  const [q, setQ] = useState('');
  const [jump, setJump] = useState(0);
  const toggle = <T,>(set: Set<T>, v: T) => { const n = new Set(set); if (n.has(v)) n.delete(v); else n.add(v); return n; };
  const goCurrent = () => { setOpenLv((x) => new Set([...x, current.unit.level])); setOpenU((x) => new Set([...x, current.unit.id])); setQ(''); setJump((j) => j + 1); };
  useEffect(() => {
    if (!jump) return;
    const id = window.setTimeout(() => document.querySelector('.node.cur')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    return () => clearTimeout(id);
  }, [jump]);
  const query = norm(q.trim());
  const match = (u: Unit) => !query || norm(`${u.title} ${u.goal} ${u.tips.map((t) => t.title).join(' ')}`).includes(query);
  const allOpen = openLv.size === LEVELS.length && units.every((u) => openU.has(u.id));
  return (
    <div className="page path-page">
      <div className="path-hero">
        <Mascot inst={inst} size={92} say={<>Tu camino de <b>{INSTRUMENT_LABEL[inst].toLowerCase()}</b>: {doneSet.size} de {nodes.length} lecciones completadas.</>} />
      </div>
      {ps.level === null ? (
        <Card className="accent">
          <p><b>¿Ya sabes tocar {INSTRUMENT_LABEL[inst].toLowerCase()}?</b> Haz la prueba de nivel (5–10 minutos, con ejercicios reales y tu instrumento) y empezarás donde te corresponde. Si empiezas de cero, comienza por el Nivel 0.</p>
          <div className="row gap wrap"><a className="btn primary" href="#/nivel">🧭 Prueba de nivel</a><a className="btn" href={`#/nodo/${nodes[0].id}`}>Empezar desde cero</a></div>
        </Card>
      ) : (
        <p className="lead">Nivel de partida según tu prueba: <b>{ps.level} · {LEVELS[ps.level].name}</b>. <a href="#/nivel">Repetir prueba</a></p>
      )}
      <div className="path-tools">
        <div className="level-map" role="navigation" aria-label="Niveles">
          {LEVELS.map((lv) => {
            const lvNodes = nodes.filter((n) => n.unit.level === lv.n);
            const doneN = lvNodes.filter((n) => doneSet.has(n.id)).length;
            const pct = lvNodes.length ? doneN / lvNodes.length : 0;
            return (
              <button key={lv.n} className={`lm-chip ${current.unit.level === lv.n ? 'cur' : ''} ${pct === 1 ? 'full' : ''}`} style={{ ['--lv' as string]: lv.color }}
                onClick={() => { setOpenLv((x) => new Set([...x, lv.n])); window.setTimeout(() => document.getElementById(`lv-${lv.n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40); }}
                title={`${lv.name}: ${doneN}/${lvNodes.length}`}>
                <b>{pct === 1 ? '✓' : lv.n}</b><span>{lv.name}</span><i style={{ width: `${pct * 100}%` }} />
              </button>
            );
          })}
        </div>
        <div className="row gap wrap">
          <button className="btn primary" onClick={goCurrent}>📍 Ir a mi lección</button>
          <button className="btn" onClick={() => { if (allOpen) { setOpenLv(new Set([current.unit.level])); setOpenU(new Set([current.unit.id])); } else { setOpenLv(new Set(LEVELS.map((l) => l.n))); setOpenU(new Set(units.map((u) => u.id))); } }}>{allOpen ? '▴ Cerrar todo' : '▾ Abrir todo'}</button>
          <input className="search grow" placeholder="Buscar unidad: blues, ii-V, arpegios, Si La Sol…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {LEVELS.map((lv) => {
        const lvUnits = units.filter((u) => u.level === lv.n && match(u));
        const lvNodes = nodes.filter((n) => n.unit.level === lv.n);
        const doneN = lvNodes.filter((n) => doneSet.has(n.id)).length;
        if (query && !lvUnits.length) return null;
        const open = !!query || openLv.has(lv.n);
        return (
          <section key={lv.n} id={`lv-${lv.n}`} className={`level ${open ? 'open' : 'closed'}`} style={{ ['--lv' as string]: lv.color }}>
            <button className="level-head" onClick={() => setOpenLv(toggle(openLv, lv.n))} aria-expanded={open}>
              <span className="lv-badge">Nivel {lv.n}</span>
              <div className="lh-text"><h2>{lv.name}</h2><p className="muted small">{lv.desc}</p></div>
              <span className="lv-prog">{doneN === lvNodes.length && lvNodes.length ? '✓ ' : ''}{doneN}/{lvNodes.length}</span>
              <span className="chev" aria-hidden="true">▾</span>
            </button>
            {open && lvUnits.map((u) => (
              <UnitBlock key={u.id} unit={u} unitNo={units.indexOf(u) + 1} nodes={nodes.filter((n) => n.unit.id === u.id)} doneSet={doneSet} ps={ps} current={current} sel={sel} setSel={setSel} inst={inst}
                open={!!query || openU.has(u.id)} onToggle={() => setOpenU(toggle(openU, u.id))} />
            ))}
          </section>
        );
      })}
      {query && !units.some(match) && <p className="muted">Ninguna unidad coincide con «{q}».</p>}
    </div>
  );
}

const TRAIL = [0, 46, 74, 46, 0, -46, -74, -46];

function UnitBlock({ unit, unitNo, nodes, doneSet, ps, current, sel, setSel, inst, open, onToggle }: { unit: Unit; unitNo: number; nodes: PathNode[]; doneSet: Set<string>; ps: ReturnType<typeof usePathState>['ps']; current: PathNode; sel: string | null; setSel: (s: string | null) => void; inst: InstrumentId; open: boolean; onToggle: () => void }) {
  const unitLocked = nodes[0].index > current.index;
  const flip = unitNo % 2 === 0 ? -1 : 1;
  const unitDone = nodes.every((n) => doneSet.has(n.id));
  const stars = nodes.reduce((a, n) => a + (ps.nodes[n.id]?.stars ?? 0), 0);
  const isCurUnit = current.unit.id === unit.id;
  return (
    <div className={`unit ${unitLocked ? 'locked' : ''} ${unitDone ? 'complete' : ''} ${open ? 'open' : 'closed'}`}>
      <div className="unit-banner" role="button" tabIndex={0} aria-expanded={open} onClick={onToggle} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}>
        <div className="ub-text">
          <span className="ub-kicker">Nivel {unit.level} · Unidad {unitNo}{unit.track !== 'shared' ? ` · ${INSTRUMENT_LABEL[unit.track]}` : ''}</span>
          <h3>{unit.title}</h3>
          <p>{unit.goal}</p>
          {!open && (
            <div className="ub-mini">
              {nodes.map((n) => <i key={n.id} className={doneSet.has(n.id) ? 'done' : n.id === current.id ? 'cur' : ''} />)}
              {stars > 0 && <span>★ {stars}/{nodes.length * 3}</span>}
              {isCurUnit && <span className="ub-here">📍 Estás aquí</span>}
            </div>
          )}
        </div>
        <div className="ub-actions" onClick={(e) => e.stopPropagation()}>
          {unit.guide?.length ? <details className="guide"><summary>📘 Guía</summary><div className="guide-pop">{unit.guide.map((g) => <a key={g} href={`#/leccion/${g}`}>{lessonById(g)?.title}</a>)}</div></details> : null}
          {unitLocked && <a className="ub-skip" href={`#/saltar/${unit.id}`} title="Prueba para saltar hasta aquí">⏩ Saltar</a>}
          {unitDone && <span className="ub-done" title="Unidad completada">✓</span>}
          <button className="ub-chev" onClick={onToggle} aria-label={open ? 'Cerrar unidad' : 'Abrir unidad'}>▾</button>
        </div>
      </div>
      {open && <div className="trail">
        {nodes.map((n, k) => {
          const done = doneSet.has(n.id);
          const isCur = n.id === current.id;
          const locked = !done && n.index > current.index;
          const st = ps.nodes[n.id];
          return (
            <div key={n.id} className={`node-wrap ${sel === n.id ? 'open' : ''}`} style={{ transform: `translateX(${TRAIL[k % TRAIL.length] * flip}px)` }}>
              {isCur && <div className="node-start">{done ? 'REPASAR' : 'EMPEZAR'}</div>}
              <button className={`node ${done ? 'done' : ''} ${isCur ? 'cur' : ''} ${locked ? 'lock' : ''} ${n.kind}`} onClick={() => setSel(sel === n.id ? null : n.id)} aria-label={`${KIND_NAME[n.kind]} — ${unit.title}${locked ? ' (bloqueado)' : done ? ' (completado)' : ''}`}>
                <span className="node-face"><NodeGlyph kind={n.kind} inst={inst} locked={locked} done={done} /></span>
              </button>
              {done && st && <div className="node-stars">{[1, 2, 3].map((x) => <i key={x} className={x <= st.stars ? 'on' : ''}>★</i>)}</div>}
              {sel === n.id && (
                <div className="node-pop">
                  <span className="np-kind">{KIND_NAME[n.kind]}</span>
                  <b>{unit.title}</b>
                  <p className="small">{n.kind === 'learn' ? 'Conceptos nuevos con ejercicios fáciles.' : n.kind === 'practice' ? 'Más ejercicios, más variados.' : n.kind === 'play' ? unit.play?.text : 'Todo lo de la unidad. Tienes 3 vidas.'}</p>
                  {locked ? <p className="small">🔒 Completa lo anterior o usa «Saltar».</p> : <a className="btn primary" href={`#/nodo/${n.id}`}>{done ? 'Repasar (+XP)' : 'Empezar'}</a>}
                  {st?.byTest && <p className="small">Superado en la prueba de nivel.</p>}
                </div>
              )}
            </div>
          );
        })}
        <div className={`trail-art ${flip > 0 ? 'left' : 'right'}`} aria-hidden="true">
          <InstrumentArt inst={inst} size={118} mood={unitLocked ? 'none' : unitDone ? 'happy' : 'wow'} className={unitLocked ? 'dim' : 'bob'} />
        </div>
      </div>}
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
  const items = useMemo(() => (node && node.kind !== 'play' ? buildItems(node.unit.items, lessonLength(s, node.kind), ctx, !s.game.micOk) : []), [node, ctx]); // eslint-disable-line react-hooks/exhaustive-deps
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
      <h1 className="row gap"><InstrumentArt inst={s.instrument} size={52} /> {node.unit.title}: ¡a tocar!</h1>
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

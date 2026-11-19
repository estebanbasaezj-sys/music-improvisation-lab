// Inicio estilo Duolingo: racha, meta diaria de XP, "Continuar" en el camino y práctica personalizada.
import { useMemo, useState } from 'react';
import { ACHIEVEMENTS, currentStreak, update, useAppState, xpToday, dueLessons, dueVocab } from '../progress/store';
import { INSTRUMENT_LABEL } from '../theory/instruments';
import { LEVELS } from '../learn/curriculum';
import { usePathState } from './Path';
import { Card } from '../components/common';
import { MicHelp } from '../components/MicHelp';
import { InstrumentArt, Mascot } from '../components/Art';
import { StreakWeek } from '../components/StreakOverlay';
import { ItemSession, SessionResult, Celebration, commitSession, useGenCtx } from '../learn/LessonRunner';
import { generateItem, ItemSpec } from '../learn/items';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? '¡Buenos días!' : h < 20 ? '¡Buenas tardes!' : '¡Buenas noches!';
}

const KIND_NAME: Record<string, string> = { learn: 'Aprende', practice: 'Practica', play: 'Toca', challenge: 'Desafío' };

export function Home() {
  const s = useAppState();
  const inst = s.instrument;
  const { ps, current, doneSet, nodes } = usePathState(inst);
  const streak = currentStreak(s);
  const xp = xpToday(s);
  const goal = s.game.dailyGoal;
  const pct = Math.min(1, xp / goal);
  const mistakes = ps.mistakes.length;
  const reviews = dueLessons(s.progress[inst]).length + dueVocab(s, inst).length;
  const fresh = ps.level === null && doneSet.size === 0;
  return (
    <div className="page home">
      {!fresh && (
        <div className="home-hero">
          <Mascot inst={inst} size={104} say={<>{greeting()} {xp >= goal ? <>¡Ya cumpliste tu meta de hoy! 🎉</> : streak ? <>Llevas <b>{streak} {streak === 1 ? 'día' : 'días'}</b> de racha: haz una lección para mantenerla.</> : <>Haz una lección corta para empezar tu racha.</>}</>} />
          <div className="hh-week"><span className="small muted">Esta semana</span><StreakWeek s={s} /></div>
        </div>
      )}
      <div className="home-stats">
        <div className={`hs streak ${streak ? 'on' : ''}`}><span className="hs-ico hs-flame">🔥</span><b>{streak}</b><small>días de racha</small></div>
        <div className="hs ring">
          <svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" className="ring-bg" /><circle cx="18" cy="18" r="15.5" className="ring-fg" style={{ strokeDasharray: `${pct * 97.4} 97.4` }} /></svg>
          <b>{xp}</b><small>de {goal} XP hoy</small>
        </div>
        <div className="hs"><span className="hs-ico">🧊</span><b>{s.game.streak.freezes}</b><small>protector(es) de racha</small></div>
        <div className="hs"><span className="hs-ico">🏅</span><b>{s.game.achievements.length}</b><small>logros</small></div>
      </div>
      {fresh ? (
        <Card className="welcome">
          <Mascot inst={inst} size={130} />
          <h1>¡Hola! Empecemos con {INSTRUMENT_LABEL[inst].toLowerCase()}</h1>
          <p>Aprenderás con lecciones cortas, tocando desde el primer día: escuchar, imitar, entender y crear. ¿Por dónde empiezas?</p>
          <div className="row gap wrap center">
            <a className="btn primary big" href="#/nivel">🧭 Ya sé algo: prueba de nivel</a>
            <a className="btn big" href={`#/nodo/${nodes[0].id}`}>🌱 Empiezo desde cero</a>
          </div>
          <p className="muted small">Cada instrumento tiene su propio nivel: cambia arriba entre saxofón, guitarra y piano.</p>
        </Card>
      ) : (
        <Card className="continue">
          <div className="cont-lv" style={{ background: LEVELS[current.unit.level].color }}><InstrumentArt inst={inst} size={58} /><span>Nivel {current.unit.level}</span></div>
          <div className="cont-body">
            <span className="muted small">{LEVELS[current.unit.level].name} · {doneSet.size}/{nodes.length} completados</span>
            <h2>{current.unit.title}</h2>
            <p>{KIND_NAME[current.kind]} — {current.unit.goal}</p>
          </div>
          <a className="btn primary big" href={`#/nodo/${current.id}`}>Continuar</a>
        </Card>
      )}
      <MicHelp onlyWhenEmbedded />
      <h2>Práctica personalizada</h2>
      <div className="practice-grid">
        <a className="pcard" href="#/repaso"><span>🔁</span><b>Repasar errores</b><small>{mistakes ? `${mistakes} ejercicio(s) que fallaste` : 'Sin errores pendientes'}</small></a>
        <a className="pcard feature" href="#/repertorio"><span>📚</span><b>Repertorio</b><small>Temas clásicos para tocar y solear encima</small></a>
        <a className="pcard" href="#/lab"><span>✨</span><b>Taller de improvisación</b><small>Solos explicados, repite y crea</small></a>
        <a className="pcard feature" href="#/estudio"><span>🎧</span><b>Sacar solos</b><small>Separa el instrumento con IA, loop, partitura y explicación</small></a>
        <a className="pcard" href="#/vocabulario"><span>🗂</span><b>Mi vocabulario</b><small>{reviews ? `${reviews} repaso(s) para hoy` : 'Frases en 12 tonalidades'}</small></a>
        <a className="pcard" href="#/sesion"><span>⏱</span><b>Sesión guiada</b><small>10–45 min por bloques</small></a>
        <a className="pcard" href="#/nivel"><span>🧭</span><b>Prueba de nivel</b><small>{ps.level !== null ? `Tu nivel: ${ps.level}` : 'Descubre tu nivel'}</small></a>
      </div>
      <Card title="Meta diaria">
        <div className="chip-row">
          {[{ v: 10, n: 'Relajada' }, { v: 20, n: 'Normal' }, { v: 30, n: 'Seria' }, { v: 50, n: 'Intensa' }].map((g) => (
            <button key={g.v} className={`chip big ${goal === g.v ? 'on' : ''}`} onClick={() => update((x) => { x.game.dailyGoal = g.v; })}>{g.n} · {g.v} XP</button>
          ))}
        </div>
        <p className="muted small">Una lección ≈ 10–15 XP (unos 3–5 minutos). Cada 7 días de racha ganas un protector que salva un día perdido.</p>
      </Card>
      <Card title="Logros">
        <div className="ach-grid">
          {Object.entries(ACHIEVEMENTS).map(([id, a]) => <div key={id} className={`ach ${s.game.achievements.includes(id) ? 'on' : ''}`}><span>{a.icon}</span><b>{a.name}</b><small>{a.desc}</small></div>)}
        </div>
      </Card>
    </div>
  );
}

/** Repaso de errores: rehace los ejercicios que fallaste (con datos nuevos). */
export function ReviewPage() {
  const s = useAppState();
  const inst = s.instrument;
  const [seed] = useState(() => Math.floor(Math.random() * 1e6));
  const ctx = useGenCtx(seed, 2);
  const [res, setRes] = useState<SessionResult | null>(null);
  const items = useMemo(() => s.path[inst].mistakes.slice(-10).map((m, i) => { try { return generateItem(JSON.parse(m.spec) as ItemSpec, { ...ctx, seed: seed + i * 11 }); } catch { return null; } }).filter((x): x is NonNullable<typeof x> => !!x), [inst, ctx]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!items.length && !res) return <div className="page"><Card><p>¡No tienes errores pendientes! Los ejercicios que falles en el camino aparecerán aquí para repasarlos.</p><a className="btn" href="#/hoy">Volver</a></Card></div>;
  if (res) return <div className="page"><Celebration res={res} xp={10} stars={res.answered && res.correct / res.answered >= 0.95 ? 3 : 2} title="Repaso completado" onContinue={() => { commitSession(inst, res, 10); window.location.hash = '#/hoy'; }} /></div>;
  return <div className="page lesson-page"><ItemSession items={items} ctx={ctx} title="Repaso de errores" onExit={() => (window.location.hash = '#/hoy')} onFinish={setRes} /></div>;
}

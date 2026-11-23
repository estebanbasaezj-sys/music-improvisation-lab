// Inicio estilo Duolingo: racha, meta diaria de XP, "Continuar" en el camino y práctica personalizada.
import { useMemo, useState } from 'react';
import { ACHIEVEMENTS, AgeProfile, CHEST_XP, currentStreak, dailyQuests, openChest, playerLevel, today, update, useAppState, xpToday, dueLessons, dueVocab } from '../progress/store';
import { PROFILE_INFO } from '../product/profile';
import { trackFeature } from '../telemetry/telemetry';
import { INSTRUMENT_LABEL, InstrumentId, SAX_TRANSPOSITION, SaxType } from '../theory/instruments';
import { LEVELS } from '../learn/curriculum';
import { usePathState } from './Path';
import { Card } from '../components/common';
import { MicHelp } from '../components/MicHelp';
import { Icon, InstrumentArt, Mascot } from '../components/Art';
import { BAND_MINUTES, BAND_ROUTE, BAND_TITLE } from './BandCall';
import { resumeAudioNow } from '../audio/unlock';
import { StreakWeek } from '../components/StreakOverlay';
import { ItemSession, SessionResult, Celebration, commitSession, useGenCtx } from '../learn/LessonRunner';
import { generateItem, ItemSpec } from '../learn/items';

const KIND_NAME: Record<string, string> = { learn: 'Aprende', practice: 'Practica', play: 'Toca', challenge: 'Desafío' };

function ago(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 2) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

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
  const quests = dailyQuests(s);
  const questsDone = quests.every((q) => q.value >= q.target);
  const chestOpen = s.game.chestDay === today();
  const lv = playerLevel(s.game.xp);
  const spot = s.resume[inst];
  const first = !s.settings.instrumentChosen && doneSet.size === 0 && !spot && s.game.xp === 0;
  return (
    <div className="page home">
      {first ? <FirstPractice /> : spot ? (
        <section className="rec-card resume" aria-labelledby="rec-title">
          <div className="rc-art"><Mascot inst={inst} size={88} /></div>
          <div className="rc-body">
            <span className="eyebrow">Para retomar · {ago(spot.at)}</span>
            <h1 id="rec-title">{spot.title}</h1>
            <p className="rc-goal">{spot.detail}</p>
            <ul className="rc-meta">
              {spot.minutes && <li>⏱ {spot.minutes} min</li>}
              <li><InstrumentArt inst={inst} size={20} /> {INSTRUMENT_LABEL[inst]}</li>
              <li>Se abre con tu fragmento, tempo y tonalidad</li>
            </ul>
            <div className="rc-actions">
              <a className="btn primary big" href={spot.route} onClick={() => trackFeature('retomar', { id: spot.id })}><Icon name="play" size={20} /> Retomar práctica</a>
              <a className="btn" href={`#/nodo/${current.id}`}>O sigue tu Camino: {current.unit.title}</a>
            </div>
            <div className="rc-links"><a href="#/camino">🧭 Ver mi Camino</a><a href="#/ajustar">🎚 Ajustar mi nivel</a></div>
          </div>
        </section>
      ) : (
        <section className="rec-card" aria-labelledby="rec-title">
          <div className="rc-art"><Mascot inst={inst} size={88} /></div>
          <div className="rc-body">
            <span className="eyebrow">Tu práctica recomendada · {LEVELS[current.unit.level].name}</span>
            <h1 id="rec-title">{current.unit.title}</h1>
            <p className="rc-goal"><b>Objetivo:</b> {current.unit.goal}</p>
            <ul className="rc-meta">
              <li>⏱ 3–5 min</li>
              <li>{KIND_NAME[current.kind]}</li>
              <li>{doneSet.size}/{nodes.length} del Camino</li>
            </ul>
            <div className="rc-actions">
              <a className="btn primary big" href={`#/nodo/${current.id}`}><Icon name="play" size={20} /> Empezar</a>
              <a className="btn" href={`${BAND_ROUTE}?auto=1`} onClick={() => resumeAudioNow()}>Calentar: {BAND_TITLE.toLowerCase()} ({BAND_MINUTES} min)</a>
            </div>
            <div className="rc-links"><a href="#/camino">🧭 Ver mi Camino</a><a href="#/ajustar">🎚 Ajustar mi nivel</a></div>
          </div>
        </section>
      )}

      <MicHelp onlyWhenEmbedded />

      <h2 className="sec-title">Tu día</h2>
      <div className="day-grid">
        <div className="card quests">
          <div className="row between"><b>🎯 Misiones de hoy</b><span className="small muted">se renuevan cada día</span></div>
          {quests.map((q) => (
            <div key={q.id} className={`quest ${q.value >= q.target ? 'done' : ''}`}>
              <span className="q-ico" aria-hidden="true">{q.value >= q.target ? '✅' : q.icon}</span>
              <div className="q-body"><span>{q.text}{q.value >= q.target && <span className="sr-only"> (cumplida)</span>}</span><span className="q-bar"><span style={{ width: `${(q.value / q.target) * 100}%` }} /></span></div>
              <span className="q-num">{q.value}/{q.target}</span>
            </div>
          ))}
          <button className={`chest ${questsDone && !chestOpen ? 'ready' : ''} ${chestOpen ? 'open' : ''}`} disabled={!questsDone || chestOpen} onClick={() => { openChest(); trackFeature('cofre'); }}>
            <span className="chest-ico" aria-hidden="true">{chestOpen ? '🎉' : '🎁'}</span>
            {chestOpen ? `¡Cofre abierto! +${CHEST_XP} XP` : questsDone ? `¡Abre tu cofre! +${CHEST_XP} XP` : 'Completa las 3 misiones para abrir el cofre'}
          </button>
        </div>
        <div className="day-stats">
          <a className="ds ds-xp" href="#/ajustar" title="Cambiar la meta diaria">
            <svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15.5" className="ring-bg" /><circle cx="18" cy="18" r="15.5" className="ring-fg" style={{ strokeDasharray: `${pct * 97.4} 97.4` }} /></svg>
            <span><b>{xp}</b> de {goal} XP</span><small>meta de hoy</small>
          </a>
          <div className={`ds ds-streak ${streak ? 'on' : ''}`}>
            <span className="ds-ico" aria-hidden="true">🔥</span><span><b>{streak}</b> {streak === 1 ? 'día' : 'días'}</span><small>de racha · 🧊 {s.game.streak.freezes} protector{s.game.streak.freezes === 1 ? '' : 'es'}</small>
            <StreakWeek s={s} />
          </div>
          <div className="ds ds-level">
            <span className="pl-badge" aria-hidden="true">{lv.level}</span>
            <span><b>Nivel {lv.level}</b></span><span className="q-bar"><span style={{ width: `${(lv.into / lv.need) * 100}%` }} /></span><small>{lv.into} / {lv.need} XP para el nivel {lv.level + 1}</small>
          </div>
          <a className="ds ds-ach" href="#logros" onClick={(e) => { e.preventDefault(); document.getElementById('logros')?.setAttribute('open', ''); document.getElementById('logros')?.scrollIntoView({ behavior: 'smooth' }); }}>
            <span className="ds-ico" aria-hidden="true">🏅</span><span><b>{s.game.achievements.length}</b> de {Object.keys(ACHIEVEMENTS).length} logros</span><small>ver logros</small>
          </a>
        </div>
      </div>

      {!first && !s.settings.profile && <ProfileChooser compact />}

      <h2 className="sec-title">Más formas de practicar</h2>
      <div className="practice-grid">
        <a className="pcard" href="#/sesion"><span aria-hidden="true">⏱</span><b>Sesión guiada</b><small>{s.guided[inst] ? 'Tienes una sesión empezada' : '10–45 min por bloques'}</small></a>
        <a className="pcard" href={`${BAND_ROUTE}`}><span aria-hidden="true">🎺</span><b>Responde a la banda</b><small>Llamada y respuesta, {BAND_MINUTES} min</small></a>
        <a className="pcard" href="#/repaso"><span aria-hidden="true">🔁</span><b>Repasar errores</b><small>{mistakes ? `${mistakes} ejercicio(s) que fallaste` : 'Sin errores pendientes'}</small></a>
        <a className="pcard feature" href="#/repertorio"><span aria-hidden="true">📚</span><b>Repertorio</b><small>Temas clásicos para tocar y solear encima</small></a>
        <a className="pcard" href="#/lab?tab=taller"><span aria-hidden="true">✨</span><b>Taller de improvisación</b><small>Solos explicados, repite y crea</small></a>
        <a className="pcard" href="#/vocabulario"><span aria-hidden="true">🗂</span><b>Mi vocabulario</b><small>{reviews ? `${reviews} repaso(s) para hoy` : 'Frases en 12 tonalidades'}</small></a>
        <a className="pcard" href="#/estudio"><span aria-hidden="true">🎧</span><b>Sacar solos</b><small>Separa el instrumento, loop y partitura</small></a>
        <a className="pcard" href="#/ajustar"><span aria-hidden="true">🎚</span><b>Ajustar mi nivel</b><small>{ps.level !== null ? `Tu nivel: ${ps.level}` : 'Prueba de nivel o diagnóstico'}</small></a>
      </div>

      <details className="card ach-box" id="logros">
        <summary><b>🏅 Logros</b> <span className="muted small">{s.game.achievements.length} de {Object.keys(ACHIEVEMENTS).length}</span></summary>
        <div className="ach-grid">
          {Object.entries(ACHIEVEMENTS).map(([id, a]) => {
            const on = s.game.achievements.includes(id);
            return <div key={id} className={`ach ${on ? 'on' : ''}`}><span aria-hidden="true">{a.icon}</span><b>{a.name}{on && ' ✓'}</b><small>{on ? a.desc : `Pendiente: ${a.desc.toLowerCase()}`}</small></div>;
          })}
        </div>
      </details>
    </div>
  );
}

/** Primera visita: elegir instrumento (y saxo) y, con el siguiente toque, sonar el ejemplo. */
function FirstPractice() {
  const s = useAppState();
  const [picked, setPicked] = useState<InstrumentId | null>(null);
  const [sax, setSax] = useState<SaxType | null>(null);
  const ready = picked && (picked !== 'sax' || sax);
  const choose = (i: InstrumentId) => { setPicked(i); setSax(null); update((x) => { x.instrument = i; }); };
  const chooseSax = (t: SaxType) => { setSax(t); update((x) => { x.settings.saxType = t; }); };
  const start = () => {
    // dentro del toque: desbloquea el audio (y el modo silencio del iPhone) para que el ejemplo suene enseguida
    resumeAudioNow();
    update((x) => { x.settings.instrumentChosen = true; });
    trackFeature('primera-practica', { inst: picked ?? s.instrument });
    window.location.hash = `${BAND_ROUTE.slice(1)}?auto=1`;
  };
  return (
    <section className="rec-card first" aria-labelledby="rec-title">
      <div className="rc-art"><Mascot inst={picked ?? s.instrument} size={96} /></div>
      <div className="rc-body">
        <span className="eyebrow">Tu primera práctica · {BAND_MINUTES} min · sin micrófono</span>
        <h1 id="rec-title">{BAND_TITLE}</h1>
        <p className="rc-goal"><b>Objetivo:</b> escuchar una frase corta de la banda y contestarla con tres notas. Desde el primer minuto, improvisas.</p>
        <div className="rc-step">
          <span className="rc-num">1</span>
          <div>
            <b>¿Qué tocas?</b>
            <div className="pick-row" role="radiogroup" aria-label="Instrumento">
              {(['sax', 'guitar', 'piano'] as InstrumentId[]).map((i) => (
                <button key={i} role="radio" aria-checked={picked === i} className={`pick ${picked === i ? 'on' : ''}`} onClick={() => choose(i)}>
                  <InstrumentArt inst={i} size={40} /><span>{INSTRUMENT_LABEL[i]}{picked === i && ' ✓'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        {picked === 'sax' && (
          <div className="rc-step">
            <span className="rc-num">2</span>
            <div>
              <b>¿Qué saxofón?</b>
              <div className="pick-row" role="radiogroup" aria-label="Tipo de saxofón">
                {(['tenor', 'alto'] as SaxType[]).map((t) => (
                  <button key={t} role="radio" aria-checked={sax === t} className={`pick sm ${sax === t ? 'on' : ''}`} onClick={() => chooseSax(t)}>
                    <span>{SAX_TRANSPOSITION[t].label}{sax === t && ' ✓'}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="rc-actions">
          <button className="btn primary big" disabled={!ready} onClick={start}><Icon name="play" size={20} /> {ready ? 'Empezar: escuchar el ejemplo' : picked === 'sax' ? 'Elige tu saxofón' : 'Elige tu instrumento'}</button>
        </div>
        <div className="rc-links"><a href="#/camino">🧭 Ver mi Camino</a><a href="#/ajustar">🎚 Ajustar mi nivel</a></div>
      </div>
    </section>
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

/** Primera vez: ¿quién va a practicar? Ajusta menú, meta diaria y largo de las lecciones. */
function ProfileChooser({ compact }: { compact?: boolean }) {
  const choose = (p: AgeProfile) => {
    update((x) => { x.settings.profile = p; x.settings.simple = null; x.game.dailyGoal = PROFILE_INFO[p].goal; });
    trackFeature('perfil', { perfil: p });
  };
  return (
    <div className={`card profile-chooser ${compact ? 'compact' : ''}`}>
      <h2>¿Quién va a practicar?</h2>
      <p className="muted">Opcional: así mostramos lo justo y necesario. Puedes cambiarlo cuando quieras en «Ajustar mi nivel».</p>
      <div className="profile-grid">
        {(Object.keys(PROFILE_INFO) as AgeProfile[]).map((p) => (
          <button key={p} className="profile-card" onClick={() => choose(p)}>
            <span className="pc-ico">{PROFILE_INFO[p].icon}</span>
            <b>{PROFILE_INFO[p].label}</b>
            <small>{PROFILE_INFO[p].sub}</small>
            <span className="small">{PROFILE_INFO[p].text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

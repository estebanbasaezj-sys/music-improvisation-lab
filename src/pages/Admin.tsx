// Administración (para el equipo): observabilidad del uso, operaciones de IA y su costo, errores, capacidades
// del equipo, planes de licencia y el plan de lanzamiento. Los datos son de ESTE navegador (telemetría local);
// para ver a todos los usuarios hace falta un servicio de analítica con consentimiento (ver «Lanzamiento»).
import { useMemo, useState, useSyncExternalStore, useEffect } from 'react';
import { clearEvents, getEvents, subscribeTelemetry, summarize, dayOf } from '../telemetry/telemetry';
import { CLAUDE_PRICES, FEATURES, PRICES_CHECKED, cloudCostPerUser } from '../product/plans';
import { getState, monthKey, playerLevel, update, useAppState } from '../progress/store';
import { Card, Segmented } from '../components/common';
import { LAUNCH_STEPS } from '../product/launch';

type Tab = 'uso' | 'ia' | 'equipo' | 'planes' | 'lanzamiento';
const AI_LABEL: Record<string, string> = {
  'separacion-ia': 'Separación de instrumentos (SCNet)', 'separacion-centro': 'Separación sin IA', transcripcion: 'Transcripción (Basic Pitch)', armonia: 'Armonía y tempo',
  realce: 'Realce de la melodía', 'velocidad-tono': 'Velocidad y tono (SoundTouch)', 'profesor-solo': 'Profesor IA: solo de ejemplo', 'profesor-pregunta': 'Profesor IA: pregunta', 'deteccion-microfono': 'Detección por micrófono',
};
const fmtMs = (ms: number) => (ms < 1000 ? `${Math.round(ms)} ms` : ms < 120000 ? `${(ms / 1000).toFixed(1)} s` : `${(ms / 60000).toFixed(1)} min`);
const usd = (x: number) => (x < 0.01 ? `US$ ${x.toFixed(4)}` : `US$ ${x.toFixed(2)}`);

function DayBars({ days }: { days: [string, { sessions: number; lessons: number; xp: number }][] }) {
  const [hover, setHover] = useState<number | null>(null);
  const last = useMemo(() => {
    const out: { d: string; v: number; s: number; xp: number }[] = [];
    const map = new Map(days);
    for (let i = 29; i >= 0; i--) { const d = dayOf(Date.now() - i * 864e5); const r = map.get(d); out.push({ d, v: r?.lessons ?? 0, s: r?.sessions ?? 0, xp: r?.xp ?? 0 }); }
    return out;
  }, [days]);
  const max = Math.max(1, ...last.map((x) => x.v));
  const W = 600, H = 140, bw = W / last.length;
  return (
    <figure className="daybars">
      <figcaption className="small"><b>Lecciones completadas por día</b> · últimos 30 días</figcaption>
      <div className="daybars-plot" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label="Lecciones por día">
          {[0.5, 1].map((g) => <line key={g} x1={0} x2={W} y1={H - H * g} y2={H - H * g} className="grid" />)}
          <line x1={0} x2={W} y1={H} y2={H} className="axis" />
          {last.map((x, i) => {
            const h = (x.v / max) * (H - 8);
            return (
              <g key={x.d} onMouseEnter={() => setHover(i)}>
                <rect x={i * bw} y={0} width={bw} height={H} fill="transparent" />
                {x.v > 0 && <path d={`M${i * bw + 1} ${H} V${H - h + 4} q0 -4 4 -4 h${bw - 10} q4 0 4 4 V${H} Z`} className={`bar ${hover === i ? 'on' : ''}`} />}
              </g>
            );
          })}
          <text x={0} y={H + 15} className="tick">{last[0].d.slice(5)}</text>
          <text x={W} y={H + 15} className="tick" textAnchor="end">hoy</text>
          <text x={4} y={12} className="tick">{max}</text>
        </svg>
        {hover !== null && (
          <div className="daybars-tip" style={{ left: `${((hover + 0.5) / last.length) * 100}%` }}>
            <b>{last[hover].d}</b><span>{last[hover].v} lecciones · {last[hover].xp} XP · {last[hover].s} sesiones</span>
          </div>
        )}
      </div>
    </figure>
  );
}

export function AdminPage() {
  const s = useAppState();
  const evts = useSyncExternalStore(subscribeTelemetry, getEvents, getEvents);
  const sum = useMemo(() => summarize(evts), [evts]);
  const [tab, setTab] = useState<Tab>('uso');
  const [storage, setStorage] = useState<{ usage?: number; quota?: number } | null>(null);
  useEffect(() => { navigator.storage?.estimate?.().then((e) => setStorage({ usage: e.usage, quota: e.quota })).catch(() => undefined); }, []);

  // calculadora de costo de IA en la nube (profesor IA)
  const cloud = sum.ai.filter((a) => a.where === 'cloud');
  const cloudCalls = cloud.reduce((a, x) => a + x.count, 0);
  const avgIn = cloudCalls ? Math.round(cloud.reduce((a, x) => a + x.tokensIn, 0) / cloudCalls) : 0;
  const avgOut = cloudCalls ? Math.round(cloud.reduce((a, x) => a + x.tokensOut, 0) / cloudCalls) : 0;
  const [model, setModel] = useState(CLAUDE_PRICES[0].id);
  const [calls, setCalls] = useState(40);
  const [tin, setTin] = useState(avgIn || 2500);
  const [tout, setTout] = useState(avgOut || 600);
  const [cached, setCached] = useState(50);
  const [users, setUsers] = useState(500);
  const [price, setPrice] = useState(4.99);
  const [fee, setFee] = useState(8);
  const pm = CLAUDE_PRICES.find((x) => x.id === model)!;
  const perUser = cloudCostPerUser({ priceIn: pm.input, priceOut: pm.output, callsPerUser: calls, tokensIn: tin, tokensOut: tout, cachedShare: cached / 100 });
  const net = price * (1 - fee / 100) - perUser;

  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem('mil-launch') || '{}'); } catch { return {}; } });
  const toggleStep = (id: string) => { const n = { ...done, [id]: !done[id] }; setDone(n); try { localStorage.setItem('mil-launch', JSON.stringify(n)); } catch { /* sin almacenamiento */ } };

  const totalLessons = sum.days.reduce((a, [, d]) => a + d.lessons, 0);
  const activeDays = sum.days.filter(([, d]) => d.sessions || d.lessons).length;
  const lv = playerLevel(s.game.xp);
  const exportAll = () => {
    const blob = new Blob([JSON.stringify({ exportado: new Date().toISOString(), eventos: getEvents(), estado: getState() }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `mil-observabilidad-${dayOf(Date.now())}.json`; a.click();
  };

  return (
    <div className="page admin">
      <div className="page-hero admin-hero">
        <h1>Administración</h1>
        <p className="lead">Observabilidad de la app en este navegador: uso, operaciones de IA y su costo, errores, capacidades del equipo, planes y el plan de lanzamiento.</p>
        <p className="small muted">Telemetría local y privada: nada sale de este equipo. {sum.first ? `Registrando desde el ${new Date(sum.first).toLocaleDateString()}` : 'Aún no hay eventos'} · {sum.total} eventos.</p>
      </div>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'uso', label: '📊 Uso' }, { value: 'ia', label: '🤖 IA y costos' }, { value: 'equipo', label: '🖥 Errores y equipo' }, { value: 'planes', label: '💳 Planes' }, { value: 'lanzamiento', label: '🚀 Lanzamiento' }]} />

      {tab === 'uso' && (
        <>
          <div className="kpis">
            <div className="kpi"><small>Días activos</small><b>{activeDays}</b></div>
            <div className="kpi"><small>Sesiones</small><b>{sum.days.reduce((a, [, d]) => a + d.sessions, 0)}</b></div>
            <div className="kpi"><small>Lecciones</small><b>{totalLessons}</b></div>
            <div className="kpi"><small>XP total</small><b>{s.game.xp}</b></div>
            <div className="kpi"><small>Nivel de jugador</small><b>{lv.level}</b></div>
            <div className="kpi"><small>Operaciones de IA</small><b>{sum.ai.reduce((a, x) => a + x.count, 0)}</b></div>
          </div>
          <Card><DayBars days={sum.days} /></Card>
          <div className="grid2">
            <Card title="Pantallas más visitadas">
              {sum.pages.length ? <table className="status-table"><tbody>{sum.pages.slice(0, 12).map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{v}</td></tr>)}</tbody></table> : <p className="muted small">Sin datos todavía.</p>}
            </Card>
            <Card title="Funciones usadas">
              {sum.features.length ? <table className="status-table"><tbody>{sum.features.slice(0, 12).map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{v}</td></tr>)}</tbody></table> : <p className="muted small">Sin datos todavía.</p>}
            </Card>
          </div>
        </>
      )}

      {tab === 'ia' && (
        <>
          <Card title="Operaciones de IA y cómputo medidas">
            {sum.ai.length ? (
              <div className="table-wrap">
                <table className="status-table">
                  <thead><tr><th>Operación</th><th>Dónde corre</th><th className="num">Usos</th><th className="num">Fallos</th><th className="num">Audio procesado</th><th className="num">Tiempo medio</th><th className="num">Tiempo / audio</th><th>Dispositivo</th></tr></thead>
                  <tbody>{sum.ai.map((a) => (
                    <tr key={a.op}>
                      <td>{AI_LABEL[a.op] ?? a.op}</td>
                      <td>{a.where === 'cloud' ? '☁️ nube (cuesta por uso)' : '💻 equipo del usuario (US$ 0)'}</td>
                      <td className="num">{a.count}</td><td className="num">{a.fails}</td>
                      <td className="num">{a.inputSec ? `${(a.inputSec / 60).toFixed(1)} min` : '—'}</td>
                      <td className="num">{fmtMs(a.ms / a.count)}</td>
                      <td className="num">{a.inputSec ? `${(a.ms / 1000 / a.inputSec).toFixed(2)}×` : '—'}</td>
                      <td className="small">{Object.entries(a.devices).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p className="muted small">Todavía no hay operaciones medidas. Usa «Sacar solos» (separar, transcribir, analizar) o el Profesor IA y vuelve aquí.</p>}
            <p className="small">«Tiempo / audio» es cuánto tarda cada segundo de audio (1,00× = tiempo real). Las operaciones en el <b>equipo del usuario</b> no le cuestan nada al negocio por uso: la separación (SCNet), la transcripción (Basic Pitch), la armonía, la detección por micrófono y la explicación del solo ya corren así. Solo el <b>Profesor IA</b> usa la nube.</p>
          </Card>
          <Card title="Calculadora: costo del Profesor IA en la nube">
            <p className="small">Medido en este navegador: {cloudCalls ? <>{cloudCalls} llamadas, ≈{avgIn} tokens de entrada y ≈{avgOut} de salida por llamada (estimados por caracteres).</> : 'aún sin llamadas (se usan valores de ejemplo, edítalos).'} Precios oficiales de Claude por millón de tokens, consultados el {PRICES_CHECKED}.</p>
            <div className="calc">
              <label>Modelo<select value={model} onChange={(e) => setModel(e.target.value)}>{CLAUDE_PRICES.map((p) => <option key={p.id} value={p.id}>{p.name} · US$ {p.input} / {p.output} por M tokens — {p.note}</option>)}</select></label>
              <label>Llamadas por usuario al mes<input type="number" min={0} value={calls} onChange={(e) => setCalls(+e.target.value)} /></label>
              <label>Tokens de entrada por llamada<input type="number" min={0} value={tin} onChange={(e) => setTin(+e.target.value)} /></label>
              <label>Tokens de salida por llamada<input type="number" min={0} value={tout} onChange={(e) => setTout(+e.target.value)} /></label>
              <label>% de la entrada servida desde caché<input type="number" min={0} max={100} value={cached} onChange={(e) => setCached(+e.target.value)} /></label>
              <label>Usuarios de pago<input type="number" min={0} value={users} onChange={(e) => setUsers(+e.target.value)} /></label>
              <label>Precio Pro al mes (US$, ejemplo)<input type="number" min={0} step={0.5} value={price} onChange={(e) => setPrice(+e.target.value)} /></label>
              <label>Comisión de cobro e impuestos (%, ajústala)<input type="number" min={0} max={60} value={fee} onChange={(e) => setFee(+e.target.value)} /></label>
            </div>
            <div className="kpis">
              <div className="kpi"><small>Costo IA por usuario / mes</small><b>{usd(perUser)}</b></div>
              <div className="kpi"><small>Costo IA total / mes</small><b>{usd(perUser * users)}</b></div>
              <div className="kpi"><small>Ingreso neto por usuario</small><b>{usd(net)}</b></div>
              <div className="kpi"><small>Costo IA sobre el precio</small><b>{price ? `${((perUser / price) * 100).toFixed(1)} %` : '—'}</b></div>
            </div>
            <p className="small muted">Supuestos editables: la lectura desde caché cuesta ≈10 % de la entrada (el texto fijo de las instrucciones del profesor se repite en cada llamada y puede cachearse). No incluye hosting, soporte ni marketing. Recomendación: limita las llamadas mensuales del plan y usa el modelo más económico para preguntas simples.</p>
          </Card>
        </>
      )}

      {tab === 'equipo' && (
        <div className="grid2">
          <Card title="Equipo de esta sesión">
            <table className="status-table"><tbody>
              <tr><td>Núcleos de CPU</td><td>{String(sum.device.cores ?? '—')}</td></tr>
              <tr><td>Memoria (GB, aprox.)</td><td>{String(sum.device.memGB ?? 'no informada')}</td></tr>
              <tr><td>WebGPU (IA en la tarjeta gráfica)</td><td>{sum.device.webgpu ? 'sí' : 'no: la IA usa el procesador (más lenta)'}</td></tr>
              <tr><td>Móvil</td><td>{sum.device.mobile ? 'sí' : 'no'}</td></tr>
              <tr><td>Instalada como app</td><td>{sum.device.standalone ? 'sí' : 'no'}</td></tr>
              <tr><td>Pantalla</td><td>{String(sum.device.w ?? '—')} × {String(sum.device.h ?? '—')}</td></tr>
              <tr><td>Almacenamiento usado</td><td>{storage?.usage !== undefined ? `${(storage.usage / 1e6).toFixed(1)} MB de ${((storage.quota ?? 0) / 1e9).toFixed(1)} GB` : '—'}</td></tr>
            </tbody></table>
          </Card>
          <Card title={`Errores recientes (${sum.errors.length})`}>
            {sum.errors.length ? <ul className="small err-list">{sum.errors.map((e, i) => <li key={i}><b>{new Date(e.t).toLocaleString()}</b> · {String(e.data?.msg ?? '')} <span className="muted">{String(e.data?.src ?? '')}</span></li>)}</ul> : <p className="muted small">Sin errores registrados. 🎉</p>}
          </Card>
        </div>
      )}

      {tab === 'planes' && (
        <>
          <Card title="Plan activo en este navegador">
            <Segmented value={s.settings.plan} onChange={(v) => update((x) => { x.settings.plan = v; })} options={[{ value: 'pro', label: '⭐ Pro (todo)' }, { value: 'free', label: 'Gratis (previsualizar)' }]} />
            <p className="small muted">Sin cobro todavía: cambia aquí para ver la app como la vería un usuario gratuito. Uso del mes {monthKey()}: {Object.entries(s.usage[monthKey()] ?? {}).map(([k, v]) => `${k} ${v}`).join(' · ') || 'nada'}.</p>
            <button className="btn sm" onClick={() => update((x) => { delete x.usage[monthKey()]; })}>Reiniciar el uso del mes</button>
          </Card>
          <Card title="Qué incluye cada plan">
            <table className="status-table">
              <thead><tr><th>Función</th><th>Gratis</th><th>Pro</th><th>Dónde corre</th></tr></thead>
              <tbody>{FEATURES.map((f) => <tr key={f.id}><td>{f.name}</td><td>{f.tier === 'free' ? '✅' : f.limitText ? `limitado (${f.limitText})` : '—'}</td><td>✅</td><td className="small">{f.where === 'cloud' ? '☁️ nube' : f.where === 'device' ? '💻 equipo' : '—'}</td></tr>)}</tbody>
            </table>
          </Card>
        </>
      )}

      {tab === 'lanzamiento' && (
        <Card title="Plan de lanzamiento: pasos en orden">
          <p className="small">El detalle está en <code>docs/PRODUCTO.md</code> del repositorio. Marca lo que vayas completando (se guarda en este navegador).</p>
          {LAUNCH_STEPS.map((phase) => (
            <section key={phase.phase} className="launch-phase">
              <h4>{phase.phase}</h4>
              {phase.steps.map((st) => (
                <label key={st.id} className={`launch-step ${done[st.id] ? 'done' : ''}`}>
                  <input type="checkbox" checked={!!done[st.id]} onChange={() => toggleStep(st.id)} />
                  <span><b>{st.title}</b><small>{st.detail}</small></span>
                </label>
              ))}
            </section>
          ))}
        </Card>
      )}

      <div className="row gap wrap">
        <button className="btn" onClick={exportAll}>⬇ Exportar datos (JSON)</button>
        <button className="btn" onClick={() => { if (confirm('¿Borrar la telemetría de este navegador?')) clearEvents(); }}>Borrar telemetría</button>
      </div>
    </div>
  );
}

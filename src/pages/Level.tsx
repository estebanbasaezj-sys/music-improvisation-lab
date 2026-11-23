// «Ajustar mi nivel»: reúne la prueba de nivel, el diagnóstico, quién practica y la meta diaria.
// Cada opción dice en una línea qué obtiene el alumno y reutiliza lo que ya respondió.
import { AgeProfile, update, useAppState } from '../progress/store';
import { PROFILE_INFO } from '../product/profile';
import { INSTRUMENT_LABEL } from '../theory/instruments';
import { LEVELS } from '../learn/curriculum';
import { trackFeature } from '../telemetry/telemetry';

const fmtDay = (d?: string) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' }) : '');

export function LevelPage() {
  const s = useAppState();
  const inst = s.instrument;
  const ps = s.path[inst];
  const diag = s.progress[inst].diagnostic;
  const instName = INSTRUMENT_LABEL[inst].toLowerCase();
  return (
    <div className="page level-page">
      <a href="#/hoy" className="back">← Hoy</a>
      <h1>Ajustar mi nivel</h1>
      <p className="lead">Elige cómo quieres que la app conozca tu {instName}. Puedes repetirlo cuando quieras: no se pierde nada de tu progreso.</p>

      <div className="choice-grid">
        <section className="choice-card">
          <span className="cc-ico" aria-hidden="true">🧭</span>
          <div className="cc-body">
            <h2>Prueba de nivel</h2>
            <p className="cc-what"><b>Obtienes:</b> tu nivel en el Camino, saltando las lecciones que ya dominas.</p>
            <p className="small muted">Ejercicios cortos de escuchar, leer y tocar · unos 5 minutos.</p>
            <p className="cc-status">{ps.level !== null ? <>✓ Tu nivel en {instName}: <b>{ps.level} · {LEVELS[ps.level]?.name}</b>{ps.placementAt && ` (prueba del ${fmtDay(ps.placementAt)})`}</> : 'Aún no la haces.'}</p>
            {diag && <p className="small">Usaremos lo que respondiste en el diagnóstico para empezar en el nivel adecuado.</p>}
          </div>
          <a className="btn primary" href="#/nivel">{ps.level !== null ? 'Repetir la prueba' : 'Hacer la prueba de nivel'}</a>
        </section>

        <section className="choice-card">
          <span className="cc-ico" aria-hidden="true">📋</span>
          <div className="cc-body">
            <h2>Diagnóstico</h2>
            <p className="cc-what"><b>Obtienes:</b> una sesión guiada a tu medida (tu tiempo, tus estilos y tu punto de partida).</p>
            <p className="small muted">Siete preguntas y unas pruebas musicales opcionales · 3–10 minutos.</p>
            <p className="cc-status">{diag ? <>✓ Respondido{diag.completedAt && ` el ${fmtDay(diag.completedAt)}`}: {diag.minutesPerDay} min al día{diag.styles?.length ? ` · ${diag.styles.slice(0, 3).join(', ')}` : ''}.</> : 'Aún no lo haces.'}</p>
            {diag && <p className="small">Al abrirlo verás tus respuestas anteriores: cambia solo lo que quieras.</p>}
          </div>
          <a className="btn primary" href="#/diagnostico">{diag ? 'Revisar mis respuestas' : 'Hacer el diagnóstico'}</a>
        </section>
      </div>

      <section className="card">
        <h3>¿Quién practica?</h3>
        <p className="small muted">Adapta el tamaño de las pantallas, el largo de las lecciones y la meta diaria.</p>
        <div className="seg-cards" role="radiogroup" aria-label="Quién practica">
          {(Object.keys(PROFILE_INFO) as AgeProfile[]).map((p) => {
            const on = s.settings.profile === p;
            return (
              <button key={p} role="radio" aria-checked={on} className={`seg-card ${on ? 'on' : ''}`} onClick={() => { update((x) => { x.settings.profile = p; x.settings.simple = null; x.game.dailyGoal = PROFILE_INFO[p].goal; }); trackFeature('perfil', { perfil: p }); }}>
                <span className="pc-ico" aria-hidden="true">{PROFILE_INFO[p].icon}</span>
                <b>{PROFILE_INFO[p].label}{on && ' ✓'}</b>
                <small>{PROFILE_INFO[p].sub}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h3>Meta diaria</h3>
        <div className="chip-row" role="radiogroup" aria-label="Meta diaria">
          {[{ v: 10, n: 'Relajada' }, { v: 20, n: 'Normal' }, { v: 30, n: 'Seria' }, { v: 50, n: 'Intensa' }].map((g) => (
            <button key={g.v} role="radio" aria-checked={s.game.dailyGoal === g.v} className={`chip big ${s.game.dailyGoal === g.v ? 'on' : ''}`} onClick={() => update((x) => { x.game.dailyGoal = g.v; })}>{g.n} · {g.v} XP</button>
          ))}
        </div>
        <p className="muted small">Una lección o una práctica de 5 minutos ≈ 10–15 XP. Cada 7 días de racha ganas un protector que salva un día perdido.</p>
      </section>
    </div>
  );
}

import { useRef, useState } from 'react';
import { COMMON_SKILLS, SKILL_LABEL, SOURCE_LABEL, SPECIFIC_SKILLS, getState, mastery, replaceState, skillLevel, streak, update, useAppState, dueLessons } from '../progress/store';
import { INSTRUMENT_LABEL, InstrumentId } from '../theory/instruments';
import { LESSONS, lessonById } from '../content/lessons';
import { Card, Segmented } from '../components/common';
import { weakestSkills } from '../content/session';
import { SoundSettings } from '../components/SoundSettings';
import { MicHelp } from '../components/MicHelp';
import { isSimple } from '../product/profile';

export function ProgressPage() {
  const s = useAppState();
  const inst = s.instrument;
  const p = s.progress[inst];
  const [detail, setDetail] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const totalMin = Object.values(p.practiceMinutes).reduce((a, b) => a + b, 0);
  const days = Object.keys(p.practiceMinutes).sort().slice(-14);
  const lessons = LESSONS.filter((l) => l.track === inst || l.track === 'shared');
  const done = lessons.filter((l) => p.lessons[l.id]?.status === 'completada').length;
  const mastered = lessons.filter((l) => mastery(p.lessons[l.id]).value >= 0.8).length;
  const due = dueLessons(p);
  const weak = weakestSkills(p, inst).slice(0, 3);
  const row = (sk: (typeof COMMON_SKILLS)[number]) => {
    const ev = p.skills[sk];
    const lv = skillLevel(ev);
    return (
      <div key={sk} className="skill-row" onClick={() => setDetail(detail === sk ? null : sk)}>
        <span>{SKILL_LABEL[sk]}</span>
        <span className="bar"><span style={{ width: `${lv ?? 0}%` }} className={lv === null ? '' : lv < 45 ? 'low' : lv < 70 ? 'mid' : 'high'} /></span>
        <span className="small">{lv === null ? 'sin datos' : lv}</span>
        {detail === sk && (
          <div className="evidence small">
            {(ev ?? []).slice(-8).reverse().map((e, i) => <div key={i}>{e.date} · {SOURCE_LABEL[e.source]} · {e.value}{e.note ? ` · ${lessonById(e.note)?.title ?? e.note}` : ''}</div>)}
            {!ev?.length && <div>Aún no hay evidencias. Haz el diagnóstico o ejercicios relacionados.</div>}
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="page">
      <h1>Mi progreso · {INSTRUMENT_LABEL[inst]}</h1>
      <div className="stats">
        <div><b>{streak(Object.values(s.progress))}</b><span>días de racha</span></div>
        <div><b>{totalMin}</b><span>min practicados</span></div>
        <div><b>{done}/{lessons.length}</b><span>lecciones completadas</span></div>
        <div><b>{mastered}</b><span>dominadas</span></div>
      </div>
      <div className="grid2">
        <Card title="Habilidades comunes">{COMMON_SKILLS.map(row)}</Card>
        <Card title={`Habilidades de ${INSTRUMENT_LABEL[inst].toLowerCase()}`}>{SPECIFIC_SKILLS[inst].map(row)}</Card>
      </div>
      <p className="muted small">Pulsa una habilidad para ver de dónde sale su valor. Las fuentes medibles (ejercicios con respuesta correcta, detección de notas) pesan más que la autoevaluación. Nunca se muestran puntuaciones sin evidencia.</p>
      <Card title="Qué reforzar">
        <p>Habilidades con menor nivel o sin datos: <b>{weak.map((w) => SKILL_LABEL[w]).join(', ')}</b>. Tus sesiones diarias las priorizan.</p>
        <p>Repasos pendientes hoy: {due.length ? due.map((id) => <a key={id} href={`#/leccion/${id}`} className="chip">{lessonById(id)?.title}</a>) : 'ninguno'}</p>
      </Card>
      <Card title="Últimos 14 días">
        <div className="days">{days.length ? days.map((d) => <div key={d} title={d} style={{ height: Math.min(80, p.practiceMinutes[d] * 1.6) + 4 }} />) : <span className="muted">Sin práctica registrada todavía.</span>}</div>
      </Card>
      <Card title="Comparar instrumentos">
        <table className="status-table">
          <thead><tr><th /><th>Saxofón</th><th>Guitarra</th><th>Piano</th></tr></thead>
          <tbody>{COMMON_SKILLS.map((sk) => <tr key={sk}><td>{SKILL_LABEL[sk]}</td>{(['sax', 'guitar', 'piano'] as InstrumentId[]).map((i) => <td key={i}>{skillLevel(s.progress[i].skills[sk]) ?? '—'}</td>)}</tr>)}</tbody>
        </table>
      </Card>
      <Settings />
      <SoundSettings />
      <MicHelp />
      <Card title="Planes y administración">
        <div className="row gap wrap">
          <a className="btn" href="#/planes">💳 Planes (Gratis / Pro)</a>
          <a className="btn" href="#/admin">🛠 Administración (para el equipo)</a>
        </div>
        <p className="muted small">Administración muestra el uso, el rendimiento y el costo de la IA medidos en este navegador.</p>
      </Card>
      <Card title="Copia de seguridad">
        <p className="small">El progreso se guarda en este navegador. Exporta un archivo para no perderlo o para pasarlo a otro dispositivo.</p>
        <div className="row gap">
          <button className="btn" onClick={() => { const b = new Blob([JSON.stringify(getState(), null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `music-improvisation-lab-${new Date().toISOString().slice(0, 10)}.json`; a.click(); }}>Exportar progreso</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Importar…</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { replaceState(JSON.parse(await f.text())); alert('Progreso importado.'); } catch { alert('Archivo no válido.'); } }} />
        </div>
      </Card>
    </div>
  );
}

function Settings() {
  const s = useAppState();
  return (
    <Card title="Ajustes">
      <div className="row gap wrap">
        <label className="field inline"><span>Saxofón</span>
          <Segmented size="sm" value={s.settings.saxType} onChange={(v) => update((st) => { st.settings.saxType = v; })} options={[{ value: 'tenor', label: 'Tenor (Si♭)' }, { value: 'alto', label: 'Alto (Mi♭)' }]} />
        </label>
        <label className="field inline"><span>Quién practica</span>
          <Segmented size="sm" value={s.settings.profile ?? 'adulto'} onChange={(v) => update((st) => { st.settings.profile = v; st.settings.simple = null; })} options={[{ value: 'nino', label: '🧒 Niño' }, { value: 'adolescente', label: '🧑‍🎤 Adolescente' }, { value: 'adulto', label: '🧑 Adulto' }]} />
        </label>
        <label className="field inline"><span>Menú</span>
          <Segmented size="sm" value={isSimple(s) ? 'simple' : 'completo'} onChange={(v) => update((st) => { st.settings.simple = v === 'simple'; })} options={[{ value: 'simple', label: 'Simple' }, { value: 'completo', label: 'Completo' }]} />
        </label>
        <label className="field inline"><span>Nombres de notas</span>
          <Segmented size="sm" value={s.settings.noteNames} onChange={(v) => update((st) => { st.settings.noteNames = v; })} options={[{ value: 'letras', label: 'C D E' }, { value: 'solfeo', label: 'Do Re Mi' }]} />
        </label>
      </div>
    </Card>
  );
}

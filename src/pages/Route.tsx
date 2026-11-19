import { useState } from 'react';
import { LESSONS, MODULES, lessonById, lessonsInModule } from '../content/lessons';
import { STEP_LABEL, Step } from '../content/types';
import { resourcesFor } from '../content/resources';
import { SONGS } from '../content/songs';
import { Rating, markLesson, mastery, rateLesson, useAppState } from '../progress/store';
import { INSTRUMENT_LABEL, InstrumentId } from '../theory/instruments';
import { ExerciseRunner } from '../components/ExerciseRunner';
import { Card } from '../components/common';
import { currentLesson } from '../content/session';
import { AskTeacher } from '../components/Workshop';

export function RoutePage() {
  const s = useAppState();
  const inst = s.instrument;
  const p = s.progress[inst];
  const cur = currentLesson(p, inst);
  const mods = MODULES.filter((m) => m.track === inst);
  return (
    <div className="page">
      <h1>Mi ruta musical · {INSTRUMENT_LABEL[inst]}</h1>
      <p className="lead">Siguiente recomendada: <a href={`#/leccion/${cur.id}`}>{cur.title}</a>. Puedes abrir cualquier lección: el diagnóstico no bloquea nada.</p>
      <p className="muted small">La teoría aplicada común está en <a href="#/teoria">Teoría aplicada</a> y cuenta para los tres instrumentos.</p>
      {mods.map((m) => <ModuleCard key={m.id} moduleId={m.id} inst={inst} />)}
    </div>
  );
}

export function ModuleCard({ moduleId, inst }: { moduleId: string; inst: InstrumentId }) {
  const s = useAppState();
  const m = MODULES.find((x) => x.id === moduleId)!;
  const ls = lessonsInModule(moduleId);
  return (
    <Card title={m.title} actions={<span className={`phase p${m.phase}`}>Fase {m.phase}</span>}>
      <p className="muted small">{m.goal}</p>
      <ul className="lesson-list">
        {ls.map((l) => {
          const st = s.progress[inst].lessons[l.id];
          const ms = mastery(st);
          return (
            <li key={l.id}>
              <a href={`#/leccion/${l.id}`}>{l.title}</a>
              <span className="lvl">Nivel {l.level}</span>
              <span className={`status ${st?.status ?? 'nuevo'}`}>{st?.status === 'completada' ? '✔ Completada' : st?.status === 'en_curso' ? 'En curso' : 'Nueva'}</span>
              <span className="mastery" title="Dominio (distinto de completar)"><span style={{ width: `${Math.round(ms.value * 100)}%` }} /></span>
              <span className="muted small">{ms.label}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

const STEPS: Step[] = ['escuchar', 'imitar', 'comprender', 'visualizar', 'aplicar', 'crear', 'evaluar', 'consolidar'];

export function LessonPage({ id }: { id: string }) {
  const s = useAppState();
  const inst = s.instrument;
  const l = lessonById(id);
  const [open, setOpen] = useState(0);
  if (!l) return <div className="page"><p>Lección no encontrada.</p></div>;
  const st = s.progress[inst].lessons[l.id];
  const ms = mastery(st);
  const how = l.how[inst] ?? (l.track !== 'shared' && l.track !== inst ? `Esta lección es de ${INSTRUMENT_LABEL[l.track as InstrumentId].toLowerCase()}; los ejercicios se muestran en tu instrumento actual.` : undefined);
  const ex = [...l.exercises].sort((a, b) => STEPS.indexOf(a.step) - STEPS.indexOf(b.step));
  const res = resourcesFor(inst, l.concept).slice(0, 3);
  const songs = SONGS.filter((x) => l.songs.includes(x.title));
  const related = LESSONS.filter((x) => x.concept && x.concept === l.concept && x.id !== l.id && (x.track === inst || x.track === 'shared')).slice(0, 3);
  return (
    <div className="page">
      <a href={l.track === 'shared' ? '#/teoria' : '#/ruta'} className="back">← {l.track === 'shared' ? 'Teoría aplicada' : 'Mi ruta'}</a>
      <h1>{l.title}</h1>
      <div className="row gap wrap small">
        <span className="pill">Nivel {l.level}</span>
        <span className="pill">{st?.status === 'completada' ? '✔ Completada' : st?.status === 'en_curso' ? 'En curso' : 'Nueva'}</span>
        <span className="pill">Dominio: {ms.label} ({Math.round(ms.value * 100)}%)</span>
        {st?.srs && <span className="pill">Próximo repaso: {st.srs.due}</span>}
      </div>
      <div className="six">
        <div><h4>¿Qué voy a aprender?</h4><p>{l.what}</p></div>
        <div><h4>¿Para qué me sirve?</h4><p>{l.why}</p></div>
        <div><h4>¿Cómo suena?</h4><p>{l.sound}</p></div>
        <div><h4>¿Cómo se toca en mi instrumento?</h4><p>{how ?? Object.values(l.how)[0]}</p>
          {l.track === 'shared' && <p className="muted small">Otros instrumentos: {(Object.keys(l.how) as InstrumentId[]).filter((k) => k !== inst).map((k) => `${INSTRUMENT_LABEL[k]}: ${l.how[k]}`).join(' · ')}</p>}
        </div>
        <div><h4>¿En qué canciones lo uso?</h4><p>{songs.length ? songs.map((x, i) => <span key={x.id}>{i > 0 && ', '}<a href={`#/cancion/${x.id}`}>{x.title}</a></span>) : l.songs.join(', ')}</p></div>
        <div><h4>¿Cómo lo llevo a la improvisación?</h4><p>{l.improv}</p></div>
      </div>
      <h2>Práctica guiada</h2>
      <div className="steps-bar">{STEPS.map((stp) => <span key={stp} className={ex.some((e) => e.step === stp) ? 'has' : ''}>{STEP_LABEL[stp]}</span>)}</div>
      {ex.map((e, i) => (
        <Card key={i} className={`exercise ${open === i ? 'open' : ''}`} title={<button className="ex-head" onClick={() => setOpen(open === i ? -1 : i)}><span className="step-tag">{STEP_LABEL[e.step]}</span> {e.title}</button>}>
          {open === i && <ExerciseRunner ex={e} lessonId={l.id} />}
        </Card>
      ))}
      <Card title="8 · Consolidar: ¿cómo te resultó?">
        <div className="rate">
          {(['facil', 'adecuado', 'dificil'] as Rating[]).map((r) => <button key={r} className="btn" onClick={() => rateLesson(inst, l.id, r, l.skills)}>{{ facil: 'Fácil', adecuado: 'Adecuada', dificil: 'Difícil' }[r]}</button>)}
          {st?.status !== 'completada' ? <button className="btn primary" onClick={() => markLesson(inst, l.id, 'completada')}>Marcar como completada</button> : <span className="ok">✔ Completada el {st.completedAt}</span>}
        </div>
        <p className="muted small">Completar ≠ dominar. El dominio sube con valoraciones y ejercicios correctos en días distintos; las difíciles vuelven antes en tus sesiones diarias.</p>
      </Card>
      <AskTeacher context={`Lección: ${l.title}. Instrumento: ${INSTRUMENT_LABEL[inst]}. Qué aprende: ${l.what} Para qué: ${l.why} Cómo se toca: ${how ?? ''}`} />
      {(res.length > 0 || related.length > 0) && (
        <Card title="Para profundizar">
          {related.map((r) => <p key={r.id}>📘 <a href={`#/leccion/${r.id}`}>{r.title}</a></p>)}
          {res.map((r) => <p key={r.id}>🔗 <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a> — {r.why} {r.searchHint && <span className="muted small">(busca: «{r.searchHint}»)</span>}</p>)}
        </Card>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Block, generateSession } from '../content/session';
import { Rating, logPractice, rateLesson, streak, update, today, useAppState, dueLessons, dueVocab } from '../progress/store';
import { INSTRUMENT_LABEL } from '../theory/instruments';
import { ExerciseRunner } from '../components/ExerciseRunner';
import { Card, Segmented } from '../components/common';
import { lessonById } from '../content/lessons';

export function Today() {
  const s = useAppState();
  const inst = s.instrument;
  const p = s.progress[inst];
  const [minutes, setMinutes] = useState<10 | 20 | 30 | 45>(((p.diagnostic?.minutesPerDay as 10 | 20 | 30 | 45) ?? 20));
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [ratings, setRatings] = useState<Record<number, Rating>>({});
  const [finished, setFinished] = useState(false);
  // la sesión se genera una vez por instrumento/duración (no cambia mientras practicas)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const blocks = useMemo(() => generateSession(inst, minutes, p, new Date().getDate(), dueVocab(s, inst).length), [inst, minutes, started]);
  const due = dueLessons(p).length;

  const rate = (b: Block, r: Rating) => {
    setRatings({ ...ratings, [idx]: r });
    if (b.lessonId) rateLesson(inst, b.lessonId, r, b.skills);
    else update((st) => { for (const sk of b.skills) (st.progress[inst].skills[sk] ??= []).push({ date: today(), source: 'valoracion', value: r === 'facil' ? 90 : r === 'adecuado' ? 65 : 30, note: b.title }); });
  };
  const finish = () => {
    logPractice(inst, minutes);
    update((st) => { st.progress[inst].sessions.push({ date: today(), minutes, blocks: blocks.map((b, i) => ({ title: b.title, rating: ratings[i], done: i <= idx })) }); });
    setFinished(true);
  };

  if (!started) {
    return (
      <div className="page">
        <h1>Mi práctica de hoy</h1>
        <p className="lead">{INSTRUMENT_LABEL[inst]} · racha: {streak(Object.values(s.progress))} día(s) · {due} repaso(s) pendiente(s)</p>
        {!p.diagnostic && (
          <Card className="accent"><p>Aún no has hecho el diagnóstico de {INSTRUMENT_LABEL[inst].toLowerCase()}. La sesión se adaptará mejor si lo haces (5–10 min), pero puedes practicar ya.</p><a className="btn" href="#/diagnostico">Hacer diagnóstico</a></Card>
        )}
        <Card title="Cómo aprendes aquí">
          <div className="method">
            <div><b>1 · Escucha</b>Un solo de ejemplo sobre los acordes, con cada nota explicada.</div>
            <div><b>2 · Imita</b>«Repite después de mí»: la base toca la frase y luego te deja el turno.</div>
            <div><b>3 · Comprende</b>Colores y grados: qué es cada nota respecto al acorde que suena.</div>
            <div><b>4 · Transforma</b>Desplaza, cambia el final, otra octava: haz tuya la idea.</div>
            <div><b>5 · Crea</b>Tu turno con un reto concreto: una idea por chorus.</div>
            <div><b>6 · Consolida</b>Guarda frases en tu vocabulario y llévalas a las 12 tonalidades.</div>
          </div>
          <p className="muted small">Es el camino clásico del jazz (imitar → asimilar → innovar): aprender el lenguaje de oído y en contexto, no solo escalas.</p>
        </Card>
        <Card title="¿Cuánto tiempo tienes?">
          <Segmented value={minutes} onChange={setMinutes} options={[10, 20, 30, 45].map((m) => ({ value: m as 10 | 20 | 30 | 45, label: `${m} min` }))} />
          <ol className="plan">
            {blocks.map((b, i) => <li key={i}><span className="mins">{b.minutes}′</span> {b.title}</li>)}
          </ol>
          <button className="btn primary big" onClick={() => { setStarted(true); setIdx(0); }}>Empezar sesión</button>
        </Card>
      </div>
    );
  }
  if (finished) {
    return (
      <div className="page">
        <h1>¡Sesión completada!</h1>
        <Card>
          <p>{minutes} minutos registrados en {INSTRUMENT_LABEL[inst].toLowerCase()}.</p>
          <ul>{blocks.map((b, i) => <li key={i}>{b.title}: {ratings[i] ? { facil: 'fácil', adecuado: 'adecuado', dificil: 'difícil' }[ratings[i]] : 'sin valorar'}</li>)}</ul>
          <p className="muted">Lo que marcaste como difícil volverá mañana; lo fácil, más adelante (repetición espaciada).</p>
          <a className="btn" href="#/progreso">Ver mi progreso</a>
        </Card>
      </div>
    );
  }
  const b = blocks[idx];
  const lesson = b.lessonId ? lessonById(b.lessonId) : undefined;
  return (
    <div className="page">
      <div className="session-steps">{blocks.map((x, i) => <button key={i} className={`sstep ${i === idx ? 'on' : ''} ${ratings[i] ? 'done' : ''}`} onClick={() => setIdx(i)}>{x.minutes}′</button>)}</div>
      <Card title={`${idx + 1}. ${b.title}`} actions={<span className="mins big">{b.minutes} min</span>}>
        <p className="teacher">🧑‍🏫 {b.why}</p>
        {lesson && <p className="small"><a href={`#/leccion/${lesson.id}`}>Ver la lección completa: {lesson.title}</a></p>}
        <h4>{b.exercise.title}</h4>
        {b.exercise.text && <p className="hint">{b.exercise.text}</p>}
        <ExerciseRunner key={b.id} ex={b.exercise} lessonId={b.lessonId} />
        <div className="rate">
          <span>¿Cómo te resultó?</span>
          {(['facil', 'adecuado', 'dificil'] as Rating[]).map((r) => <button key={r} className={`btn ${ratings[idx] === r ? 'primary' : ''}`} onClick={() => rate(b, r)}>{{ facil: 'Fácil', adecuado: 'Adecuado', dificil: 'Difícil' }[r]}</button>)}
        </div>
        <div className="row between">
          <button className="btn" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>← Anterior</button>
          {idx + 1 < blocks.length ? <button className="btn primary" onClick={() => setIdx(idx + 1)}>Siguiente →</button> : <button className="btn primary" onClick={finish}>Terminar sesión</button>}
        </div>
      </Card>
    </div>
  );
}

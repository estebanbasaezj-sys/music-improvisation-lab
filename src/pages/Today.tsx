import { useEffect, useMemo, useState } from 'react';
import { Block, generateSession } from '../content/session';
import { GuidedSession, Rating, logPractice, rateLesson, saveGuided, saveSpot, streak, update, today, useAppState, dueLessons, dueVocab } from '../progress/store';
import { INSTRUMENT_LABEL } from '../theory/instruments';
import { ExerciseRunner } from '../components/ExerciseRunner';
import { Card, Segmented } from '../components/common';
import { lessonById } from '../content/lessons';
import { SpotProvider } from '../practice/spot';
import { replaceParams } from '../router';

type Minutes = 10 | 20 | 30 | 45;

/** Sesión guiada: bloques con objetivo y duración. Se guarda el bloque en curso para retomarlo. */
export function Today() {
  const s = useAppState();
  const inst = s.instrument;
  const p = s.progress[inst];
  const saved = s.guided[inst] as (GuidedSession & { blocks?: Block[] }) | null;
  const resumable = saved && saved.blocks?.length ? saved : null;
  const [minutes, setMinutes] = useState<Minutes>(resumable?.minutes ?? ((p.diagnostic?.minutesPerDay as Minutes) ?? 20));
  const [started, setStarted] = useState(!!resumable);
  const [idx, setIdx] = useState(resumable ? Math.min(resumable.idx, resumable.blocks!.length - 1) : 0);
  const [ratings, setRatings] = useState<Record<number, Rating>>(resumable?.ratings ?? {});
  const [finished, setFinished] = useState(false);
  // los bloques se fijan al empezar (y se guardan), así «Retomar» abre exactamente la misma sesión
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fresh = useMemo(() => generateSession(inst, minutes, p, new Date().getDate(), dueVocab(s, inst).length), [inst, minutes]);
  const blocks: Block[] = started && resumable?.blocks ? resumable.blocks : fresh;
  const due = dueLessons(p).length;

  const persist = (patch: Partial<GuidedSession> & { blocks?: Block[] }) => {
    const base = (s.guided[inst] as (GuidedSession & { blocks?: Block[] }) | null) ?? { date: today(), minutes, idx: 0, ratings: {}, blocks };
    saveGuided(inst, { ...base, ...patch } as GuidedSession);
  };
  const spotFor = (i: number, bs: Block[]) => saveSpot(inst, { id: 'sesion', title: 'Sesión guiada', minutes, detail: `Bloque ${i + 1} de ${bs.length}: ${bs[i].title} · ${minutes} min en total`, route: `#/sesion?bloque=${i + 1}` });
  const begin = () => { setStarted(true); setIdx(0); setRatings({}); saveGuided(inst, { date: today(), minutes, idx: 0, ratings: {}, blocks: fresh } as GuidedSession); spotFor(0, fresh); replaceParams({ bloque: 1 }); };
  const goTo = (i: number) => {
    setIdx(i);
    persist({ idx: i });
    spotFor(i, blocks);
    // los ajustes del reproductor (tempo, fragmento) son de cada bloque
    replaceParams({ bloque: i + 1, bpm: null, bpmBase: null, frag: null });
    window.scrollTo(0, 0);
  };
  const rate = (b: Block, r: Rating) => {
    const next = { ...ratings, [idx]: r };
    setRatings(next);
    persist({ ratings: next });
    if (b.lessonId) rateLesson(inst, b.lessonId, r, b.skills);
    else update((st) => { for (const sk of b.skills) (st.progress[inst].skills[sk] ??= []).push({ date: today(), source: 'valoracion', value: r === 'facil' ? 90 : r === 'adecuado' ? 65 : 30, note: b.title }); });
  };
  const finish = () => {
    logPractice(inst, minutes);
    update((st) => {
      st.progress[inst].sessions.push({ date: today(), minutes, blocks: blocks.map((b, i) => ({ title: b.title, rating: ratings[i], done: i <= idx })) });
      st.guided[inst] = null;
      if (st.resume[inst]?.id === 'sesion') st.resume[inst] = null;
    });
    setFinished(true);
  };
  useEffect(() => { if (started) replaceParams({ bloque: idx + 1 }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!started) {
    return (
      <div className="page">
        <a href="#/hoy" className="back">← Hoy</a>
        <h1>Sesión guiada</h1>
        <p className="lead">{INSTRUMENT_LABEL[inst]} · racha: {streak(Object.values(s.progress))} día(s) · {due} repaso(s) pendiente(s)</p>
        {!p.diagnostic && (
          <Card className="accent"><p>La sesión se adapta mejor si haces el diagnóstico (3–10 min), pero puedes practicar ya.</p><a className="btn" href="#/ajustar">Ajustar mi nivel</a></Card>
        )}
        <Card title="¿Cuánto tiempo tienes?">
          <Segmented value={minutes} onChange={setMinutes} options={[10, 20, 30, 45].map((m) => ({ value: m as Minutes, label: `${m} min` }))} />
          <ol className="plan">
            {fresh.map((b, i) => <li key={i}><span className="mins">{b.minutes}′</span> {b.title}</li>)}
          </ol>
          <button className="btn primary big" onClick={begin}>Empezar sesión</button>
        </Card>
        <details className="card">
          <summary><b>Cómo aprendes aquí</b></summary>
          <div className="method">
            <div><b>1 · Escucha</b>Un solo de ejemplo sobre los acordes, con cada nota explicada.</div>
            <div><b>2 · Imita</b>«Repite después de mí»: la base toca la frase y luego te deja el turno.</div>
            <div><b>3 · Comprende</b>Colores y grados: qué es cada nota respecto al acorde que suena.</div>
            <div><b>4 · Transforma</b>Desplaza, cambia el final, otra octava: haz tuya la idea.</div>
            <div><b>5 · Crea</b>Tu turno con un reto concreto: una idea por chorus.</div>
            <div><b>6 · Consolida</b>Guarda frases en tu vocabulario y llévalas a las 12 tonalidades.</div>
          </div>
          <p className="muted small">Es el camino clásico del jazz (imitar → asimilar → innovar): aprender el lenguaje de oído y en contexto, no solo escalas.</p>
        </details>
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
          <div className="row gap wrap"><a className="btn primary" href="#/hoy">Volver a Hoy</a><a className="btn" href="#/progreso">Ver mi progreso</a></div>
        </Card>
      </div>
    );
  }
  const b = blocks[idx];
  const lesson = b.lessonId ? lessonById(b.lessonId) : undefined;
  return (
    <SpotProvider describe={() => ({ id: 'sesion', title: 'Sesión guiada', minutes, detail: `Bloque ${idx + 1} de ${blocks.length}: ${b.title} · ${minutes} min en total` })}>
      <div className="page">
        <div className="row between wrap"><a href="#/hoy" className="back">← Hoy</a><span className="muted small">Tu avance se guarda: si sales, «Retomar práctica» te trae a este bloque.</span></div>
        <nav className="session-steps" aria-label="Bloques de la sesión">
          {blocks.map((x, i) => (
            <button key={i} className={`sstep ${i === idx ? 'on' : ''} ${ratings[i] ? 'done' : ''}`} aria-current={i === idx ? 'step' : undefined} onClick={() => goTo(i)} title={x.title}>
              {ratings[i] ? '✓ ' : ''}{x.minutes}′
            </button>
          ))}
        </nav>
        <Card title={`${idx + 1}. ${b.title}`} actions={<span className="mins big">{b.minutes} min</span>}>
          <p className="teacher">🧑‍🏫 {b.why}</p>
          {lesson && <p className="small"><a href={`#/leccion/${lesson.id}`}>Ver la lección completa: {lesson.title}</a></p>}
          <h4>{b.exercise.title}</h4>
          {b.exercise.text && <p className="hint">{b.exercise.text}</p>}
          <ExerciseRunner key={`${idx}-${b.id}`} ex={b.exercise} lessonId={b.lessonId} />
          <div className="rate">
            <span>¿Cómo te resultó? <small className="muted">(con esto basta para completar el bloque)</small></span>
            {(['facil', 'adecuado', 'dificil'] as Rating[]).map((r) => <button key={r} aria-pressed={ratings[idx] === r} className={`btn ${ratings[idx] === r ? 'primary' : ''}`} onClick={() => rate(b, r)}>{ratings[idx] === r ? '✓ ' : ''}{{ facil: 'Fácil', adecuado: 'Adecuado', dificil: 'Difícil' }[r]}</button>)}
          </div>
          <div className="row between">
            <button className="btn" disabled={idx === 0} onClick={() => goTo(idx - 1)}>← Anterior</button>
            {idx + 1 < blocks.length ? <button className="btn primary" onClick={() => goTo(idx + 1)}>Siguiente →</button> : <button className="btn primary" onClick={finish}>Terminar sesión</button>}
          </div>
        </Card>
      </div>
    </SpotProvider>
  );
}

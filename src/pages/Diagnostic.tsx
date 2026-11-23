import { useMemo, useState } from 'react';
import { PRACTICAL_SCALE, QUESTIONS, TESTS, selfAssessmentEvidence } from '../content/diagnostic';
import { SKILL_LABEL, addEvidence, skillLevel, skillsFor, update, useAppState, today } from '../progress/store';
import { INSTRUMENT_LABEL } from '../theory/instruments';
import { progressionById, realize } from '../theory/progressions';
import { parseNote } from '../theory/notes';
import { Card } from '../components/common';
import { Quiz } from '../components/Quiz';
import { PhrasePlayer } from '../components/ExerciseRunner';
import { ChordsView } from '../components/ChordsView';
import { ScaleView } from '../components/ScaleView';
import { BackingPanel } from '../components/BackingPanel';
import { currentLesson } from '../content/session';

export function DiagnosticPage() {
  const s = useAppState();
  const inst = s.instrument;
  const [step, setStep] = useState<'q' | number | 'end'>('q');
  // reutiliza lo ya respondido: el diagnóstico anterior o, si no hay, las respuestas de la prueba de nivel
  const [ans, setAns] = useState<Record<string, string | string[]>>(() => {
    const d = s.progress[inst].diagnostic;
    if (d) return { experience: d.experience, styles: d.styles, reading: d.reading, improvExperience: d.improvExperience, harmony: d.harmony, goals: d.goals, minutesPerDay: String(d.minutesPerDay) };
    const pa = s.path[inst].answers;
    if (!pa) return {};
    const opt = (id: string, i: number | undefined) => (i === undefined ? undefined : QUESTIONS.find((q) => q.id === id)?.options?.[i]);
    const out: Record<string, string> = {};
    const r = opt('reading', pa.read); if (r) out.reading = r;
    const h = opt('harmony', pa.theory === undefined ? undefined : [0, 0, 2, 3][pa.theory]); if (h) out.harmony = h;
    const im = opt('improvExperience', pa.plays === undefined ? undefined : pa.plays >= 3 ? 2 : pa.plays >= 2 ? 1 : 0); if (im) out.improvExperience = im;
    return out;
  });
  const reused = !!s.progress[inst].diagnostic || !!s.path[inst].answers;
  const tests = TESTS[inst];

  const saveQuestionnaire = () => {
    update((st) => {
      st.progress[inst].diagnostic = {
        experience: (ans.experience as string) ?? '', styles: (ans.styles as string[]) ?? [], reading: (ans.reading as string) ?? '',
        improvExperience: (ans.improvExperience as string) ?? '', harmony: (ans.harmony as string) ?? '', goals: (ans.goals as string) ?? '',
        minutesPerDay: Number(ans.minutesPerDay ?? 20), completedAt: today(),
      };
    });
    for (const e of selfAssessmentEvidence(ans, inst)) addEvidence(inst, e.skill, { source: 'autoevaluacion', value: e.value, note: 'Cuestionario inicial' });
    setStep(0);
  };

  if (step === 'q') {
    return (
      <div className="page">
        <h1>Diagnóstico · {INSTRUMENT_LABEL[inst]}</h1>
        <p className="lead">Cuestionario breve y {tests.length} pruebas musicales. Cada instrumento se diagnostica por separado. Nada queda bloqueado por el resultado.</p>
        {reused && <p className="hint small">Ya completamos lo que respondiste antes. Cambia solo lo que quieras y continúa.</p>}
        <Card>
          {QUESTIONS.map((q) => (
            <div key={q.id} className="dq">
              <p><b>{q.label}</b></p>
              {q.free ? (
                <textarea value={(ans[q.id] as string) ?? ''} onChange={(e) => setAns({ ...ans, [q.id]: e.target.value })} placeholder="Ej.: improvisar con soltura sobre Autumn Leaves" />
              ) : (
                <div className="chip-row">
                  {q.options!.map((o) => {
                    const on = q.multi ? ((ans[q.id] as string[]) ?? []).includes(o) : ans[q.id] === o;
                    return <button key={o} className={`chip ${on ? 'on' : ''}`} onClick={() => setAns({ ...ans, [q.id]: q.multi ? (on ? ((ans[q.id] as string[]) ?? []).filter((x) => x !== o) : [...((ans[q.id] as string[]) ?? []), o]) : o })}>{o}</button>;
                  })}
                </div>
              )}
            </div>
          ))}
          <button className="btn primary big" onClick={saveQuestionnaire}>Continuar a las pruebas →</button>
        </Card>
      </div>
    );
  }
  if (step === 'end') return <Matrix />;
  const test = tests[step];
  const next = () => setStep(step + 1 < tests.length ? step + 1 : 'end');
  return (
    <div className="page">
      <h1>Prueba {step + 1}/{tests.length}: {test.title}</h1>
      <Card>
        <p>{test.instruction}</p>
        {'quiz' in test.type ? (
          <Quiz key={test.id} kind={test.type.quiz} count={test.type.count} onDone={() => undefined} />
        ) : (
          <>
            <Practical test={test} />
            <SelfRate onRate={(v) => { test.skills.forEach((sk) => addEvidence(inst, sk, { source: 'prueba', value: v, note: `Diagnóstico: ${test.title}` })); next(); }} />
          </>
        )}
        <div className="row between">
          <button className="btn" onClick={next}>Saltar prueba</button>
          {'quiz' in test.type && <button className="btn primary" onClick={next}>Siguiente prueba →</button>}
        </div>
      </Card>
    </div>
  );
}

function Practical({ test }: { test: (typeof TESTS)['sax'][number] }) {
  const ty = test.type;
  const evts = useMemo(() => ('practical' in ty && ty.practical === 'improv' ? realize(progressionById(ty.progression), parseNote(ty.key)) : []), [ty]);
  if (!('practical' in ty)) return null;
  if (ty.practical === 'phrase') return <PhrasePlayer phraseId={ty.phrase} />;
  if (ty.practical === 'chords') return <ChordsView symbols={ty.symbols} voiceLead={ty.symbols.length === 3} />;
  if (ty.practical === 'scale') return <ScaleView scaleId={ty.scale} keyName={ty.key} compact />;
  return <BackingPanel events={evts} style={ty.style} bpm={100} display="chords" />;
}

function SelfRate({ onRate }: { onRate: (v: number) => void }) {
  return (
    <div className="rate">
      <span>Autoevaluación (no es una medición automática):</span>
      {PRACTICAL_SCALE.map((o) => <button key={o.value} className="btn" onClick={() => onRate(o.value)}>{o.label}</button>)}
    </div>
  );
}

function Matrix() {
  const s = useAppState();
  const inst = s.instrument;
  const p = s.progress[inst];
  const rows = skillsFor(inst).map((sk) => ({ sk, lv: skillLevel(p.skills[sk]) }));
  const strong = rows.filter((r) => r.lv !== null && r.lv >= 70);
  const weak = rows.filter((r) => r.lv !== null && r.lv < 50);
  const unknown = rows.filter((r) => r.lv === null);
  const next = currentLesson(p, inst);
  return (
    <div className="page">
      <h1>Matriz de habilidades · {INSTRUMENT_LABEL[inst]}</h1>
      <div className="grid3">
        <Card title="Fortalezas">{strong.length ? strong.map((r) => <p key={r.sk}>✔ {SKILL_LABEL[r.sk]} ({r.lv})</p>) : <p className="muted">Ninguna destacada todavía.</p>}</Card>
        <Card title="A reforzar">{weak.length ? weak.map((r) => <p key={r.sk}>▲ {SKILL_LABEL[r.sk]} ({r.lv})</p>) : <p className="muted">Nada por debajo de 50.</p>}</Card>
        <Card title="Pendiente de evaluar">{unknown.length ? unknown.map((r) => <p key={r.sk}>? {SKILL_LABEL[r.sk]}</p>) : <p className="muted">Todo tiene alguna evidencia.</p>}</Card>
      </div>
      <Card>
        <p>Primera lección recomendada: <a href={`#/leccion/${next.id}`}>{next.title}</a>. Tu sesión diaria ya está adaptada a este diagnóstico.</p>
        <div className="row gap"><a className="btn primary" href="#/hoy">Ir a Mi práctica de hoy</a><a className="btn" href="#/progreso">Ver progreso detallado</a></div>
      </Card>
    </div>
  );
}

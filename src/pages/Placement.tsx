// Prueba de nivel adaptativa (como la de Duolingo): preguntas iniciales, luego ejercicios reales de
// cada nivel —más difíciles si aciertas, se detiene cuando fallas— y una improvisación grabada opcional.
import { useMemo, useState } from 'react';
import { LEVELS, nodesFor, unitsFor } from '../learn/curriculum';
import { ItemSession, SessionResult, buildItems, commitSession, useGenCtx } from '../learn/LessonRunner';
import { ImprovAnalyzer, ImprovStats } from '../learn/ImprovAnalyzer';
import { addEvidence, markNodesByTest, unlockAchievement, update, useAppState } from '../progress/store';
import { INSTRUMENT_LABEL } from '../theory/instruments';
import { progressionById, realize } from '../theory/progressions';
import { parseNote } from '../theory/notes';
import { resolveKey } from '../learn/curriculum';
import { Card } from '../components/common';
import { QUESTIONS } from '../content/diagnostic';

const QS = [
  { id: 'plays', q: '¿Ya tocas este instrumento?', opts: ['Nunca lo he tocado', 'Un poco (menos de 1 año)', 'Sí, toco canciones', 'Sí, e improviso'] },
  { id: 'read', q: '¿Lees partitura?', opts: ['No', 'Despacio', 'Con soltura'] },
  { id: 'theory', q: '¿Qué sabes de armonía?', opts: ['Nada aún', 'Escalas y acordes básicos', 'Séptimas y ii-V-I', 'Notas guía, modos, sustituciones'] },
];

export function PlacementPage() {
  const s = useAppState();
  const inst = s.instrument;
  const [stage, setStage] = useState<'intro' | 'q' | 'test' | 'improv' | 'result'>('intro');
  // reutiliza lo ya respondido: la prueba anterior o el diagnóstico
  const [ans, setAns] = useState<Record<string, number>>(() => {
    if (s.path[inst].answers) return { ...s.path[inst].answers };
    const d = s.progress[inst].diagnostic;
    if (!d) return {};
    const idx = (id: string, v: string) => QUESTIONS.find((q) => q.id === id)?.options?.indexOf(v) ?? -1;
    const out: Record<string, number> = {};
    const exp = idx('experience', d.experience), imp = idx('improvExperience', d.improvExperience), rd = idx('reading', d.reading), hm = idx('harmony', d.harmony);
    if (exp >= 0 || imp >= 0) out.plays = imp >= 2 ? 3 : exp >= 1 ? 2 : 1;
    if (rd >= 0) out.read = Math.min(2, rd);
    if (hm >= 0) out.theory = [1, 1, 2, 3][hm];
    return out;
  });
  const reused = !!s.path[inst].answers || !!s.progress[inst].diagnostic;
  const saveAnswers = () => update((x) => { x.path[inst].answers = { ...ans }; });
  const [level, setLevel] = useState(0);
  const [tested, setTested] = useState<Record<number, number>>({}); // nivel → precisión
  const [passed, setPassed] = useState(-1);
  const [improv, setImprov] = useState<ImprovStats | null>(null);
  const [seed] = useState(() => Math.floor(Math.random() * 1e6));
  const ctx = useGenCtx(seed + level * 1000, level <= 1 ? 1 : 2);
  const items = useMemo(() => {
    const specs = unitsFor(inst).filter((u) => u.level === level).flatMap((u) => u.items);
    return buildItems(specs, 6, ctx, !s.game.micOk);
  }, [inst, level, ctx]); // eslint-disable-line react-hooks/exhaustive-deps

  const estimate = () => {
    const p = ans.plays ?? 0;
    const t = ans.theory ?? 0;
    return Math.max(0, Math.min(4, Math.round((p * 1.2 + t) / 1.6)));
  };
  const onStage = (res: SessionResult) => {
    const acc = res.answered ? res.correct / res.answered : 0;
    const ok = res.answered >= 3 && acc >= 0.7;
    const t = { ...tested, [level]: acc };
    setTested(t);
    if (ok) {
      setPassed(Math.max(passed, level));
      if (level < 5) { setLevel(level + 1); return; }
      finish(level, t);
    } else if (level > 0 && t[level - 1] === undefined) setLevel(level - 1);
    else finish(passed, t);
  };
  const finish = (best: number, t: Record<number, number>) => {
    void t;
    setPassed(best);
    setStage(best >= 1 ? 'improv' : 'result');
  };
  const startLevel = Math.max(0, estimate() - 1);
  const placed = Math.max(0, Math.min(5, passed + 1));

  if (stage === 'intro') return (
    <div className="page"><Card className="tip-card">
      <div className="mascot big">🧭</div>
      <h1>Prueba de nivel · {INSTRUMENT_LABEL[inst]}</h1>
      <p>Tres preguntas rápidas y luego ejercicios reales: escuchar, leer, ritmo y <b>tocar con tu instrumento</b> (el micrófono comprueba las notas). Si aciertas, la prueba sube de nivel; si fallas, se detiene. Al final puedes improvisar 1 vuelta de blues para que la app mida tus notas.</p>
      <p className="muted small">Ten el instrumento a mano y, si puedes, usa auriculares. Si ahora no puedes tocar, desactiva el micrófono:</p>
      <label className="toggle"><input type="checkbox" checked={s.game.micOk} onChange={(e) => update((x) => { x.game.micOk = e.target.checked; })} />Incluir ejercicios con micrófono</label>
      <div><button className="btn primary big" onClick={() => setStage('q')}>Empezar</button></div>
    </Card></div>
  );
  if (stage === 'q') return (
    <div className="page"><Card>
      {reused && <p className="hint small">Ya marcamos lo que respondiste antes{s.progress[inst].diagnostic ? ' en el diagnóstico' : ''}. Revísalo y continúa.</p>}
      {QS.map((q) => (
        <div key={q.id} className="dq"><p><b>{q.q}</b></p>
          <div className="chip-row">{q.opts.map((o, i) => <button key={o} className={`chip big ${ans[q.id] === i ? 'on' : ''}`} onClick={() => setAns({ ...ans, [q.id]: i })}>{o}</button>)}</div>
        </div>
      ))}
      <button className="btn primary big" disabled={Object.keys(ans).length < QS.length} onClick={() => { saveAnswers(); if ((ans.plays ?? 0) === 0) { setPassed(-1); setStage('result'); } else { setLevel(startLevel); setStage('test'); } }}>Continuar</button>
    </Card></div>
  );
  if (stage === 'test') return (
    <div className="page lesson-page">
      <p className="center muted small">Evaluando el nivel {level}: {LEVELS[level].name}</p>
      <ItemSession key={level} items={items} ctx={ctx} requeueWrong={false} recordToProfile={false} title={`Prueba · Nivel ${level}`} onExit={() => (window.location.hash = '#/camino')} onFinish={onStage} />
    </div>
  );
  if (stage === 'improv') {
    const key = resolveKey('written:G', inst, s.settings.saxType);
    const k = inst === 'sax' ? key : inst === 'guitar' ? 'A' : 'C';
    return (
      <div className="page"><Card title="Último paso (opcional): improvisa una vuelta de blues">
        <p>Toca lo que quieras sobre el blues en {k} (concierto){inst === 'sax' ? ' — para tu saxo: Sol' : ''}. La app mide qué notas tocaste respecto a la escala y a los acordes.</p>
        <ImprovAnalyzer events={realize(progressionById('blues12'), parseNote(k))} keyRoot={parseNote(k)} blues style="blues" bpm={90} onResult={(st) => { setImprov(st); if (st.notes >= 4) addEvidence(inst, 'improvisacion', { source: 'deteccion', value: Math.round((Number.isNaN(st.chordTones) ? st.inScale : (st.inScale + st.chordTones) / 2) * 100), note: 'Prueba de nivel' }); }} />
        <div className="row gap"><button className="btn primary" onClick={() => setStage('result')}>{improv ? 'Ver mi nivel' : 'Saltar este paso'}</button></div>
      </Card></div>
    );
  }
  // resultado
  const lv = LEVELS[placed];
  const accept = () => {
    const nodes = nodesFor(inst).filter((n) => n.unit.level < placed);
    markNodesByTest(inst, nodes.map((n) => n.id), placed);
    unlockAchievement('placement');
    commitSession(inst, { correct: 0, answered: 0, skipped: 0, wrongKeys: [], failed: false, perSkill: {}, measured: 0 }, 10);
    Object.entries(tested).forEach(([l, a]) => addEvidence(inst, 'armonia', { source: 'quiz', value: Math.round(a * 100), note: `Prueba de nivel: nivel ${l}` }));
    window.location.hash = '#/camino';
  };
  return (
    <div className="page"><Card className="tip-card">
      <div className="mascot big">🎉</div>
      <h1>Tu nivel en {INSTRUMENT_LABEL[inst]}: {placed} · {lv.name}</h1>
      <p>{lv.desc}</p>
      <ul className="small">
        {Object.entries(tested).sort().map(([l, a]) => <li key={l}>Nivel {l}: {Math.round(a * 100)}% de aciertos {a >= 0.7 ? '✔ superado' : '✘ por trabajar'}</li>)}
        {improv && <li>Improvisación: {improv.notes} notas, {Math.round(improv.inScale * 100)}% en la escala{Number.isNaN(improv.chordTones) ? '' : `, ${Math.round(improv.chordTones * 100)}% notas del acorde`}.</li>}
      </ul>
      <p className="muted small">Todo lo anterior al nivel {placed} se marca como superado (puedes repasarlo cuando quieras). Si algo te resulta difícil, el camino te lo hará repasar.</p>
      <button className="btn primary big" onClick={accept}>Empezar en el Nivel {placed}</button>
    </Card></div>
  );
}

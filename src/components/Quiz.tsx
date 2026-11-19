import { useEffect, useMemo, useState } from 'react';
import { QUIZ_LABEL, QUIZ_SKILLS, Question, makeQuestion } from '../content/quiz';
import { QuizKind } from '../content/types';
import { getState, recordQuiz } from '../progress/store';
import { ensureAudio, playSequence, stopSequence, triggerNotes } from '../audio/engine';
import { InstrumentView } from './InstrumentView';
import { useTransposer } from './common';

export function Quiz({ kind, count, lessonId, concept, onDone }: { kind: QuizKind; count: number; lessonId?: string; concept?: string; onDone?: (score: number) => void }) {
  const t = useTransposer();
  const sax = getState().settings.saxType;
  const questions = useMemo<Question[]>(() => Array.from({ length: count }, () => makeQuestion(kind, { sax })), [kind, count, sax]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const q = questions[i];
  useEffect(() => () => stopSequence(), []);

  const play = async () => {
    if (!q.audio) return;
    await ensureAudio();
    const { midis, mode, voice } = q.audio;
    if (mode === 'melodic') playSequence(voice ?? 'piano', midis.map((m, k) => ({ midi: m, start: k * (k === 0 && midis[0].length > 1 ? 0 : 1), dur: k === 0 && midis[0].length > 1 ? midis.length : 0.95 })), 90);
    else if (mode === 'harmonic') triggerNotes('piano', midis.flat(), 1.5);
    else playSequence('piano', midis.map((m, k) => ({ midi: m, start: k * 1.5, dur: 1.4 })), 80);
  };
  useEffect(() => {
    if (q?.audio) play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const choose = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    if (k === q.answer) setCorrect((c) => c + 1);
  };
  const next = () => {
    if (i + 1 >= questions.length) {
      const score = Math.round((correct / questions.length) * 100);
      recordQuiz(t.instrument, lessonId ?? null, concept ?? null, score, QUIZ_SKILLS[kind]);
      setDone(true);
      onDone?.(score);
      return;
    }
    setI(i + 1);
    setPicked(null);
  };
  if (done) {
    const score = Math.round((correct / questions.length) * 100);
    return (
      <div className="quiz done">
        <div className="score">{correct}/{questions.length}</div>
        <p>{score >= 80 ? '¡Muy bien! Este contenido se programará para repaso más espaciado.' : score >= 50 ? 'Bien encaminado. Repite el ejercicio otro día.' : 'Vale la pena repasar el concepto y volver a intentarlo.'}</p>
        <p className="muted small">Resultado registrado como evidencia medible (respuestas correctas) en tu progreso de {t.instrument === 'sax' ? 'saxofón' : t.instrument === 'guitar' ? 'guitarra' : 'piano'}.</p>
        <button className="btn" onClick={() => { setI(0); setPicked(null); setCorrect(0); setDone(false); }}>Repetir</button>
      </div>
    );
  }
  return (
    <div className="quiz">
      <div className="row between"><span className="muted small">{QUIZ_LABEL[kind]} · {i + 1}/{questions.length}</span><span className="muted small">Aciertos: {correct}</span></div>
      <p className="q-prompt">{q.prompt}</p>
      {q.audio && <button className="btn" onClick={play}>🔊 Escuchar otra vez</button>}
      {q.highlight?.fret && <InstrumentView notes={[]} question={q.highlight.fret} forceView="fretboard" />}
      {q.highlight?.keyMidi !== undefined && <InstrumentView notes={[]} question={q.highlight.keyMidi} forceView="keyboard" sequence={[]} />}
      <div className="options">
        {q.options.map((o, k) => (
          <button key={k} className={`opt ${picked !== null ? (k === q.answer ? 'right' : k === picked ? 'wrong' : '') : ''}`} onClick={() => choose(k)}>{o}</button>
        ))}
      </div>
      {picked !== null && (
        <div className="feedback">
          <p>{picked === q.answer ? '✔ Correcto.' : `✘ Era: ${q.options[q.answer]}.`} {q.explanation}</p>
          <button className="btn primary" onClick={next}>{i + 1 >= questions.length ? 'Ver resultado' : 'Siguiente'}</button>
        </div>
      )}
    </div>
  );
}

// Sesión de ejercicios al estilo Duolingo: barra de progreso, respuesta inmediata, los errores
// vuelven al final, vidas en los desafíos y pantalla de celebración con XP y estrellas.
import { useMemo, useState } from 'react';
import { Item, GenCtx, generateItem, ItemSpec } from './items';
import { ItemView, Verdict } from './ItemView';
import { Tip } from './curriculum';
import { ensureAudio, triggerNotes, Tone } from '../audio/engine';
import { SkillId, addEvidence, addXp, clearMistake, recordMistake, useAppState } from '../progress/store';
import { InstrumentId } from '../theory/instruments';
import { Mascot } from '../components/Art';

export interface SessionResult { correct: number; answered: number; skipped: number; wrongKeys: string[]; failed: boolean; perSkill: Record<string, { ok: number; n: number }>; measured: number }

function chime(ok: boolean) {
  void ensureAudio().then(() => {
    const t = Tone.now() + 0.01;
    if (ok) { triggerNotes('piano', [76], 0.25, t, 0.5, 'comp'); triggerNotes('piano', [83], 0.4, t + 0.09, 0.5, 'comp'); }
    else triggerNotes('piano', [52, 58], 0.4, t, 0.45, 'comp');
  });
}

export function ItemSession({ items, ctx, hearts, requeueWrong = true, intro, title, onFinish, onExit, recordToProfile = true }: {
  items: Item[]; ctx: GenCtx; hearts?: number; requeueWrong?: boolean; intro?: Tip[]; title: string;
  onFinish: (r: SessionResult) => void; onExit: () => void; recordToProfile?: boolean;
}) {
  const [queue, setQueue] = useState<Item[]>(items);
  const [idx, setIdx] = useState(0);
  const [tip, setTip] = useState(intro && intro.length ? 0 : -1);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [lives, setLives] = useState(hearts ?? 0);
  const [res, setRes] = useState<SessionResult>({ correct: 0, answered: 0, skipped: 0, wrongKeys: [], failed: false, perSkill: {}, measured: 0 });
  const [skipMic, setSkipMic] = useState(false);
  const total = items.length;
  const item = queue[idx];

  const answer = (v: Verdict) => {
    if (verdict) return;
    if (v.skipped) {
      // "ahora no puedo tocar": se salta este y los siguientes ejercicios de micrófono
      setSkipMic(true);
      const r = { ...res, skipped: res.skipped + 1 };
      setRes(r);
      advance(r, queue, true);
      return;
    }
    setVerdict(v);
    chime(v.correct);
    const r: SessionResult = { ...res, answered: res.answered + 1, correct: res.correct + (v.correct ? 1 : 0), measured: res.measured + (v.measured ? 1 : 0), perSkill: { ...res.perSkill } };
    for (const s of item.skills) { const p = r.perSkill[s] ?? { ok: 0, n: 0 }; r.perSkill[s] = { ok: p.ok + (v.correct ? 1 : 0), n: p.n + 1 }; }
    if (!v.correct) {
      r.wrongKeys = [...r.wrongKeys, item.key];
      if (recordToProfile) recordMistake(ctx.instrument, item.key);
      if (hearts !== undefined) { const nl = lives - 1; setLives(nl); if (nl <= 0) r.failed = true; }
      if (requeueWrong && !r.failed) setQueue([...queue, generateItem(item.spec, { ...ctx, seed: ctx.seed + queue.length * 97 + 13 })]);
    } else if (recordToProfile && queue.slice(0, idx).every((q) => q.key !== item.key)) clearMistake(ctx.instrument, item.key);
    setRes(r);
  };
  const advance = (r: SessionResult, q: Item[], fromSkip = false) => {
    setVerdict(null);
    let next = idx + 1;
    while (next < q.length && (skipMic || fromSkip) && q[next].answer.type.startsWith('mic')) next++;
    if (r.failed || next >= q.length) onFinish(r);
    else setIdx(next);
  };

  if (tip >= 0 && intro) {
    const t = intro[tip];
    return (
      <div className="session">
        <SessionTop progress={0} onExit={onExit} title={title} />
        <div className="tip-card">
          <Mascot inst={ctx.instrument} size={96} mood="happy" />
          <h2>{t.title}</h2>
          <p>{t.text}</p>
          <button className="btn primary big" onClick={() => setTip(tip + 1 < intro.length ? tip + 1 : -1)}>{tip + 1 < intro.length ? 'Siguiente' : '¡A practicar!'}</button>
        </div>
      </div>
    );
  }
  if (!item) return null;
  const done = res.correct;
  return (
    <div className="session">
      <SessionTop progress={Math.min(1, done / total)} onExit={onExit} title={title} lives={hearts !== undefined ? lives : undefined} />
      <ItemView key={`${idx}-${item.key}`} item={item} ctx={ctx} onVerdict={answer} locked={!!verdict} />
      {verdict && (
        <div className={`verdict ${verdict.correct ? 'good' : 'bad'}`}>
          <div>
            <b>{verdict.correct ? pick(['¡Bien!', '¡Excelente!', '¡Correcto!', '¡Eso es!']) : 'Casi…'}</b>
            {verdict.detail && <p>{verdict.detail}</p>}
            <p className="small">{item.explain}</p>
            {!verdict.measured && <p className="small muted">Autoevaluado (no medido).</p>}
          </div>
          <button className={`btn big ${verdict.correct ? 'primary' : 'danger'}`} onClick={() => advance(res, queue)}>Continuar</button>
        </div>
      )}
    </div>
  );
}
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function SessionTop({ progress, onExit, title, lives }: { progress: number; onExit: () => void; title: string; lives?: number }) {
  return (
    <div className="session-top">
      <button className="x" onClick={onExit} aria-label="Salir">✕</button>
      <div className="pbar"><span style={{ width: `${progress * 100}%` }} /></div>
      {lives !== undefined && <span className="lives">{'❤️'.repeat(Math.max(0, lives))}{'🤍'.repeat(Math.max(0, 3 - lives))}</span>}
      <span className="session-title">{title}</span>
    </div>
  );
}

/** Construye la cola de ejercicios para un nodo/sesión. */
export function buildItems(specs: ItemSpec[], n: number, ctx: GenCtx, avoidMic: boolean): Item[] {
  const pool = avoidMic ? specs.filter((s) => !['play-note', 'play-seq', 'call-response', 'play-chord'].includes(s.t)) : specs;
  const use = pool.length ? pool : specs;
  const out: Item[] = [];
  let last = '';
  for (let k = 0; k < n * 3 && out.length < n; k++) {
    const spec = use[(k + Math.floor(ctx.seed % use.length)) % use.length];
    const it = generateItem(spec, { ...ctx, seed: ctx.seed * 31 + k * 7 + 1 });
    const sig = it.prompt + JSON.stringify(it.answer);
    if (sig === last && use.length > 1) continue;
    last = sig;
    out.push(it);
  }
  return out;
}

export function Celebration({ res, xp, stars, title, onContinue, failed, extra }: { res: SessionResult; xp: number; stars: number; title: string; onContinue: () => void; failed?: boolean; extra?: React.ReactNode }) {
  const inst = useAppState().instrument;
  const acc = res.answered ? res.correct / res.answered : 1;
  return (
    <div className={`celebrate ${failed ? 'failed' : ''}`}>
      {!failed && <div className="confetti">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 0.12}s`, background: ['#f2b544', '#5ec2b7', '#6aa7ff', '#ff6b6b', '#b58cff'][i % 5] }} />)}</div>}
      <Mascot inst={inst} size={130} mood={failed ? 'sad' : 'happy'} />
      <h1>{failed ? 'Te quedaste sin vidas' : title}</h1>
      {!failed && <div className="stars">{[1, 2, 3].map((s) => <span key={s} className={s <= stars ? 'on' : ''}>★</span>)}</div>}
      <div className="cele-stats">
        <div><b>+{xp}</b><span>XP</span></div>
        <div><b>{Math.round(acc * 100)}%</b><span>precisión</span></div>
        <div><b>{res.correct}/{res.answered}</b><span>aciertos</span></div>
      </div>
      {failed && <p>No pasa nada: repasa la unidad y vuelve a intentarlo. Los errores quedaron guardados para tu repaso.</p>}
      {res.skipped > 0 && <p className="muted small">{res.skipped} ejercicio(s) con micrófono saltado(s).</p>}
      {extra}
      <button className="btn primary big" onClick={onContinue}>Continuar</button>
    </div>
  );
}

/** Registra en el perfil el resultado de una sesión (XP + evidencias por habilidad). */
export function commitSession(instrument: InstrumentId, res: SessionResult, xp: number) {
  addXp(xp);
  for (const [skill, v] of Object.entries(res.perSkill)) if (v.n >= 2) addEvidence(instrument, skill as SkillId, { source: 'quiz', value: Math.round((v.ok / v.n) * 100), note: 'Lección del camino' });
}

export function useGenCtx(seedBase: number, diff: 1 | 2 | 3): GenCtx {
  const s = useAppState();
  return useMemo(() => ({ instrument: s.instrument, sax: s.settings.saxType, solfeo: s.settings.noteNames === 'solfeo', seed: seedBase, diff }), [s.instrument, s.settings.saxType, s.settings.noteNames, seedBase, diff]);
}

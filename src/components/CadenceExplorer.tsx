// Explorador de cadencias: 1) eliges la cadencia, 2) eliges qué escala tocar sobre cada acorde (o una para
// todo), 3) subes una escalera de ideas: escala → tríadas y arpegios → ideas compuestas → bebop → frases clave.
// Cada idea se ve en partitura, suena con acompañamiento, se puede repetir frase a frase y tiene un reto.
import { useEffect, useMemo, useState } from 'react';
import { BackingStyle, STYLE_LABEL } from '../audio/backing';
import { CADENCES, EXERCISES, ExCtx, STEPS, ScalePick, ScaleTag, StepId, cadenceById, cadenceEvents, easyPicks, exerciseById, exercisesOf, modeOver, pickNotes, pickPcs, scaleOptions } from '../theory/cadence';
import { chordNotes, chordSymbol } from '../theory/chords';
import { IV, parseNote, pc, transposeNote } from '../theory/notes';
import { scaleById } from '../theory/scales';
import { ChosenScale } from '../theory/line';
import { markExplored, useAppState, EXPLORE_XP } from '../progress/store';
import { trackFeature } from '../telemetry/telemetry';
import { SoloPlayer } from './SoloPlayer';
import { KeySelect } from './ExerciseRunner';
import { soloRange, useTransposer } from './common';

const TAG_LABEL: Record<ScaleTag, string> = { recomendada: '★ recomendada', segura: 'segura', color: 'color', 'tensión': 'tensión', bebop: 'bebop', blues: 'blues' };
const SEEDED = new Set(['beb-aprox', 'beb-encl', 'ide-guia', 'ide-motivo', 'beb-linea']);

export function CadenceExplorer() {
  const t = useTransposer();
  const app = useAppState();
  const kid = app.settings.profile === 'nino';
  const [cadId, setCadId] = useState(kid ? 'blues' : 'iiVI');
  const cad = cadenceById(cadId);
  const [key, setKey] = useState(cad.defaultKey);
  const [style, setStyle] = useState<BackingStyle>(cad.blues ? 'blues' : 'swing');
  const [mode, setMode] = useState<'easy' | 'chord'>(kid || app.settings.simple ? 'easy' : 'chord');
  const [over, setOver] = useState<Record<string, ScalePick>>({});
  const [step, setStep] = useState<StepId>('escala');
  const [exId, setExId] = useState('esc-fund');
  const [seed, setSeed] = useState(1);
  const [toast, setToast] = useState<string | null>(null);

  const chooseCadence = (id: string) => {
    const c = cadenceById(id);
    setCadId(id); setKey(c.defaultKey); setOver({}); setStyle(c.blues ? 'blues' : 'swing');
    trackFeature('explorador-cadencia', { cadencia: id });
  };
  const keyRoot = parseNote(key);
  const events = useMemo(() => cadenceEvents(cad, keyRoot), [cad, key]); // eslint-disable-line react-hooks/exhaustive-deps
  // acordes distintos (en orden) para elegir escala una sola vez por acorde
  const unique = useMemo(() => {
    const seen = new Map<string, number>();
    events.forEach((e, i) => { const s = chordSymbol(e.chord); if (!seen.has(s)) seen.set(s, i); });
    return [...seen.entries()].map(([s, i]) => ({ sym: s, i, chord: events[i].chord, roman: events[i].roman ?? '', options: scaleOptions(cad, events, i) }));
  }, [events, cad]);
  const picks = useMemo<ScalePick[]>(() => {
    if (mode === 'easy') return easyPicks(cad, events, keyRoot);
    return events.map((e) => {
      const s = chordSymbol(e.chord);
      return over[s] ?? unique.find((u) => u.sym === s)!.options[0];
    });
  }, [mode, cad, events, over, unique]); // eslint-disable-line react-hooks/exhaustive-deps
  const scaleName = (p: ScalePick) => `${t.noteName(p.root)} ${scaleById(p.scale).name.toLowerCase()}`;
  const range = soloRange(t.instrument, app.settings.saxType);
  const ex = exerciseById(exId);
  const ctx: ExCtx = { events, picks, range, keyRoot, minor: !!cad.minor, blues: !!cad.blues, loops: !!cad.loops, seed, names: { note: t.noteName, chord: t.chordName }, scaleName };
  const result = useMemo(() => ex.build(ctx), [ex, events, picks, range.lo, range.hi, seed, t.instrument, t.sax, app.settings.noteNames]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = useMemo<ChosenScale[]>(() => picks.map((p) => ({ pcs: pickPcs(p), notes: pickNotes(p), name: scaleName(p) })), [picks, t.instrument, t.sax]); // eslint-disable-line react-hooks/exhaustive-deps

  const doneKey = (id: string) => `${cad.id}:${id}`;
  const isDone = (id: string) => !!app.explorer[doneKey(id)];
  const doneCount = EXERCISES.filter((e) => isDone(e.id)).length;
  const goStep = (s: StepId) => { setStep(s); setExId(exercisesOf(s)[0].id); setSeed(1); };
  const goEx = (id: string) => { setExId(id); setStep(exerciseById(id).step); setSeed(1); };
  const nextEx = () => {
    const i = EXERCISES.findIndex((e) => e.id === exId);
    const nx = EXERCISES[(i + 1) % EXERCISES.length];
    goEx(nx.id);
  };
  const tried = () => {
    const first = markExplored(doneKey(ex.id));
    trackFeature('explorador-probado', { cadencia: cad.id, ejercicio: ex.id });
    setToast(first ? `+${EXPLORE_XP} XP · ¡bien! Sigue con la siguiente idea.` : 'Ya lo habías probado: ¡repetir es como se aprende!');
  };
  useEffect(() => { if (!toast) return; const h = setTimeout(() => setToast(null), 2600); return () => clearTimeout(h); }, [toast]);
  const bpm = step === 'escala' || step === 'arpegios' ? (kid ? 70 : 80) : step === 'ideas' ? 90 : 110;
  const chordsLine = (evts = events) => {
    const out: string[] = [];
    evts.forEach((e, i) => { if (i === 0 || chordSymbol(e.chord) !== chordSymbol(evts[i - 1].chord)) out.push(t.chordName(e.chord)); });
    return out;
  };

  return (
    <div className="cx">
      <p className="small muted cx-intro">Elige una cadencia, decide qué escala tocar sobre cada acorde y prueba ideas de menos a más: escala → arpegios → ideas → bebop → frases clave. Cada idea suena con acompañamiento y la puedes repetir frase a frase.</p>

      <section className="cx-sec">
        <h3 className="cx-h"><span className="cx-num">1</span> Elige la cadencia</h3>
        <div className="cx-cads">
          {CADENCES.map((c) => {
            const evts = cadenceEvents(c, parseNote(c.id === cadId ? key : c.defaultKey));
            return (
              <button key={c.id} className={`cx-cad ${c.id === cadId ? 'on' : ''}`} onClick={() => chooseCadence(c.id)} aria-pressed={c.id === cadId}>
                <span className="cx-cad-top"><b>{c.name}</b><span className="cx-lvl" aria-label={`Nivel ${c.level}`}>{'●'.repeat(c.level)}{'○'.repeat(3 - c.level)}</span></span>
                <span className="cx-cad-chords">{c.blues ? `${chordsLine(evts).slice(0, 3).join(' · ')} (12 compases)` : chordsLine(evts).join(' → ')}</span>
                <span className="cx-cad-short">{c.short}</span>
              </button>
            );
          })}
        </div>
        <div className="row gap wrap">
          <KeySelect value={key} onChange={setKey} />
          <label className="field inline"><span>Estilo de la base</span>
            <select value={style} onChange={(e) => setStyle(e.target.value as BackingStyle)}>{Object.entries(STYLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </label>
        </div>
        <p className="hint small"><b>{cad.name}:</b> {cad.why}</p>
      </section>

      <section className="cx-sec">
        <h3 className="cx-h"><span className="cx-num">2</span> ¿Qué escala tocas sobre cada acorde?</h3>
        <div className="segmented">
          <button className={mode === 'easy' ? 'on' : ''} onClick={() => setMode('easy')}>🙂 Fácil: una escala para todo</button>
          <button className={mode === 'chord' ? 'on' : ''} onClick={() => setMode('chord')}>🎯 Una escala por acorde</button>
        </div>
        {mode === 'easy' ? (
          <div className="cx-easy">
            <p><b>Toca {cad.easy.label}.</b> {cad.easy.why}</p>
            <div className="cx-scale-rows">
              {unique.map((u) => {
                const p = picks[u.i];
                return <ScaleRow key={u.sym} chordName={t.chordName(u.chord)} roman={u.roman} pick={p} chordPcs={chordNotes(u.chord).map(pc)} scaleName={scaleName(p)} mode={modeOver(p, u.chord.root)} rootName={t.noteName(u.chord.root)} noteName={t.noteName} />;
              })}
            </div>
          </div>
        ) : (
          <div className="cx-scale-rows">
            {unique.map((u) => {
              const p = picks[u.i];
              const sel = u.options.find((o) => o.scale === p.scale && pc(o.root) === pc(p.root)) ?? u.options[0];
              return (
                <div key={u.sym} className="cx-row">
                  <div className="cx-row-head"><b className="cx-chord">{t.chordName(u.chord)}</b><span className="muted small">{u.roman}</span></div>
                  <div className="cx-opts">
                    {u.options.map((o) => (
                      <button key={o.scale + pc(o.root)} className={`cx-opt tag-${o.tag} ${o === sel ? 'on' : ''}`} onClick={() => setOver({ ...over, [u.sym]: o })}>
                        {scaleName(o)}<small>{TAG_LABEL[o.tag]}</small>
                      </button>
                    ))}
                  </div>
                  <ScaleNotes pick={p} chordPcs={chordNotes(u.chord).map(pc)} noteName={t.noteName} />
                  <p className="small muted cx-why">{sel.why}</p>
                </div>
              );
            })}
          </div>
        )}
        {t.isSax && <p className="small muted">Nombres de notas y acordes escritos para tu saxo {app.settings.saxType}.</p>}
      </section>

      <section className="cx-sec">
        <h3 className="cx-h"><span className="cx-num">3</span> Prueba ideas, de menos a más</h3>
        <div className="cx-progress small"><span className="cx-bar"><i style={{ width: `${(doneCount / EXERCISES.length) * 100}%` }} /></span> {doneCount} de {EXERCISES.length} ideas probadas en esta cadencia</div>
        <div className="cx-ladder" role="tablist">
          {STEPS.map((s, k) => {
            const list = exercisesOf(s.id);
            const d = list.filter((e) => isDone(e.id)).length;
            return (
              <button key={s.id} role="tab" aria-selected={s.id === step} className={`cx-step ${s.id === step ? 'on' : ''} ${d === list.length ? 'done' : ''}`} onClick={() => goStep(s.id)}>
                <span className="cx-step-ico" aria-hidden="true">{d === list.length ? '✓' : s.icon}</span>
                <span className="cx-step-txt"><b>{k + 1}. {s.name}</b><small>{d}/{list.length}</small></span>
              </button>
            );
          })}
        </div>
        <p className="small muted">{STEPS.find((s) => s.id === step)!.goal}</p>
        <div className="cx-exs">
          {exercisesOf(step).map((e, k) => (
            <button key={e.id} className={`chip ${e.id === exId ? 'on' : ''}`} onClick={() => goEx(e.id)}>{isDone(e.id) ? '✓ ' : `${String.fromCharCode(97 + k)}) `}{e.name}</button>
          ))}
        </div>
        <div className="card cx-ex">
          <h4 className="cx-ex-title">{ex.name}</h4>
          <p>{ex.how}</p>
          {ex.origin && <p className="small cx-origin">📜 <b>De dónde viene:</b> {ex.origin}</p>}
          {result ? (
            <SoloPlayer key={`${cad.id}-${key}-${mode}-${picks.map((p) => p.scale + pc(p.root)).join()}-${ex.id}-${seed}-${style}`}
              events={events} notes={result.notes} phrases={result.phrases} keyRoot={keyRoot} blues={!!cad.blues} style={style} bpm={bpm}
              source={`Explorador · ${cad.name} · ${ex.name}`} scales={chosen} />
          ) : (
            <p className="warn">No aplica a esta cadencia: {ex.needs} Prueba con «ii – V – I mayor» o «V7 → I».</p>
          )}
          <div className="cx-challenge"><b>🎯 Ahora tú:</b> {ex.challenge} <span className="muted small">Usa «▶ Base (tocas tú)»: el acompañamiento sigue en bucle hasta que lo pares.</span></div>
          <div className="row gap wrap">
            <button className={`btn ${isDone(ex.id) ? '' : 'primary'}`} onClick={tried}>{isDone(ex.id) ? '✓ Probado (repetir)' : `✓ ¡Lo probé! (+${EXPLORE_XP} XP)`}</button>
            {SEEDED.has(ex.id) && <button className="btn" onClick={() => setSeed(seed + 1)}>🎲 Otra variante</button>}
            <button className="btn" onClick={nextEx}>Siguiente idea →</button>
          </div>
          {toast && <div className="cx-toast" role="status">{toast}</div>}
        </div>
      </section>
    </div>
  );
}

function ScaleNotes({ pick, chordPcs, noteName }: { pick: ScalePick; chordPcs: number[]; noteName: (n: ReturnType<typeof parseNote>) => string }) {
  const def = scaleById(pick.scale);
  const notes = pickNotes(pick);
  const charPcs = (def.characteristic ?? []).map((d) => pc(transposeNote(pick.root, IV[d])));
  return (
    <div className="cx-notes" aria-label="Notas de la escala">
      {notes.map((n, i) => {
        const p = pc(n);
        return <span key={i} className={`cx-note ${chordPcs.includes(p) ? 'ct' : ''} ${charPcs.includes(p) ? 'char' : ''}`} title={chordPcs.includes(p) ? 'Nota del acorde' : charPcs.includes(p) ? 'Nota característica de la escala' : 'Nota de la escala'}>{noteName(n)}</span>;
      })}
      <span className="cx-note-legend small muted"><i className="ct" />del acorde <i className="char" />característica</span>
    </div>
  );
}

function ScaleRow({ chordName, roman, pick, chordPcs, scaleName, mode, rootName, noteName }: { chordName: string; roman: string; pick: ScalePick; chordPcs: number[]; scaleName: string; mode: string | null; rootName: string; noteName: (n: ReturnType<typeof parseNote>) => string }) {
  return (
    <div className="cx-row">
      <div className="cx-row-head"><b className="cx-chord">{chordName}</b><span className="muted small">{roman}</span><span className="cx-arrow">→</span><b>{scaleName}</b>{mode && <span className="muted small">(suena como {rootName} {mode.toLowerCase()})</span>}</div>
      <ScaleNotes pick={pick} chordPcs={chordPcs} noteName={noteName} />
    </div>
  );
}

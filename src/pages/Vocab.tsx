import { useMemo, useState } from 'react';
import { Rating, VocabItem, dueVocab, rateVocab, removeVocab, today, useAppState } from '../progress/store';
import { INSTRUMENT_LABEL } from '../theory/instruments';
import { parseNote } from '../theory/notes';
import { transposeLineTo } from '../theory/section';
import { SoloPlayer } from '../components/SoloPlayer';
import { Card, soloRange, useNames, useTransposer } from '../components/common';

// Círculo de cuartas: el orden en que los jazzistas practican las 12 tonalidades
export const CYCLE = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'F#', 'B', 'E', 'A', 'D', 'G'];

export function VocabPage() {
  const s = useAppState();
  const inst = s.instrument;
  const mine = s.vocab.filter((v) => v.instrument === inst);
  const due = dueVocab(s, inst);
  const [open, setOpen] = useState<string | null>(due[0]?.id ?? mine[0]?.id ?? null);
  return (
    <div className="page">
      <h1>Mi vocabulario · {INSTRUMENT_LABEL[inst]}</h1>
      <p className="lead">Frases que has guardado desde los ejemplos, lecciones o el profesor IA. Así aprenden el lenguaje los jazzistas: copiar una frase, llevarla a las 12 tonalidades y usarla en tus solos hasta que sea tuya.</p>
      {mine.length === 0 && (
        <Card><p>Aún no has guardado frases. En cualquier ejemplo de improvisación pulsa <b>☆ Vocabulario</b> junto a la frase que te guste.</p><a className="btn" href="#/lab">Ir al Laboratorio → Taller</a></Card>
      )}
      {due.length > 0 && <p className="hint">🔁 {due.length} frase(s) para repasar hoy.</p>}
      {mine.map((v) => (
        <Card key={v.id} className={open === v.id ? 'accent' : ''} title={<button className="ex-head" onClick={() => setOpen(open === v.id ? null : v.id)}>{v.title}</button>}
          actions={<span className="muted small">{v.keysPracticed.length}/12 tonalidades · {v.srs && v.srs.due <= today() ? 'repasar hoy' : `próximo repaso ${v.srs?.due ?? '—'}`}</span>}>
          {open === v.id && <VocabDrill item={v} />}
        </Card>
      ))}
    </div>
  );
}

export function VocabDrill({ item }: { item: VocabItem }) {
  const t = useTransposer();
  const names = useNames();
  const s = useAppState();
  const [k, setK] = useState(item.key);
  const range = soloRange(t.instrument, s.settings.saxType);
  const { events, notes } = useMemo(() => transposeLineTo(item.notes, item.chart, parseNote(item.key), parseNote(k), range), [item, k, range.lo, range.hi]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = events.reduce((a, e) => a + e.beats, 0);
  const idx = CYCLE.indexOf(k);
  const rate = (r: Rating) => rateVocab(item.id, r, k);
  return (
    <div>
      <p className="muted small">Origen: {item.source}. Tonalidad original: {names(parseNote(item.key))}. Practicadas: {item.keysPracticed.map((x) => names(parseNote(x))).join(', ')}.</p>
      <div className="chip-row">
        {CYCLE.map((x) => <button key={x} className={`chip ${x === k ? 'on' : ''} ${item.keysPracticed.includes(x) ? 'done' : ''}`} onClick={() => setK(x)}>{names(parseNote(x))}{t.isSax ? ` (${t.noteName(parseNote(x))})` : ''}</button>)}
      </div>
      <SoloPlayer key={k} events={events} notes={notes} keyRoot={parseNote(k)} blues={false} style="swing" bpm={100} source={item.source} hideSave
        phrases={[{ start: 0, end: total, title: item.title, text: 'Escúchala, repítela después de la base y luego tócala sin mirar. Cuando te salga, pasa a la siguiente tonalidad del círculo de cuartas.' }]} />
      <div className="rate">
        <span>¿Cómo te salió en {names(parseNote(k))}?</span>
        {(['facil', 'adecuado', 'dificil'] as Rating[]).map((r) => <button key={r} className="btn" onClick={() => rate(r)}>{{ facil: 'Fácil', adecuado: 'Adecuado', dificil: 'Difícil' }[r]}</button>)}
        <button className="btn primary" onClick={() => { rate('adecuado'); setK(CYCLE[(idx + 1) % 12]); }}>Siguiente tonalidad ({names(parseNote(CYCLE[(idx + 1) % 12]))}) →</button>
        <button className="btn sm" onClick={() => { if (confirm('¿Quitar esta frase de tu vocabulario?')) removeVocab(item.id); }}>Quitar</button>
      </div>
    </div>
  );
}

/** Bloque de repaso de vocabulario para la sesión diaria. */
export function VocabReview() {
  const s = useAppState();
  const due = dueVocab(s, s.instrument);
  if (!due.length) return <p className="muted">No hay frases pendientes de repaso. ¡Bien!</p>;
  return <VocabDrill item={due[0]} />;
}

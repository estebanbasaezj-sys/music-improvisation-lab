import { ReactNode, useCallback } from 'react';
import { useAppState } from '../progress/store';
import { Note, Pitch, noteName, noteNameEs, pitchFromMidi, midi } from '../theory/notes';
import { InstrumentId, SAX_TRANSPOSITION, concertToWrittenNote, concertToWrittenPitch } from '../theory/instruments';
import { Chord, chordSymbol } from '../theory/chords';
import { Voice, ensureAudio, triggerNotes } from '../audio/engine';

export function useNames() {
  const s = useAppState();
  const solfeo = s.settings.noteNames === 'solfeo';
  return useCallback((n: Note) => (solfeo ? noteNameEs(n) : noteName(n, true)), [solfeo]);
}

/** Para el saxofón: devuelve notas/acordes escritos; para guitarra/piano, de concierto. */
export function useTransposer() {
  const s = useAppState();
  const inst = s.instrument;
  const sax = s.settings.saxType;
  const names = useNames();
  return {
    instrument: inst,
    sax,
    isSax: inst === 'sax',
    note: (n: Note) => (inst === 'sax' ? concertToWrittenNote(n, sax) : n),
    // saxo: transposición del instrumento; guitarra: se escribe una octava por encima de como suena
    pitch: (p: Pitch) => (inst === 'sax' ? concertToWrittenPitch(p, sax) : inst === 'guitar' ? { ...p, octave: p.octave + 1 } : p),
    chord: (c: Chord): Chord => (inst === 'sax' ? { ...c, root: concertToWrittenNote(c.root, sax) } : c),
    chordName: (c: Chord) => {
      const cc = inst === 'sax' ? { ...c, root: concertToWrittenNote(c.root, sax) } : c;
      return chordSymbol(cc).replace(/^([A-G])(#|b)?/, (_m, l, a) => names({ letter: 'CDEFGAB'.indexOf(l), acc: a === '#' ? 1 : a === 'b' ? -1 : 0 }));
    },
    noteName: (n: Note) => names(inst === 'sax' ? concertToWrittenNote(n, sax) : n),
    label: inst === 'sax' ? `escrito para ${SAX_TRANSPOSITION[sax].label.toLowerCase()}` : 'concierto',
  };
}

export const voiceFor = (i: InstrumentId): Voice => (i === 'sax' ? 'sax' : i === 'guitar' ? 'guitar' : 'piano');

/** Rango MIDI de concierto adecuado para ejemplos melódicos de cada instrumento. */
export function melodicRange(i: InstrumentId, sax: 'tenor' | 'alto') {
  if (i === 'sax') return sax === 'tenor' ? { lo: 48, hi: 70 } : { lo: 53, hi: 77 }; // escrito ≈ D4–D6
  if (i === 'guitar') return { lo: 45, hi: 69 };
  return { lo: 57, hi: 81 };
}

/** Rango MIDI de concierto para solos de ejemplo (registro cómodo y expresivo de cada instrumento). */
export function soloRange(i: InstrumentId, sax: 'tenor' | 'alto') {
  if (i === 'sax') return sax === 'tenor' ? { lo: 47, hi: 70 } : { lo: 52, hi: 75 };
  if (i === 'guitar') return { lo: 50, hi: 76 };
  return { lo: 58, hi: 82 };
}

/** Octava de la tónica para que una escala de 1 octava quede en el rango del instrumento. */
export function tonicPitch(n: Note, i: InstrumentId, sax: 'tenor' | 'alto'): Pitch {
  const r = melodicRange(i, sax);
  for (let o = 1; o <= 6; o++) {
    const p = { ...n, octave: o };
    if (midi(p) >= r.lo && midi(p) + 12 <= r.hi + 2) return p;
  }
  return pitchFromMidi(r.lo, n);
}

export async function playMidi(i: InstrumentId, m: number | number[], dur = 0.6) {
  await ensureAudio();
  triggerNotes(voiceFor(i), Array.isArray(m) ? m : [m], dur);
}

export function Card({ title, children, actions, className = '' }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-h">
          {title && <h3>{title}</h3>}
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, size }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; size?: 'sm' }) {
  return (
    <div className={`segmented ${size ?? ''}`} role="radiogroup">
      {options.map((o) => (
        <button key={String(o.value)} role="radio" aria-checked={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function StatusBadge({ status }: { status: 'ok' | 'beta' | 'pendiente' }) {
  const t = { ok: 'Disponible', beta: 'Beta (mediciones limitadas)', pendiente: 'No implementado aún' }[status];
  return <span className={`badge ${status}`}>{t}</span>;
}

export const KEY_OPTIONS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

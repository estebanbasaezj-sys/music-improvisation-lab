// Vista según el instrumento activo: diapasón (guitarra), teclado (piano) o pentagrama escrito (saxo).
import { useEffect, useMemo, useState } from 'react';
import { Fretboard, Mark, Role } from '../instruments/Fretboard';
import { guitarFingerings } from '../theory/fingering';
import { Keyboard } from '../instruments/Keyboard';
import { Staff } from '../instruments/Staff';
import { Note, Pitch, midi, pc } from '../theory/notes';
import { playMidi, useNames, useTransposer } from './common';

export interface ViewNote {
  note: Note;
  degree: string;
  role: Role;
}

interface Props {
  notes: ViewNote[]; // clases de altura con ortografía y grado
  sequence?: Pitch[]; // alturas ordenadas (concierto) para pentagrama / teclado exacto
  durations?: number[];
  labelMode?: 'degree' | 'name';
  active?: number | null;
  exactKeys?: boolean; // en piano: marcar las alturas exactas de la secuencia (voicings)
  question?: { string: number; fret: number } | number;
  forceView?: 'fretboard' | 'keyboard' | 'staff';
  /** escalas y arpegios: elegir entre ver solo lo que suena (una posición) o todo el instrumento */
  pathToggle?: boolean;
  /** se está reproduciendo la secuencia (en «todo el diapasón» se resalta el recorrido) */
  playing?: boolean;
}

export function InstrumentView({ notes, sequence, durations, labelMode = 'degree', active, exactKeys, question, forceView, pathToggle, playing }: Props) {
  const t = useTransposer();
  const names = useNames();
  const [whole, setWhole] = useState(false);
  const [posIdx, setPosIdx] = useState(0);
  const seqKey = (sequence ?? []).map(midi).join(',');
  const fingerings = useMemo(() => (pathToggle && sequence?.length ? guitarFingerings(sequence.map(midi)) : []), [pathToggle, seqKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (posIdx >= fingerings.length) setPosIdx(0); }, [fingerings.length, posIdx]);
  const narrow = typeof window !== 'undefined' && window.innerWidth < 700;
  const marks = new Map<number, Mark>();
  for (const v of notes) {
    const shown = t.isSax ? t.note(v.note) : v.note;
    marks.set(pc(v.note), { label: labelMode === 'degree' ? v.degree : names(shown).replace('♭', 'b').replace('♯', '#'), role: v.role });
  }
  // notas de la secuencia que no están en las marcas (p. ej. la 3ª del arpegio en una escala blues)
  for (const p of sequence ?? []) if (pathToggle && !marks.has(pc(p))) marks.set(pc(p), { label: names(t.isSax ? t.note(p) : p).replace('♭', 'b').replace('♯', '#'), role: 'chord' });
  const activeMidi = active != null && sequence?.[active] ? midi(sequence[active]) : null;
  const view = forceView ?? (t.instrument === 'guitar' ? 'fretboard' : t.instrument === 'piano' ? 'keyboard' : 'staff');
  const onPlay = (m: number) => playMidi(t.instrument, m);
  if (view === 'fretboard') {
    const fg = fingerings[Math.min(posIdx, fingerings.length - 1)];
    const usePath = !!fg && (!whole || playing);
    const only = usePath ? [...fg.at.values()] : undefined;
    // en pantallas angostas, en «una posición» se muestra solo esa zona del mástil
    const crop = fg && !whole && narrow ? { startFret: Math.max(0, fg.from - 1), frets: Math.min(15, fg.to + 1) } : {};
    return (
      <div>
        {pathToggle && fingerings.length > 0 && (
          <div className="path-ctl">
            <div className="segmented sm">
              <button className={!whole ? 'on' : ''} onClick={() => setWhole(false)}>🎯 Solo lo que suena</button>
              <button className={whole ? 'on' : ''} onClick={() => setWhole(true)}>🗺️ Todo el diapasón</button>
            </div>
            {!whole && fingerings.length > 1 && (
              <div className="chip-row path-pos" role="group" aria-label="Posición en el mástil">
                <span className="muted small">Posición:</span>
                {fingerings.map((f, i) => (
                  <button key={i} className={`chip ${i === posIdx ? 'on' : ''}`} onClick={() => setPosIdx(i)}>{f.from === 0 ? 'Abierta' : `Traste ${f.from}`}<small> ({f.from}–{f.to})</small></button>
                ))}
              </div>
            )}
            <p className="muted small path-help">{whole ? (playing ? 'Mientras suena, se ilumina el recorrido y el resto queda tenue.' : 'Todas las notas de la escala en el mástil.') : 'Solo las notas que suenan, en una posición de la mano (4 trastes). Cambia de posición para tocarla en otra zona del mástil.'}</p>
          </div>
        )}
        <Fretboard marks={marks} onPlay={onPlay} activeMidi={activeMidi} only={only} ghost={whole && usePath} {...crop} question={typeof question === 'object' ? question : undefined} />
      </div>
    );
  }
  if (view === 'keyboard') {
    let exact: Map<number, Mark> | undefined;
    const keysOnly = exactKeys || (pathToggle && !whole);
    if (keysOnly && sequence) {
      exact = new Map();
      sequence.forEach((p) => {
        const v = notes.find((n) => pc(n.note) === pc(p));
        exact!.set(midi(p), { label: v ? (labelMode === 'degree' ? v.degree : names(p).replace('♭', 'b').replace('♯', '#')) : '', role: v?.role ?? 'chord' });
      });
    }
    const ms = sequence?.map(midi) ?? [];
    const low = Math.min(48, ...ms.map((m) => m - (m % 12)));
    const high = Math.max(84, ...ms.map((m) => m - (m % 12) + 11));
    const kb = <Keyboard low={low} high={high} marks={exact ? undefined : marks} exact={exact} onPlay={onPlay} activeMidi={activeMidi} question={typeof question === 'number' ? question : undefined} />;
    if (!pathToggle || exactKeys || !sequence?.length) return kb;
    return (
      <div>
        <div className="path-ctl">
          <div className="segmented sm">
            <button className={!whole ? 'on' : ''} onClick={() => setWhole(false)}>🎯 Solo lo que suena</button>
            <button className={whole ? 'on' : ''} onClick={() => setWhole(true)}>🗺️ Todo el teclado</button>
          </div>
        </div>
        {kb}
      </div>
    );
  }
  // pentagrama (saxo): alturas escritas
  const seq = sequence ?? [];
  const written = seq.map((p) => t.pitch(p));
  const labels = seq.map((p) => {
    const v = notes.find((n) => pc(n.note) === pc(p));
    return labelMode === 'degree' ? v?.degree ?? '' : names(t.pitch(p));
  });
  return (
    <div>
      <Staff pitches={written} durations={durations} labels={labels} active={active} onNoteClick={(i) => playMidi(t.instrument, midi(seq[i]))} title={t.isSax ? `Notación ${t.label}` : 'Notación (concierto)'} />
    </div>
  );
}

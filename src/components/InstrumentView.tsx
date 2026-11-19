// Vista según el instrumento activo: diapasón (guitarra), teclado (piano) o pentagrama escrito (saxo).
import { Fretboard, Mark, Role } from '../instruments/Fretboard';
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
}

export function InstrumentView({ notes, sequence, durations, labelMode = 'degree', active, exactKeys, question, forceView }: Props) {
  const t = useTransposer();
  const names = useNames();
  const marks = new Map<number, Mark>();
  for (const v of notes) {
    const shown = t.isSax ? t.note(v.note) : v.note;
    marks.set(pc(v.note), { label: labelMode === 'degree' ? v.degree : names(shown).replace('♭', 'b').replace('♯', '#'), role: v.role });
  }
  const activeMidi = active != null && sequence?.[active] ? midi(sequence[active]) : null;
  const view = forceView ?? (t.instrument === 'guitar' ? 'fretboard' : t.instrument === 'piano' ? 'keyboard' : 'staff');
  const onPlay = (m: number) => playMidi(t.instrument, m);
  if (view === 'fretboard')
    return <Fretboard marks={marks} onPlay={onPlay} activeMidi={activeMidi} question={typeof question === 'object' ? question : undefined} />;
  if (view === 'keyboard') {
    let exact: Map<number, Mark> | undefined;
    if (exactKeys && sequence) {
      exact = new Map();
      sequence.forEach((p) => {
        const v = notes.find((n) => pc(n.note) === pc(p));
        exact!.set(midi(p), { label: v ? (labelMode === 'degree' ? v.degree : names(p).replace('♭', 'b').replace('♯', '#')) : '', role: v?.role ?? 'chord' });
      });
    }
    const ms = sequence?.map(midi) ?? [];
    const low = Math.min(48, ...ms.map((m) => m - (m % 12)));
    const high = Math.max(84, ...ms.map((m) => m - (m % 12) + 11));
    return <Keyboard low={low} high={high} marks={exact ? undefined : marks} exact={exact} onPlay={onPlay} activeMidi={activeMidi} question={typeof question === 'number' ? question : undefined} />;
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

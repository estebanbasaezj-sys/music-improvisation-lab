import { BackingStyle } from '../audio/backing';
import { SkillId } from '../progress/store';
import { VoicingType } from '../theory/chords';
import { InstrumentId } from '../theory/instruments';

export type Step = 'escuchar' | 'imitar' | 'comprender' | 'visualizar' | 'aplicar' | 'crear' | 'evaluar' | 'consolidar';
export const STEP_LABEL: Record<Step, string> = {
  escuchar: '1 Escuchar', imitar: '2 Imitar', comprender: '3 Comprender', visualizar: '4 Visualizar',
  aplicar: '5 Aplicar', crear: '6 Crear', evaluar: '7 Evaluar', consolidar: '8 Consolidar',
};

export type QuizKind =
  | 'interval-ear' | 'chord-ear' | 'triad-ear' | 'chord-notes' | 'scale-for-chord' | 'fret-note'
  | 'key-note' | 'sax-transpose' | 'progression-ear' | 'degree' | 'guide-tone' | 'mode-ear' | 'scale-notes';

export type Exercise = { step: Step; title: string; text?: string } & (
  | { kind: 'scale'; scale: string; key: string; showArpeggio?: string }
  | { kind: 'chords'; symbols: string[]; voicings?: VoicingType[]; voiceLead?: boolean }
  | { kind: 'progression'; progression: string; key: string; style: BackingStyle; bpm: number; display: 'chords' | 'guide' | 'scales' | 'arpeggios' }
  | { kind: 'phrase'; phrase: string; key?: string }
  | { kind: 'quiz'; quiz: QuizKind; count: number; concept?: string }
  | { kind: 'improv'; progression: string; key: string; style: BackingStyle; bpm: number; prompts: string[]; minutes: number; scale?: string }
  | { kind: 'compare'; progression: string; key: string; scales: string[]; style: BackingStyle; bpm: number }
  | { kind: 'record'; prompt: string; criteria: string[] }
  | { kind: 'song'; song: string }
  | { kind: 'transpose'; phrase: string; keys: string[] }
  | { kind: 'vocab' }
);

export interface Lesson {
  id: string;
  track: InstrumentId | 'shared';
  module: string;
  title: string;
  level: 1 | 2 | 3;
  skills: SkillId[];
  concept?: string; // concepto compartido relacionado
  what: string;
  why: string;
  sound: string;
  how: Partial<Record<InstrumentId, string>>;
  songs: string[];
  improv: string;
  exercises: Exercise[];
  resources?: string[]; // ids de recursos relacionados
}

export interface Module {
  id: string;
  track: InstrumentId | 'shared';
  title: string;
  goal: string;
  phase: 1 | 2 | 3;
}

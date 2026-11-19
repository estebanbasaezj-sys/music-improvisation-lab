import { useEffect, useMemo, useState } from 'react';
import { playSequence, stopSequence } from '../audio/engine';
import { ChordDiagram } from '../instruments/ChordDiagram';
import { Chord, VOICING_LABELS, VoicingType, chordNotes, chordPitches, parseChord, voiceLead, voicing } from '../theory/chords';
import { fingeringMidis, fingeringsFor } from '../theory/instruments';
import { midi, pc } from '../theory/notes';
import { InstrumentView, ViewNote } from './InstrumentView';
import { Segmented, playMidi, tonicPitch, useTransposer, voiceFor } from './common';

export function chordViewNotes(c: Chord): ViewNote[] {
  return chordNotes(c).map((n, i) => ({ note: n, degree: c.quality.degrees[i], role: i === 0 ? 'root' : ['3', 'b3', '7', 'b7', 'bb7'].includes(c.quality.degrees[i]) ? 'guide' : 'chord' }));
}

export function ChordsView({ symbols, voicings, voiceLead: vl }: { symbols: string[]; voicings?: VoicingType[]; voiceLead?: boolean }) {
  const t = useTransposer();
  const chords = useMemo(() => symbols.map(parseChord), [symbols]);
  const [sel, setSel] = useState(0);
  const vtypes: VoicingType[] = voicings ?? (vl ? [] : ['root', 'inv1', 'inv2', 'inv3', 'shell137', 'rootlessA', 'rootlessB']);
  const [vt, setVt] = useState<VoicingType | 'lead'>(vl ? 'lead' : vtypes[0] ?? 'root');
  const [gIdx, setGIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => stopSequence(), []);
  const c = chords[Math.min(sel, chords.length - 1)];
  const led = useMemo(() => voiceLead(chords), [chords]);
  const fingerings = useMemo(() => fingeringsFor(c), [c]);

  const pianoVoicing = (i: number) => {
    const ch = chords[i];
    if (vt === 'lead') return led[i];
    const usable = vt === 'inv3' && ch.quality.degrees.length < 4 ? 'root' : vt;
    return voicing(ch, usable, 55);
  };
  const midisFor = (i: number): number[] => {
    if (t.instrument === 'piano') return pianoVoicing(i).map(midi);
    if (t.instrument === 'guitar') {
      const f = fingeringsFor(chords[i]);
      return f.length ? fingeringMidis(f[i === sel ? Math.min(gIdx, f.length - 1) : 0]) : chordPitches(chords[i], 3).map(midi);
    }
    return chordPitches(chords[i], 3).map(midi);
  };
  const playAll = () => {
    if (playing) { stopSequence(); setPlaying(false); return; }
    setPlaying(true);
    const voice = t.instrument === 'sax' ? 'piano' : voiceFor(t.instrument);
    playSequence(voice, chords.map((_, i) => ({ midi: midisFor(i), start: i * 2, dur: 1.9 })), 80, { onNote: setSel, onEnd: () => setPlaying(false) });
  };
  // saxo: arpegio escrito del acorde seleccionado
  const tonic = tonicPitch(c.root, t.instrument, t.sax);
  const arp = chordPitches(c, tonic.octave);
  const arpSeq = [...arp, ...arp.slice(0, -1).reverse()];

  return (
    <div className="chords-view">
      <div className="chip-row">
        {chords.map((ch, i) => (
          <button key={i} className={`chip big ${i === sel ? 'on' : ''}`} onClick={() => { setSel(i); setGIdx(0); playMidi(t.instrument === 'sax' ? 'piano' : t.instrument, midisFor(i), 1.4); }}>
            {t.chordName(ch)}
          </button>
        ))}
        <button className="btn primary" onClick={playAll}>{playing ? '■ Parar' : '▶ Tocar secuencia'}</button>
      </div>
      <div className="muted small">
        {c.quality.name}: {c.quality.degrees.join('-')} → {chordNotes(c).map((n) => t.noteName(n)).join(' ')} {t.isSax && '(escrito)'}
      </div>
      {t.instrument === 'piano' && (
        <>
          <Segmented size="sm" value={vt} onChange={setVt} options={[...(vl ? [{ value: 'lead' as const, label: 'Conducción mínima' }] : []), ...vtypes.map((v) => ({ value: v, label: VOICING_LABELS[v] }))]} />
          <InstrumentView notes={chordViewNotes(c)} sequence={pianoVoicing(sel)} exactKeys />
          {vt === 'lead' && <VoiceLeadText chords={chords} led={led.map((v) => v.map(midi))} />}
        </>
      )}
      {t.instrument === 'guitar' && (
        <>
          <div className="diagrams">
            {fingerings.length === 0 && <p className="muted">No hay digitación movible registrada para esta calidad; usa el diapasón.</p>}
            {fingerings.map((f, i) => (
              <div key={i} className={i === gIdx ? 'diag-sel' : ''}>
                <ChordDiagram chord={c} f={f} onPlay={() => { setGIdx(i); playMidi('guitar', fingeringMidis(f), 1.5); }} />
              </div>
            ))}
          </div>
          <InstrumentView notes={chordViewNotes(c)} />
        </>
      )}
      {t.instrument === 'sax' && (
        <>
          <p className="muted small">Arpegio escrito para tu saxo. Pulsa una nota para escucharla (suena en concierto).</p>
          <InstrumentView notes={chordViewNotes(c)} sequence={arpSeq} />
          <button className="btn" onClick={() => playSequence('sax', arpSeq.map((p, i) => ({ midi: midi(p), start: i * 0.5, dur: 0.5 })), 100, { swing: true })}>▶ Arpegio en swing</button>
        </>
      )}
    </div>
  );
}

function VoiceLeadText({ chords, led }: { chords: Chord[]; led: number[][] }) {
  const t = useTransposer();
  return (
    <ul className="small">
      {chords.slice(1).map((c, i) => {
        const a = [...led[i]].sort((x, y) => x - y);
        const b = [...led[i + 1]].sort((x, y) => x - y);
        const common = a.filter((m) => b.includes(m)).length;
        const moves = a.map((m, k) => Math.abs(m - b[k])).reduce((s, x) => s + x, 0);
        return <li key={i}>{t.chordName(chords[i])} → {t.chordName(c)}: {common} nota(s) común(es); movimiento total {moves} semitonos.</li>;
      })}
    </ul>
  );
}

export const pcsOf = (c: Chord) => chordNotes(c).map(pc);

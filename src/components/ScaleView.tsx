import { useEffect, useState } from 'react';
import { playSequence, stopSequence } from '../audio/engine';
import { chordPitches, chordSymbol, parseChord, qualityById } from '../theory/chords';
import { midi, noteName, parseNote } from '../theory/notes';
import { formulaSteps, parentMajor, scaleById, scaleNotes, scalePitches, MODE_ORDER } from '../theory/scales';
import { InstrumentView, ViewNote } from './InstrumentView';
import { Segmented, tonicPitch, useNames, useTransposer, voiceFor } from './common';

export function ScaleView({ scaleId, keyName, arpeggio, compact }: { scaleId: string; keyName: string; arpeggio?: string; compact?: boolean }) {
  const t = useTransposer();
  const names = useNames();
  const s = scaleById(scaleId);
  const root = parseNote(keyName);
  const notes = scaleNotes(root, s);
  const [bpm, setBpm] = useState(90);
  const [active, setActive] = useState<number | null>(null);
  const [mode, setMode] = useState<'degree' | 'name'>('degree');
  const [playing, setPlaying] = useState<'scale' | 'arp' | null>(null);
  useEffect(() => () => stopSequence(), []);

  const tonic = tonicPitch(root, t.instrument, t.sax);
  const up = scalePitches(tonic, s);
  const seq = [...up, ...up.slice(0, -1).reverse()];
  const view: ViewNote[] = notes.map((n, i) => ({ note: n, degree: s.degrees[i], role: i === 0 ? 'root' : s.characteristic?.includes(s.degrees[i]) ? 'char' : 'scale' }));

  const arpChord = arpeggio ? parseChord(arpeggio) : s.chords[0] ? { root, quality: qualityById(s.chords[0]) } : null;
  const play = (which: 'scale' | 'arp') => {
    if (playing) { stopSequence(); setPlaying(null); setActive(null); return; }
    let ms: number[];
    if (which === 'arp' && arpChord) {
      const ps = chordPitches(arpChord, tonic.octave).map(midi);
      ms = [...ps, ps[0] + 12, ...[...ps].reverse()];
    } else ms = seq.map(midi);
    setPlaying(which);
    playSequence(voiceFor(t.instrument), ms.map((m, i) => ({ midi: m, start: i * 0.5, dur: 0.5 })), bpm, {
      swing: false,
      onNote: (i) => setActive(which === 'scale' ? i : null),
      onEnd: () => { setPlaying(null); setActive(null); },
    });
  };
  const isMode = MODE_ORDER.includes(s.id);
  return (
    <div className="scale-view">
      <div className="row wrap gap">
        <div>
          <div className="big-title">{names(root)} {s.name}</div>
          {t.isSax && <div className="muted">Escrito para tu saxo: <b>{t.noteName(root)} {s.name}</b> · concierto {names(root)}</div>}
        </div>
        <div className="row gap wrap right">
          <button className="btn primary" onClick={() => play('scale')}>{playing === 'scale' ? '■ Parar' : '▶ Escala'}</button>
          {arpChord && <button className="btn" onClick={() => play('arp')}>{playing === 'arp' ? '■ Parar' : `▶ Arpegio ${t.chordName(arpChord)}`}</button>}
          <label className="tempo">♩= {bpm}<input type="range" min={40} max={200} value={bpm} onChange={(e) => setBpm(+e.target.value)} /></label>
        </div>
      </div>
      <div className="formula">
        <span className="pill">Fórmula: {s.degrees.join(' ')}</span>
        <span className="pill">Pasos: {formulaSteps(s)}</span>
        <span className="pill">Notas ({t.isSax ? 'escritas' : 'concierto'}): {notes.map((n) => t.noteName(n)).join(' ')}</span>
        {s.characteristic && <span className="pill char">Nota(s) característica(s): {s.characteristic.join(', ')}</span>}
      </div>
      <div className="row between wrap">
        <Segmented size="sm" value={mode} onChange={setMode} options={[{ value: 'degree', label: 'Grados' }, { value: 'name', label: 'Nombres' }]} />
        <span className="legend"><i className="lg root" />tónica <i className="lg char" />característica <i className="lg scale" />escala</span>
      </div>
      <InstrumentView notes={view} sequence={seq} labelMode={mode} active={active} />
      {!compact && (
        <div className="grid2">
          <div>
            <h4>¿Qué es y para qué sirve?</h4>
            <p>{s.summary}</p>
            {isMode && <p className="muted">Pertenece a la tonalidad de <b>{names(parentMajor(root, s.id))} mayor</b> (misma colección de notas, otro centro).</p>}
            {s.avoidWhen && <p className="warn">⚠ {s.avoidWhen}</p>}
          </div>
          <div>
            <h4>Acordes relacionados y contextos</h4>
            <p>{s.chords.map((q) => t.chordName({ root, quality: qualityById(q) })).join(' · ')}</p>
            <ul>{s.uses.map((u) => <li key={u}>{u}</li>)}</ul>
          </div>
        </div>
      )}
    </div>
  );
}

export const chordLabel = (sym: string) => chordSymbol(parseChord(sym));
export { noteName };

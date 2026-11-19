import { useState, useSyncExternalStore } from 'react';
import { getSoundStatus, listMidiOutputs, sampleLicenses, setMidiOutput, subscribeSound, ensureAudio, triggerNotes } from '../audio/engine';
import { useAppState } from '../progress/store';
import { Card } from './common';
import { MixPanel } from './Mixer';

export function useSound() {
  return useSyncExternalStore(subscribeSound, getSoundStatus, getSoundStatus);
}

export function SoundBadge() {
  const st = useSound();
  if (st.state === 'ready') return <span className="sound-badge ok" title="Instrumentos sampleados cargados">♪ Sonido real</span>;
  if (st.state === 'error') return <span className="sound-badge err" title={st.error}>♪ Sonido sintético</span>;
  return <span className="sound-badge">♪ Cargando sonidos {st.loaded}/{st.total || 8}</span>;
}

export function SoundSettings() {
  const s = useAppState();
  const st = useSound();
  const [outs, setOuts] = useState<{ id: string; name: string }[] | null>(null);
  const [midiErr, setMidiErr] = useState('');
  const [midiSel, setMidiSel] = useState('');
  const [only, setOnly] = useState(false);
  const scan = async () => {
    setMidiErr('');
    try { setOuts(await listMidiOutputs()); } catch (e) { setMidiErr((e as Error).message || 'No se pudo acceder a MIDI (permiso denegado o no disponible en esta vista).'); }
  };
  return (
    <Card title="Sonido">
      <p className="small">Estado: {st.state === 'ready' ? '✔ instrumentos sampleados cargados' : st.state === 'error' ? `no se pudieron cargar las muestras (${st.error}); se usa síntesis` : `cargando muestras ${st.loaded}/${st.total || 8}…`}</p>
      <button className="btn" onClick={async () => { await ensureAudio(); triggerNotes(s.instrument === 'sax' ? 'sax' : s.instrument, [60, 64, 67, 71], 1.5, undefined, 0.8); }}>🔊 Probar sonido</button>
      <h4>Mezclador (qué instrumentos suenan)</h4>
      <MixPanel />
      <details>
        <summary>Avanzado: usar tus propios plugins (salida MIDI)</summary>
        <p className="small">Si tienes un sintetizador o plugin (Pianoteq, Kontakt, un DAW…), la app puede enviarle las notas por MIDI: melodía en el canal 1, acompañante en el 2, bajo en el 3 y batería en el 10. En Mac usa el «Bus IAC»; en Windows, loopMIDI. Requiere Chrome o Edge y funciona mejor con la app instalada desde su propia dirección (dentro de claude.ai el navegador puede bloquear MIDI).</p>
        <div className="row gap wrap">
          <button className="btn" onClick={scan}>Buscar salidas MIDI</button>
          {outs && (
            <select value={midiSel} onChange={async (e) => { setMidiSel(e.target.value); await setMidiOutput(e.target.value || null, only); }}>
              <option value="">— Sin MIDI —</option>
              {outs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
          {outs && <label className="toggle"><input type="checkbox" checked={only} onChange={async (e) => { setOnly(e.target.checked); await setMidiOutput(midiSel || null, e.target.checked); }} />Solo MIDI (silenciar el sonido interno)</label>}
        </div>
        {outs && outs.length === 0 && <p className="small muted">No se encontraron salidas MIDI.</p>}
        {midiErr && <p className="warn small">{midiErr}</p>}
      </details>
      <details>
        <summary>Créditos y licencias de los sonidos</summary>
        <ul className="small">
          {Object.entries(sampleLicenses()).map(([k, v]) => <li key={k}><b>{k}</b>: {v}</li>)}
          <li>Muestras renderizadas para esta app a partir de esos bancos (piano: Salamander Grand Piano V3 de Alexander Holm, CC-BY 3.0; saxos, contrabajo, guitarra jazz, Rhodes y baterías de jazz/escobillas: MuseScore General de S. Christian Collins, MIT).</li>
        </ul>
      </details>
    </Card>
  );
}

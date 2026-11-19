// Alternativa al micrófono en vivo: grabar con otra app (o la grabadora del teléfono) y subir el audio.
// La app lo analiza en el dispositivo con el mismo método de detección de notas.
import { useState } from 'react';
import { notesFromAudioFile, compareSequences } from '../recording/pitch';
import { chordScores, frameAnalysis, toMono, PC_NAMES } from '../audio/analysis';
import { Tone, ensureAudio } from '../audio/engine';

type Mode = { kind: 'note'; target: number } | { kind: 'seq'; targets: number[] } | { kind: 'chord'; root: number; quality: string; symbol: string };

export function UploadCheck({ mode, display, onResult }: { mode: Mode; display: (m: number) => string; onResult: (ok: boolean, detail: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const run = async (f: File) => {
    setBusy(true); setErr('');
    try {
      await ensureAudio();
      const ctx = Tone.getContext().rawContext as BaseAudioContext;
      if (mode.kind === 'chord') {
        const buf = await ctx.decodeAudioData(await f.arrayBuffer());
        const mono = toMono(Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i)), buf.sampleRate, 11025);
        const fr = frameAnalysis(mono, 11025);
        const sum = fr.chroma.reduce((a, c) => a.map((x, i) => x + c[i]), new Array(12).fill(0));
        const bs = fr.bass.reduce((a, c) => a.map((x, i) => x + c[i]), new Array(12).fill(0));
        const top = chordScores(sum, bs).slice(0, 2);
        const ok = top.some((g) => g.root === mode.root && g.quality === mode.quality);
        onResult(ok, `En la grabación se oye ${PC_NAMES[top[0].root]}${top[0].quality === 'maj' ? '' : top[0].quality} (estimación).`);
      } else {
        const notes = await notesFromAudioFile(f, ctx);
        if (!notes.length) { setErr('No se detectaron notas claras. Graba más cerca del instrumento y sin acompañamiento.'); setBusy(false); return; }
        const ms = notes.map((n) => n.midi);
        if (mode.kind === 'note') {
          const hit = ms.find((m) => (((m - mode.target) % 12) + 12) % 12 === 0);
          onResult(hit !== undefined, hit !== undefined ? `En tu grabación aparece ${display(hit)}.` : `Se detectó ${ms.slice(0, 4).map(display).join(', ')}; se esperaba ${display(mode.target)}.`);
        } else {
          const r = compareSequences(mode.targets, ms);
          onResult(r.correct / mode.targets.length >= 0.8, `${r.correct} de ${mode.targets.length} notas en orden en tu grabación (oído: ${ms.slice(0, 12).map(display).join(' · ')}).`);
        }
      }
    } catch { setErr('No se pudo leer ese audio. Prueba con otro formato (m4a, mp3, wav).'); }
    setBusy(false);
  };
  return (
    <div className="upload-check">
      <label className="btn">{busy ? 'Analizando…' : '📤 Subir grabación'}
        <input type="file" accept="audio/*" capture="user" hidden disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) run(f); e.target.value = ''; }} />
      </label>
      <span className="muted small">Graba con la grabadora del teléfono o del computador (en el teléfono el botón puede abrirla directamente) y súbela: la app la analiza aquí mismo.</span>
      {err && <p className="warn small">{err}</p>}
    </div>
  );
}

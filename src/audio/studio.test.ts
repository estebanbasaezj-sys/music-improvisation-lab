import { describe, expect, it, vi } from 'vitest';
vi.mock('./engine', () => ({ Tone: {} }));
import { SoundTouch, Stretch } from '@soundtouchjs/core';
import { removeHarmonics, runPipe, secToBeat, skyline } from './studio';
import { detectPitch } from '../recording/pitch';

const SR = 44100;
function sine(f: number, sec: number) {
  const n = Math.floor(SR * sec);
  const inter = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { const v = 0.4 * Math.sin((2 * Math.PI * f * i) / SR); inter[2 * i] = v; inter[2 * i + 1] = v; }
  return { inter, n };
}
const left = (inter: Float32Array, from: number, len: number) => { const o = new Float32Array(len); for (let i = 0; i < len; i++) o[i] = inter[2 * (from + i)]; return o; };

describe('estudio', () => {
  it('cambio de tono sin cambiar duración', async () => {
    const { inter, n } = sine(440, 2);
    const st = new SoundTouch({ sampleRate: SR });
    st.pitchSemitones = 2;
    const out = await runPipe(st as never, inter, n);
    expect(out.length / 2).toBeGreaterThanOrEqual(n * 0.98); // incluye el relleno final
    const f = detectPitch(left(out, 20000, 4096), SR)!.freq;
    expect(Math.abs(f - 440 * 2 ** (2 / 12))).toBeLessThan(5);
  });
  it('velocidad 50% sin cambiar tono', async () => {
    const { inter, n } = sine(330, 2);
    const sp = new Stretch({ sampleRate: SR, createBuffers: true });
    sp.tempo = 0.5;
    const out = await runPipe(sp as never, inter, n);
    expect(out.length / 2 / n).toBeGreaterThan(1.8);
    const f = detectPitch(left(out, 40000, 4096), SR)!.freq;
    expect(Math.abs(f - 330)).toBeLessThan(4);
  });
  it('utilidades', () => {
    expect(secToBeat(1.5, [0, 0.5, 1, 1.5, 2])).toBeCloseTo(3);
    const sk = skyline([{ midi: 60, start: 0, dur: 1, amp: 0.5 }, { midi: 72, start: 0, dur: 1, amp: 0.6 }, { midi: 74, start: 1, dur: 0.5, amp: 0.6 }]);
    expect(sk.map((n) => n.midi)).toEqual([72, 74]);
    // un armónico (dos octavas arriba) no es la melodía
    const h = removeHarmonics([{ midi: 74, start: 0, dur: 0.5, amp: 0.8 }, { midi: 98, start: 0.03, dur: 0.3, amp: 0.5 }, { midi: 77, start: 0.5, dur: 0.5, amp: 0.8 }]);
    expect(h.map((n) => n.midi)).toEqual([74, 77]);
  });
});

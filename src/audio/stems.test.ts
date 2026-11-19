import { describe, expect, it } from 'vitest';
import { leadGain, midSide, rms, spectralGain, toWav } from './stems';

// AudioBuffer mínimo para Node
class FakeBuf {
  data: Float32Array[];
  constructor(public numberOfChannels: number, public length: number, public sampleRate: number) { this.data = Array.from({ length: numberOfChannels }, () => new Float32Array(length)); }
  getChannelData(c: number) { return this.data[c]; }
  get duration() { return this.length / this.sampleRate; }
}
const ctx = { createBuffer: (c: number, n: number, sr: number) => new FakeBuf(c, n, sr) } as unknown as BaseAudioContext;
const SR = 22050;
const tone = (f: number, secs: number, amp = 0.5) => { const b = new FakeBuf(2, Math.floor(secs * SR), SR); for (let c = 0; c < 2; c++) for (let i = 0; i < b.length; i++) b.data[c][i] = amp * Math.sin((2 * Math.PI * f * i) / SR); return b; };
const mix = (a: FakeBuf, b: FakeBuf) => { const o = new FakeBuf(2, a.length, SR); for (let c = 0; c < 2; c++) for (let i = 0; i < a.length; i++) o.data[c][i] = a.data[c][i] + b.data[c][i]; return o; };
const level = (b: FakeBuf, f: number) => { // amplitud de la componente f (correlación)
  let s = 0, cc = 0; const d = b.data[0]; for (let i = 2000; i < d.length - 2000; i++) { s += d[i] * Math.sin((2 * Math.PI * f * i) / SR); cc += d[i] * Math.cos((2 * Math.PI * f * i) / SR); }
  return (2 * Math.hypot(s, cc)) / (d.length - 4000);
};

describe('pistas sin IA', () => {
  it('la STFT con ganancia 1 reconstruye la señal', async () => {
    const x = tone(440, 1);
    const y = await spectralGain(x as unknown as AudioBuffer, ctx, () => () => 1);
    let err = 0; for (let i = 3000; i < x.length - 3000; i++) err = Math.max(err, Math.abs(y.getChannelData(0)[i] - x.data[0][i]));
    expect(err).toBeLessThan(1e-3);
  });
  it('el realce de la melodía conserva la nota detectada y atenúa otra que suena a la vez', async () => {
    const melody = tone(440, 1.2); // La4 (MIDI 69)
    const accomp = tone(311.13, 1.2); // Mi♭4: no es armónico de La
    const y = await spectralGain(mix(melody, accomp) as unknown as AudioBuffer, ctx, leadGain([{ midi: 69, start: 0, dur: 1.2 }])) as unknown as FakeBuf;
    expect(level(y, 440)).toBeGreaterThan(0.4);
    expect(level(y, 311.13)).toBeLessThan(0.1);
  });
  it('centro/lados separa lo que está en el medio de lo que está a los lados', () => {
    const b = new FakeBuf(2, 1000, SR);
    for (let i = 0; i < 1000; i++) { b.data[0][i] = 0.5; b.data[1][i] = 0.5; }
    const { center, sides } = midSide(b as unknown as AudioBuffer, ctx);
    expect(rms(center)).toBeGreaterThan(0.4);
    expect(rms(sides)).toBeLessThan(1e-6);
  });
  it('exporta WAV de 16 bits', () => {
    expect(toWav(tone(440, 0.1) as unknown as AudioBuffer).size).toBe(44 + Math.floor(0.1 * SR) * 4);
  });
});

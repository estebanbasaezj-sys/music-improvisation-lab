import { describe, expect, it, vi } from 'vitest';
vi.mock('../audio/engine', () => ({ Tone: {} }));
import { ClapDetector, ClapEvent } from './onsets';

const SR = 44100;
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1; })();

/** Señal de prueba: ruido de sala, clics del metrónomo captados por el micrófono (altavoces) y palmas. */
function render(clicks: number[], claps: number[], dur: number, clickAmp = 0.12, clapAmp = 0.6) {
  const x = new Float32Array(Math.ceil(dur * SR));
  for (let i = 0; i < x.length; i++) x[i] = rnd() * 0.002;
  for (const t of clicks) for (let i = 0; i < 0.05 * SR; i++) { const k = Math.floor(t * SR) + i; if (k < x.length) x[k] += Math.sin(2 * Math.PI * 1320 * i / SR) * Math.exp(-i / SR * 85) * clickAmp; }
  for (const t of claps) for (let i = 0; i < 0.04 * SR; i++) { const k = Math.floor(t * SR) + i; if (k < x.length) x[k] += rnd() * Math.exp(-i / SR * 120) * clapAmp; }
  return x;
}

function run(x: Float32Array, setup?: (d: ClapDetector) => void) {
  const got: ClapEvent[] = [];
  const d = new ClapDetector((e) => got.push(e), 0);
  setup?.(d);
  for (let i = 0; i + 512 <= x.length; i += 512) d.process(x.subarray(i, i + 512), (i + 512) / SR, SR);
  return got.map((e) => e.time);
}

describe('detector de palmas', () => {
  it('detecta cada palmada con precisión de pocos milisegundos', () => {
    const claps = [1, 1.5, 2.25, 3];
    const got = run(render([], claps, 4));
    expect(got.length).toBe(claps.length);
    got.forEach((t, i) => expect(Math.abs(t - claps[i])).toBeLessThan(0.006));
  });
  it('con altavoces: ignora los clics del metrónomo (calibrados en la cuenta) aunque coincidan con una palmada', () => {
    const spb = 0.75;
    const count = [0.5, 1.25, 2, 2.75];
    const pulse = [3.5, 4.25, 5, 5.75];
    const claps = [3.5, 4.25, 5]; // negra, negra, blanca: la primera y la segunda caen justo sobre el clic
    const x = render([...count, ...pulse], claps, 6.6);
    const got = run(x, (d) => d.setClicks(count, pulse, 0));
    expect(got.length).toBe(3);
    got.forEach((t, i) => expect(Math.abs(t - claps[i])).toBeLessThan(0.006));
    expect(spb).toBeGreaterThan(0);
  });
  it('sin calibración los mismos clics sí se confundirían con palmas (por eso se calibra)', () => {
    const pulse = [3.5, 4.25, 5, 5.75];
    const got = run(render(pulse, [], 6.6));
    expect(got.length).toBeGreaterThan(0);
  });
});

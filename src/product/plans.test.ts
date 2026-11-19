import { describe, expect, it } from 'vitest';
import { CLAUDE_PRICES, access, cloudCostPerUser } from './plans';
import { initialState, monthKey } from '../progress/store';

describe('planes y costos', () => {
  it('costo del Profesor IA por usuario coincide con el ejemplo del plan de producto', () => {
    const c = (id: string) => { const p = CLAUDE_PRICES.find((x) => x.id === id)!; return cloudCostPerUser({ priceIn: p.input, priceOut: p.output, callsPerUser: 40, tokensIn: 2500, tokensOut: 600, cachedShare: 0.5 }); };
    expect(c('claude-haiku-5-5')).toBeCloseTo(0.0175, 4);
    expect(c('claude-sonnet-5-5')).toBeCloseTo(0.35, 4);
    expect(c('claude-opus-5-5')).toBeCloseTo(0.7, 4);
  });
  it('el plan gratuito cuenta los usos del mes y bloquea al agotarlos; Pro no tiene límites', () => {
    const s = initialState();
    s.settings.plan = 'free';
    expect(access(s, 'separacion-ia')).toEqual({ ok: true, left: 3 });
    s.usage[monthKey()] = { 'separacion-ia': 3 };
    expect(access(s, 'separacion-ia').ok).toBe(false);
    expect(access(s, 'profesor-ia').ok).toBe(false);
    expect(access(s, 'camino').ok).toBe(true);
    expect(access(s, 'proyectos', { projects: 3 }).ok).toBe(false);
    s.settings.plan = 'pro';
    expect(access(s, 'separacion-ia').ok).toBe(true);
  });
});

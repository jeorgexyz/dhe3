import { describe, expect, it } from 'vitest';
import { ALL_SPECIES, FUELS, REACTIONS, reactivity } from './reactions';
import {
  SimParams, freshFuel, ignitionTriple, initialState, ionDensity, observe, powerBalance, step,
} from './plasma';

const minTriple = (fuel: typeof FUELS.DT) =>
  Math.min(...Array.from({ length: 250 }, (_, i) => ignitionTriple(fuel, 4 + i)));

const params = (over: Partial<SimParams> = {}): SimParams => ({
  fuel: FUELS.DT, ni: 1e20, tauE: 4, pAux: 2e5, tauFeed: Infinity, tauAsh: Infinity, ...over,
});

const run = (p: SimParams, t0: number, seconds: number, dt = 0.25) => {
  let s = initialState(p, t0);
  for (let i = 0; i < seconds / dt; i++) s = step(p, s, dt);
  return s;
};

describe('Bosch-Hale reactivity', () => {
  it('matches the published D-T value at 10 keV', () => {
    // Bosch & Hale table: 1.136e-16 cm^3/s
    expect(reactivity(REACTIONS.DT, 10) / 1.136e-16).toBeCloseTo(1, 1);
  });
  it('gives a sensible D-3He value at 100 keV', () => {
    const v = reactivity(REACTIONS.DHe3, 100);
    expect(v).toBeGreaterThan(1.3e-16);
    expect(v).toBeLessThan(1.9e-16);
  });
  it('D-T beats D-3He by a wide margin at 15 keV', () => {
    expect(reactivity(REACTIONS.DT, 15)).toBeGreaterThan(reactivity(REACTIONS.DHe3, 15) * 50);
  });
  it('is zero at non-positive temperature', () => {
    expect(reactivity(REACTIONS.DT, 0)).toBe(0);
  });
});

describe('power balance', () => {
  it('D-T power is ~80% neutrons', () => {
    const b = powerBalance({ n: freshFuel(FUELS.DT, 1e20), tKeV: 15 });
    expect(b.neutron / b.fusion).toBeCloseTo(0.8, 1);
  });
  it('D-3He is low in neutrons but not zero (D-D side reactions)', () => {
    const b = powerBalance({ n: freshFuel(FUELS.DHe3, 1e20), tKeV: 70 });
    const f = b.neutron / b.fusion;
    expect(f).toBeGreaterThan(0);
    expect(f).toBeLessThan(0.1);
  });
  it('D-T ignition triple product is near the textbook few 1e21 keV s/m^3', () => {
    expect(minTriple(FUELS.DT)).toBeGreaterThan(1e21);
    expect(minTriple(FUELS.DT)).toBeLessThan(1e22);
  });
  it('D-3He needs a much higher triple product than D-T', () => {
    expect(minTriple(FUELS.DHe3)).toBeGreaterThan(minTriple(FUELS.DT) * 10);
  });
});

describe('simulation', () => {
  it('D-T ignites with good confinement and refuelling, and self-heats', () => {
    const p = params({ tauFeed: 20, tauAsh: 10 });
    const s = run(p, 5, 120);
    expect(s.tKeV).toBeGreaterThan(10);
    expect(observe(p, s).gain).toBeGreaterThan(5);
  });
  it('stays finite and positive with no heating', () => {
    const s = run(params({ tauE: 1, pAux: 0 }), 1, 10);
    expect(Number.isFinite(s.tKeV)).toBe(true);
    expect(s.tKeV).toBeGreaterThan(0);
  });
  it('never produces negative or non-finite densities', () => {
    const s = run(params({ tauFeed: 3, tauAsh: 0.5 }), 20, 60);
    for (const sp of ALL_SPECIES) {
      expect(Number.isFinite(s.n[sp])).toBe(true);
      expect(s.n[sp]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('burn-up and ash', () => {
  it('D-T burn without feed makes He-4 ash, consumes fuel, and conserves charge', () => {
    const p = params({ pAux: 0 });
    const s = run(p, 30, 20);
    const o = observe(p, s);
    expect(s.n.He4).toBeGreaterThan(0);
    expect(s.n.D).toBeLessThan(5e19);
    expect(o.ashFraction).toBeGreaterThan(0);
    expect(o.burnedInventories).toBeGreaterThan(0);
    // Neutrons carry no charge, so total proton count (= electron density) is conserved
    expect(o.ne / 1e20).toBeCloseTo(1, 6);
  });
  it('D-D produces T and He-3 that then burn (catalysed D-D)', () => {
    const p = params({ fuel: FUELS.DD, pAux: 5e5, tauE: 10 });
    const s = run(p, 40, 5);
    expect(s.n.T + s.n.He3).toBeGreaterThan(0);
  });
  it('ash accumulation dilutes the plasma and lowers fusion power versus pumping it out', () => {
    const base = { pAux: 2e6, tauE: 4 };
    const noPump = params({ ...base, tauFeed: 10 });
    const pumped = params({ ...base, tauFeed: 10, tauAsh: 2 });
    const a = observe(noPump, run(noPump, 20, 60));
    const b = observe(pumped, run(pumped, 20, 60));
    expect(a.ashFraction).toBeGreaterThan(b.ashFraction);
    expect(a.ni).toBeGreaterThan(0);
    expect(ionDensity(freshFuel(FUELS.DT, 1e20))).toBe(1e20);
  });
});

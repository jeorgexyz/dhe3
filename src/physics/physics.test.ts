import { describe, expect, it } from 'vitest';
import { FUELS, REACTIONS, reactivity } from './reactions';
import { ignitionTriple, observe, powerBalance, step } from './plasma';

const minTriple = (fuel: typeof FUELS.DT) =>
  Math.min(...Array.from({ length: 250 }, (_, i) => ignitionTriple(fuel, 4 + i)));

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
    const b = powerBalance({ fuel: FUELS.DT, ni: 1e20, tKeV: 15 });
    expect(b.neutron / b.fusion).toBeCloseTo(0.8, 1);
  });
  it('D-3He is low in neutrons but not zero (D-D side reactions)', () => {
    const b = powerBalance({ fuel: FUELS.DHe3, ni: 1e20, tKeV: 70 });
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
  it('D-T ignites with good confinement and self-heats', () => {
    const p = { fuel: FUELS.DT, ni: 1e20, tauE: 4, pAux: 2e5 };
    let s = { time: 0, tKeV: 1 };
    for (let i = 0; i < 4000; i++) s = step(p, s, 0.05);
    expect(s.tKeV).toBeGreaterThan(10);
    expect(observe(p, s).gain).toBeGreaterThan(5);
  });
  it('stays finite and positive with no heating', () => {
    const p = { fuel: FUELS.DT, ni: 1e20, tauE: 1, pAux: 0 };
    let s = { time: 0, tKeV: 1 };
    for (let i = 0; i < 200; i++) s = step(p, s, 0.05);
    expect(Number.isFinite(s.tKeV)).toBe(true);
    expect(s.tKeV).toBeGreaterThan(0);
  });
});

/**
 * Zero-dimensional plasma power balance (SI units, ions and electrons at the same T)
 * with fuel burn-up and fusion-ash accumulation.
 *
 * Species densities evolve: fusion consumes fuel and creates ash (He-4, protons) and
 * D-D products (T, He-3) that burn in turn. Fuel species in the starting mix are fed
 * back toward their initial density with time constant tauFeed; every other species
 * (ash and bred secondaries) is removed with time constant tauAsh. Infinity disables
 * either. Energy is conserved through particle changes, so cold feed cools the plasma.
 *
 * Still ignored: spatial profiles, impurities, synchrotron radiation, non-thermal
 * (slowing-down) ions, and the energy carried by lost or injected particles.
 */
import {
  ALL_REACTIONS, ALL_SPECIES, ASH, CHARGE, Fuel, Reaction, reactivity, Species,
} from './reactions';

const KEV_J = 1.602176634e-16;
const MEV_J = 1.602176634e-13;
/** Bremsstrahlung: P = C * ne * sum(Zi^2 ni) * sqrt(T_keV), W/m^3 (NRL formulary) */
const BREM_C = 5.35e-37;

export type Densities = Record<Species, number>;

export interface PlasmaState {
  n: Densities;
  /** Temperature, keV */
  tKeV: number;
}

export interface PowerBalance {
  ne: number;
  ni: number;
  /** Fusion power density, W/m^3 */
  fusion: number;
  /** Part of fusion power in charged products, W/m^3 */
  charged: number;
  /** Part carried off by neutrons, W/m^3 */
  neutron: number;
  brems: number;
  /** Thermal energy density, J/m^3 */
  stored: number;
  /** Reaction events per m^3 per s, by reaction id */
  rates: Record<string, number>;
}

const zeroDensities = (): Densities => ({ D: 0, T: 0, He3: 0, He4: 0, H: 0 });

/** Densities of a fresh fuel load with total ion density ni. */
export function freshFuel(fuel: Fuel, ni: number): Densities {
  const n = zeroDensities();
  for (const s of ALL_SPECIES) n[s] = ni * (fuel.mix[s] ?? 0);
  return n;
}

const sum = (n: Densities, f: (s: Species) => number) =>
  ALL_SPECIES.reduce((acc, s) => acc + n[s] * f(s), 0);

export const ionDensity = (n: Densities) => sum(n, () => 1);
export const electronDensity = (n: Densities) => sum(n, (s) => CHARGE[s]);

function rate(r: Reaction, n: Densities, tKeV: number): number {
  const sv = reactivity(r, tKeV) * 1e-6; // cm^3/s -> m^3/s
  return (r.a === r.b ? 0.5 : 1) * n[r.a] * n[r.b] * sv;
}

export function powerBalance({ n, tKeV }: PlasmaState): PowerBalance {
  const ne = electronDensity(n);
  const ni = ionDensity(n);
  let fusion = 0;
  let charged = 0;
  const rates: Record<string, number> = {};
  for (const r of ALL_REACTIONS) {
    const k = rate(r, n, tKeV);
    rates[r.id] = k;
    fusion += k * r.energyMeV * MEV_J;
    charged += k * r.chargedMeV * MEV_J;
  }
  const z2n = sum(n, (s) => CHARGE[s] ** 2);
  const brems = BREM_C * ne * z2n * Math.sqrt(Math.max(tKeV, 0));
  const stored = 1.5 * (ne + ni) * tKeV * KEV_J;
  return { ne, ni, fusion, charged, neutron: fusion - charged, brems, stored, rates };
}

/**
 * Minimum triple product n*T*tau_E (keV s / m^3) for self-heating ignition of a FRESH
 * fuel load at tKeV (no ash, no secondary burn): charged-product heating = bremsstrahlung
 * + transport loss. Infinity if bremsstrahlung alone exceeds the heating.
 */
export function ignitionTriple(fuel: Fuel, tKeV: number): number {
  const ni = 1e20; // result is density independent (all powers scale as n^2)
  const p = powerBalance({ n: freshFuel(fuel, ni), tKeV });
  const net = p.charged - p.brems;
  if (net <= 0) return Infinity;
  return ni * tKeV * (p.stored / net);
}

export interface SimParams {
  fuel: Fuel;
  /** Initial total ion density, m^-3 */
  ni: number;
  /** Energy confinement time, s */
  tauE: number;
  /** External heating power density, W/m^3 */
  pAux: number;
  /** Fuel feed relaxation time, s (Infinity = no refuelling) */
  tauFeed: number;
  /** Removal time for ash and secondary products, s (Infinity = no pumping) */
  tauAsh: number;
}

export interface SimState extends PlasmaState {
  time: number;
  /** Cumulative fuel ions consumed per m^3 */
  consumed: number;
}

export function initialState(p: SimParams, tKeV: number): SimState {
  return { time: 0, tKeV, n: freshFuel(p.fuel, p.ni), consumed: 0 };
}

export interface SimOutput extends PowerBalance {
  loss: number;
  /** Q = fusion / auxiliary; Infinity when pAux = 0 and the plasma is burning */
  gain: number;
  /** Neutron share of fusion power, 0..1 */
  neutronFraction: number;
  /** Ash ions as a fraction of all ions, 0..1 */
  ashFraction: number;
  /** Fuel consumed so far, in units of the initial ion inventory */
  burnedInventories: number;
}

export function observe(p: SimParams, s: SimState): SimOutput {
  const b = powerBalance(s);
  const ash = ASH.reduce((acc, sp) => acc + s.n[sp], 0);
  return {
    ...b,
    loss: b.stored / p.tauE,
    gain: p.pAux > 0 ? b.fusion / p.pAux : b.fusion > 0 ? Infinity : 0,
    neutronFraction: b.fusion > 0 ? b.neutron / b.fusion : 0,
    ashFraction: b.ni > 0 ? ash / b.ni : 0,
    burnedInventories: s.consumed / p.ni,
  };
}

/** Upper limit of the Bosch-Hale fits; the simulation does not extrapolate beyond it. */
export const T_MAX_KEV = 100;
const T_MIN_KEV = 0.01;
const SUBSTEPS = 20;

/** Advance by dt seconds (sub-stepped explicit Euler). */
export function step(p: SimParams, s: SimState, dt: number): SimState {
  const h = dt / SUBSTEPS;
  const n0 = freshFuel(p.fuel, p.ni);
  let n = { ...s.n };
  let t = s.tKeV;
  let consumed = s.consumed;
  for (let i = 0; i < SUBSTEPS; i++) {
    const b = powerBalance({ n, tKeV: t });
    // Energy first, using current densities
    const w = Math.max(0, b.stored + h * (b.charged + p.pAux - b.brems - b.stored / p.tauE));
    // Particles: fusion burn, fuel feed, ash/secondary removal
    const next = { ...n };
    for (const r of ALL_REACTIONS) {
      const k = b.rates[r.id];
      for (const sp of ALL_SPECIES) {
        const d = r.delta[sp] ?? 0;
        next[sp] += h * k * d;
        if (d < 0) consumed -= h * k * d;
      }
    }
    for (const sp of ALL_SPECIES) {
      if (n0[sp] > 0) next[sp] += h * ((n0[sp] - n[sp]) / p.tauFeed);
      else next[sp] -= h * (n[sp] / p.tauAsh);
      next[sp] = Math.max(0, next[sp]);
    }
    n = next;
    // Energy conserved through density changes: T = W / heat capacity per keV
    const perKeV = 1.5 * (electronDensity(n) + ionDensity(n)) * KEV_J;
    t = perKeV > 0 ? Math.min(T_MAX_KEV, Math.max(T_MIN_KEV, w / perKeV)) : T_MIN_KEV;
  }
  return { time: s.time + dt, tKeV: t, n, consumed };
}

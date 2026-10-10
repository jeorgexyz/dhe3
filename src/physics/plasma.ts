/**
 * Zero-dimensional plasma power balance (SI units, ions and electrons at the same T).
 * Deliberately simple: no profiles, no impurities, no fuel burn-up, no synchrotron
 * radiation, no secondary burn of D-D products. Enough to show why fuels differ.
 */
import { CHARGE, Fuel, Reaction, reactivity, Species } from './reactions';

const KEV_J = 1.602176634e-16;
const MEV_J = 1.602176634e-13;
/** Bremsstrahlung: P = C * ne * sum(Zi^2 ni) * sqrt(T_keV), W/m^3 (NRL formulary) */
const BREM_C = 5.35e-37;

export interface PlasmaState {
  fuel: Fuel;
  /** Total ion density, m^-3 */
  ni: number;
  /** Temperature, keV */
  tKeV: number;
}

export interface PowerBalance {
  ne: number;
  /** Fusion power density, W/m^3 */
  fusion: number;
  /** Part of fusion power in charged products, W/m^3 */
  charged: number;
  /** Part carried off by neutrons, W/m^3 */
  neutron: number;
  brems: number;
  /** Thermal energy density, J/m^3 */
  stored: number;
}

export function electronDensity(fuel: Fuel, ni: number): number {
  let z = 0;
  for (const [s, f] of Object.entries(fuel.mix) as [Species, number][]) z += f * CHARGE[s];
  return z * ni;
}

function rateDensity(r: Reaction, fuel: Fuel, ni: number, tKeV: number): number {
  const na = ni * (fuel.mix[r.a] ?? 0);
  const nb = ni * (fuel.mix[r.b] ?? 0);
  const sv = reactivity(r, tKeV) * 1e-6; // cm^3/s -> m^3/s
  return (r.a === r.b ? 0.5 : 1) * na * nb * sv; // reactions / m^3 / s
}

export function powerBalance({ fuel, ni, tKeV }: PlasmaState): PowerBalance {
  const ne = electronDensity(fuel, ni);
  let fusion = 0;
  let charged = 0;
  for (const r of fuel.reactions) {
    const rate = rateDensity(r, fuel, ni, tKeV);
    fusion += rate * r.energyMeV * MEV_J;
    charged += rate * r.chargedMeV * MEV_J;
  }
  let z2n = 0;
  for (const [s, f] of Object.entries(fuel.mix) as [Species, number][]) {
    z2n += f * ni * CHARGE[s] ** 2;
  }
  const brems = BREM_C * ne * z2n * Math.sqrt(Math.max(tKeV, 0));
  const stored = 1.5 * (ne + ni) * tKeV * KEV_J;
  return { ne, fusion, charged, neutron: fusion - charged, brems, stored };
}

/**
 * Minimum triple product n*T*tau_E (keV s / m^3) for self-heating ignition at tKeV,
 * i.e. charged-product heating = bremsstrahlung + transport loss. Infinity if
 * bremsstrahlung alone exceeds the heating (no ignition at this temperature).
 */
export function ignitionTriple(fuel: Fuel, tKeV: number): number {
  const ni = 1e20; // result is density independent (all powers scale as n^2)
  const p = powerBalance({ fuel, ni, tKeV });
  const net = p.charged - p.brems;
  if (net <= 0) return Infinity;
  const tau = p.stored / net;
  return ni * tKeV * tau;
}

export interface SimParams {
  fuel: Fuel;
  ni: number;
  /** Energy confinement time, s */
  tauE: number;
  /** External heating power density, W/m^3 */
  pAux: number;
}

export interface SimState {
  time: number;
  tKeV: number;
}

export interface SimOutput extends PowerBalance {
  loss: number;
  /** Q = fusion / auxiliary; Infinity when pAux = 0 and the plasma is burning */
  gain: number;
  /** Neutron share of fusion power, 0..1 */
  neutronFraction: number;
}

export function observe(p: SimParams, s: SimState): SimOutput {
  const b = powerBalance({ fuel: p.fuel, ni: p.ni, tKeV: s.tKeV });
  const loss = b.stored / p.tauE;
  return {
    ...b,
    loss,
    gain: p.pAux > 0 ? b.fusion / p.pAux : b.fusion > 0 ? Infinity : 0,
    neutronFraction: b.fusion > 0 ? b.neutron / b.fusion : 0,
  };
}

/** Upper limit of the Bosch-Hale fits; the simulation does not extrapolate beyond it. */
export const T_MAX_KEV = 100;
const T_MIN_KEV = 0.01;

/** Advance temperature by dt seconds (sub-stepped explicit Euler). */
export function step(p: SimParams, s: SimState, dt: number): SimState {
  const n = 20;
  const h = dt / n;
  const heatPerKeV = 1.5 * (electronDensity(p.fuel, p.ni) + p.ni) * KEV_J;
  let t = s.tKeV;
  for (let i = 0; i < n; i++) {
    const b = powerBalance({ fuel: p.fuel, ni: p.ni, tKeV: t });
    const w = heatPerKeV * t + h * (b.charged + p.pAux - b.brems - (heatPerKeV * t) / p.tauE);
    t = Math.min(T_MAX_KEV, Math.max(T_MIN_KEV, w / heatPerKeV));
  }
  return { time: s.time + dt, tKeV: t };
}

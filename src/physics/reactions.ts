/**
 * Fusion reaction data and reactivities <sigma v>(T).
 * Reactivity fits: H.-S. Bosch and G.M. Hale, Nucl. Fusion 32 (1992) 611.
 * Valid for ion temperatures of roughly 0.2-100 keV (mildly extrapolated above).
 */

export type Species = 'D' | 'T' | 'He3';

export interface Reaction {
  id: string;
  label: string;
  a: Species;
  b: Species;
  /** Total energy released per reaction, MeV */
  energyMeV: number;
  /** Portion carried by charged products (confinable, heats the plasma), MeV */
  chargedMeV: number;
  /** Bosch-Hale coefficients */
  bg: number;
  mrc2: number;
  c: [number, number, number, number, number, number, number];
}

export const REACTIONS: Record<string, Reaction> = {
  DT: {
    id: 'DT', label: 'D + T → ⁴He + n', a: 'D', b: 'T',
    energyMeV: 17.59, chargedMeV: 3.52,
    bg: 34.3827, mrc2: 1124656,
    c: [1.17302e-9, 1.51361e-2, 7.51886e-2, 4.60643e-3, 1.35e-2, -1.0675e-4, 1.366e-5],
  },
  DHe3: {
    id: 'DHe3', label: 'D + ³He → ⁴He + p', a: 'D', b: 'He3',
    energyMeV: 18.35, chargedMeV: 18.35,
    bg: 68.7508, mrc2: 1124572,
    c: [5.51036e-10, 6.41918e-3, -2.02896e-3, -1.9108e-5, 1.35776e-4, 0, 0],
  },
  DDn: {
    id: 'DDn', label: 'D + D → ³He + n', a: 'D', b: 'D',
    energyMeV: 3.27, chargedMeV: 0.82,
    bg: 31.397, mrc2: 937814,
    c: [5.4336e-12, 5.85778e-3, 7.68222e-3, 0, -2.964e-6, 0, 0],
  },
  DDp: {
    id: 'DDp', label: 'D + D → T + p', a: 'D', b: 'D',
    energyMeV: 4.03, chargedMeV: 4.03,
    bg: 31.397, mrc2: 937814,
    c: [5.65718e-12, 3.41267e-3, 1.99167e-3, 0, 1.0506e-5, 0, 0],
  },
};

/** Maxwellian-averaged reactivity in cm^3/s for ion temperature tKeV. */
export function reactivity(r: Reaction, tKeV: number): number {
  if (tKeV <= 0) return 0;
  const [c1, c2, c3, c4, c5, c6, c7] = r.c;
  const t = tKeV;
  const theta =
    t / (1 - (t * (c2 + t * (c4 + t * c6))) / (1 + t * (c3 + t * (c5 + t * c7))));
  const xi = Math.cbrt((r.bg * r.bg) / (4 * theta));
  return c1 * theta * Math.sqrt(xi / (r.mrc2 * t ** 3)) * Math.exp(-3 * xi);
}

/** Total D-D reactivity (both branches), cm^3/s. */
export const ddTotal = (tKeV: number) =>
  reactivity(REACTIONS.DDn, tKeV) + reactivity(REACTIONS.DDp, tKeV);

export interface Fuel {
  id: 'DT' | 'DHe3' | 'DD';
  name: string;
  /** Ion fractions (sum to 1) */
  mix: Partial<Record<Species, number>>;
  reactions: Reaction[];
}

export const FUELS: Record<Fuel['id'], Fuel> = {
  DT: { id: 'DT', name: 'D-T (50:50)', mix: { D: 0.5, T: 0.5 }, reactions: [REACTIONS.DT] },
  DHe3: {
    id: 'DHe3', name: 'D-³He (50:50)', mix: { D: 0.5, He3: 0.5 },
    reactions: [REACTIONS.DHe3, REACTIONS.DDn, REACTIONS.DDp],
  },
  DD: { id: 'DD', name: 'D-D', mix: { D: 1 }, reactions: [REACTIONS.DDn, REACTIONS.DDp] },
};

export const CHARGE: Record<Species, number> = { D: 1, T: 1, He3: 2 };

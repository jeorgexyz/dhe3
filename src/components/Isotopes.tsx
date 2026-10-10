import { useState } from 'react';

interface Nuclide {
  name: string;
  symbol: string;
  protons: number;
  neutrons: number;
  note: string;
}

const NUCLIDES: Nuclide[] = [
  { name: 'Deuterium', symbol: 'D', protons: 1, neutrons: 1, note: 'Stable and abundant in seawater (about 1 in 6,400 hydrogen atoms).' },
  { name: 'Tritium', symbol: 'T', protons: 1, neutrons: 2, note: 'Radioactive (half-life 12.3 years). Must be bred from lithium.' },
  { name: 'Helium-3', symbol: '³He', protons: 2, neutrons: 1, note: 'Stable but very scarce on Earth. Suggested sources: the lunar surface, gas giants.' },
  { name: 'Helium-4', symbol: '⁴He', protons: 2, neutrons: 2, note: 'The "ash" of D-T and D-³He fusion (an alpha particle).' },
];

const R = 9;

/** Deterministic cluster layout: nucleons on a golden-angle spiral. */
function layout(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const r = i === 0 && count === 1 ? 0 : R * 1.15 * Math.sqrt(i + 0.5);
    const a = i * 2.39996;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  });
}

export default function Isotopes() {
  const [i, setI] = useState(0);
  const n = NUCLIDES[i];
  const total = n.protons + n.neutrons;
  // Alternate protons and neutrons so they mix like a real nucleus
  const kinds: ('p' | 'n')[] = [];
  for (let k = 0, p = n.protons, q = n.neutrons; p + q > 0; k++) {
    if ((k % 2 === 0 && p > 0) || q === 0) { kinds.push('p'); p--; } else { kinds.push('n'); q--; }
  }
  const pos = layout(total);

  return (
    <div className="card">
      <h2>
        {n.name} ({n.symbol})
      </h2>
      <div className="row">
        {NUCLIDES.map((x, idx) => (
          <button key={x.symbol} className={idx === i ? 'chip on' : 'chip'} onClick={() => setI(idx)}>
            {x.symbol}
          </button>
        ))}
      </div>
      <svg viewBox="-60 -60 120 120" role="img" aria-label={`${n.name} nucleus: ${n.protons} protons, ${n.neutrons} neutrons`} className="nucleus">
        {pos.map((p, idx) => (
          <circle key={idx} cx={p.x} cy={p.y} r={R} className={kinds[idx] === 'p' ? 'proton' : 'neutron'} />
        ))}
      </svg>
      <ul className="legend">
        <li><span className="dot proton" /> Proton ({n.protons})</li>
        <li><span className="dot neutron" /> Neutron ({n.neutrons})</li>
      </ul>
      <p>{n.note}</p>
      <p className="muted">
        In a fusion plasma the fuel is fully ionised, so these are bare nuclei with no electrons.
      </p>
    </div>
  );
}

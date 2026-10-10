import { useState } from 'react';
import Isotopes from './components/Isotopes';
import Reactivity from './components/Reactivity';
import Reactor from './components/Reactor';

const TABS = [
  { id: 'isotopes', label: 'Fuels', view: <Isotopes /> },
  { id: 'reactivity', label: 'Reactions', view: <Reactivity /> },
  { id: 'reactor', label: 'Reactor', view: <Reactor /> },
] as const;

export default function App() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('isotopes');
  const current = TABS.find((t) => t.id === tab)!;
  return (
    <main className="app">
      <header>
        <h1>D-He3 Fusion Lab</h1>
        <p className="sub">
          Compare fusion fuels using published reaction data and a simple power-balance model.
        </p>
        <nav role="tablist" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? 'active' : ''}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <section role="tabpanel">{current.view}</section>
      <footer>
        Reactivities: Bosch &amp; Hale, Nucl. Fusion 32 (1992) 611. Bremsstrahlung: NRL Plasma
        Formulary. Model is zero-dimensional and educational, not a reactor design tool.
      </footer>
    </main>
  );
}

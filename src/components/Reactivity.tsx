import { useMemo } from 'react';
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { FUELS, REACTIONS, ddTotal, reactivity } from '../physics/reactions';
import { ignitionTriple } from '../physics/plasma';

const SERIES = [
  { key: 'DT', name: 'D-T', color: '#d1495b' },
  { key: 'DHe3', name: 'D-³He', color: '#2e86ab' },
  { key: 'DD', name: 'D-D', color: '#6a994e' },
] as const;

const temps = Array.from({ length: 120 }, (_, i) => 1 * Math.pow(100, i / 119) * 1); // 1..100 keV log-spaced

const fmtExp = (v: number) => (v > 0 ? v.toExponential(0) : '0');

export default function Reactivity() {
  const data = useMemo(
    () =>
      temps.map((t) => ({
        t: +t.toFixed(2),
        DT: reactivity(REACTIONS.DT, t),
        DHe3: reactivity(REACTIONS.DHe3, t),
        DD: ddTotal(t),
      })),
    [],
  );
  const triple = useMemo(
    () =>
      Array.from({ length: 120 }, (_, i) => 3 * Math.pow(100 / 3, i / 119)).map((t) => ({
        t: +t.toFixed(2),
        DT: ignitionTriple(FUELS.DT, t),
        DHe3: ignitionTriple(FUELS.DHe3, t),
      })),
    [],
  );
  const minTriple = (key: 'DT' | 'DHe3') => Math.min(...triple.map((d) => d[key]));

  return (
    <div className="stack">
      <div className="card">
        <h2>Reactivity ⟨σv⟩ vs ion temperature</h2>
        <p className="muted">
          How often fuel ions fuse. D-T peaks near 60 keV and is already usable at ~10 keV. D-³He
          needs several times the temperature to get comparable rates.
        </p>
        <div className="chart">
          <ResponsiveContainer>
            <LineChart data={data} margin={{ left: 10, right: 20, top: 10, bottom: 18 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="t" type="number" scale="log" domain={[1, 100]} ticks={[1, 3, 10, 30, 100]}
                label={{ value: 'Temperature (keV)', position: 'insideBottom', offset: -5 }} />
              <YAxis width={64} scale="log" domain={[1e-24, 1e-15]} allowDataOverflow tickFormatter={fmtExp}
                label={{ value: '⟨σv⟩ (cm³/s)', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(v: number) => v.toExponential(2)} labelFormatter={(l) => `${l} keV`} />
              <Legend wrapperStyle={{ paddingTop: 14 }} />
              {SERIES.map((s) => (
                <Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color} dot={false} strokeWidth={2} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2>Ignition triple product nTτ vs temperature</h2>
        <p className="muted">
          Minimum density × temperature × energy-confinement-time for self-heating (charged
          products cover bremsstrahlung and transport losses). Lower is easier.
        </p>
        <div className="chart">
          <ResponsiveContainer>
            <LineChart data={triple} margin={{ left: 10, right: 20, top: 10, bottom: 18 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="t" type="number" scale="log" domain={[3, 100]} ticks={[3, 10, 30, 100]}
                label={{ value: 'Temperature (keV)', position: 'insideBottom', offset: -5 }} />
              <YAxis width={64} scale="log" domain={[1e21, 1e25]} allowDataOverflow tickFormatter={fmtExp}
                label={{ value: 'nTτ (keV·s/m³)', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(v: number) => (Number.isFinite(v) ? v.toExponential(2) : 'no ignition')} labelFormatter={(l) => `${l} keV`} />
              <Legend wrapperStyle={{ paddingTop: 14 }} />
              <Line dataKey="DT" name="D-T" stroke={SERIES[0].color} dot={false} strokeWidth={2} isAnimationActive={false} />
              <Line dataKey="DHe3" name="D-³He" stroke={SERIES[1].color} dot={false} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p>
          Best case: D-T ≈ <b>{minTriple('DT').toExponential(1)}</b>, D-³He ≈{' '}
          <b>{minTriple('DHe3').toExponential(1)}</b> keV·s/m³, about{' '}
          <b>{(minTriple('DHe3') / minTriple('DT')).toFixed(0)}×</b> harder. Bremsstrahlung is
          worse for ³He (Z=2), and D-D side reactions in a D-³He plasma still make some neutrons.
        </p>
      </div>

      <div className="card">
        <h2>Reaction data</h2>
        <table>
          <thead>
            <tr><th>Reaction</th><th>Energy</th><th>Charged</th><th>Neutron share</th></tr>
          </thead>
          <tbody>
            {Object.values(REACTIONS).map((r) => (
              <tr key={r.id}>
                <td>{r.label}</td>
                <td>{r.energyMeV} MeV</td>
                <td>{r.chargedMeV} MeV</td>
                <td>{(((r.energyMeV - r.chargedMeV) / r.energyMeV) * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

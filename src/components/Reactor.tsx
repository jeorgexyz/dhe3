import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { FUELS, Fuel } from '../physics/reactions';
import { SimParams, SimState, initialState, observe, step } from '../physics/plasma';

const DT_STEP = 0.25; // simulated seconds per tick (5x real time)
const TICK_MS = 50;
const MAX_POINTS = 400;

interface Point {
  time: number; T: number; fusionMW: number; lossMW: number; brem: number; heat: number;
  D: number; Tr: number; He3: number; He4: number; H: number; // ion fractions, %
}

/** Slider maximum means "off" for the particle time constants. */
const TAU_OFF = 100;
const tauFmt = (v: number) => (v >= TAU_OFF ? 'off' : v.toFixed(1));

const eng = (v: number) => (Number.isFinite(v) ? v.toPrecision(3) : '∞');

function Slider(props: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void; fmt?: (v: number) => string;
}) {
  const id = props.label.replace(/\W/g, '');
  return (
    <div className="field">
      <label htmlFor={id}>
        {props.label}: <b>{props.fmt ? props.fmt(props.value) : props.value} {props.unit}</b>
      </label>
      <input id={id} type="range" min={props.min} max={props.max} step={props.step}
        value={props.value} onChange={(e) => props.onChange(+e.target.value)} />
    </div>
  );
}

export default function Reactor() {
  const [fuelId, setFuelId] = useState<Fuel['id']>('DT');
  const [logN, setLogN] = useState(20); // log10(ni / m^3)
  const [tauE, setTauE] = useState(4);
  const [pAuxMW, setPAuxMW] = useState(0.2);
  const [t0, setT0] = useState(5);
  const [running, setRunning] = useState(false);
  const [feed, setFeed] = useState(20);
  const [pump, setPump] = useState(10);
  const [history, setHistory] = useState<Point[]>([]);

  const params: SimParams = useMemo(
    () => ({
      fuel: FUELS[fuelId], ni: 10 ** logN, tauE, pAux: pAuxMW * 1e6,
      tauFeed: feed >= TAU_OFF ? Infinity : feed,
      tauAsh: pump >= TAU_OFF ? Infinity : pump,
    }),
    [fuelId, logN, tauE, pAuxMW, feed, pump],
  );
  // Keep the latest params for the ticking interval without restarting it on slider moves
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const stateRef = useRef<SimState>(initialState(params, t0));
  const [state, setState] = useState<SimState>(stateRef.current);

  const record = (s: SimState): Point => {
    const o = observe(paramsRef.current, s);
    const pct = (x: number) => (o.ni > 0 ? (100 * x) / o.ni : 0);
    return {
      time: +s.time.toFixed(2), T: +s.tKeV.toFixed(2), fusionMW: o.fusion / 1e6, lossMW: o.loss / 1e6,
      brem: o.brems / 1e6, heat: o.charged / 1e6,
      D: pct(s.n.D), Tr: pct(s.n.T), He3: pct(s.n.He3), He4: pct(s.n.He4), H: pct(s.n.H),
    };
  };

  const reset = () => {
    const s = initialState(paramsRef.current, t0);
    stateRef.current = s;
    setState(s);
    setHistory([record(s)]);
    setRunning(false);
  };

  useEffect(reset, [fuelId, logN]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const s = step(paramsRef.current, stateRef.current, DT_STEP);
      stateRef.current = s;
      setState(s);
      setHistory((h) => [...h, record(s)].slice(-MAX_POINTS));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running]);

  const out = observe(params, state);
  const losses = out.brems + out.loss;
  const verdict =
    out.charged <= 0 || state.tKeV <= 0.5
      ? 'The plasma is cold: almost no fusion is happening.'
      : Math.abs(out.charged - losses) < 0.05 * losses
        ? 'Steady burn: charged-product heating balances losses.'
        : out.charged > losses
          ? 'Self-heating exceeds losses: temperature is rising on its own.'
          : out.charged > out.brems
            ? 'Charged-product heating beats radiation, but transport loss still wins: the plasma is cooling.'
            : 'Radiation losses exceed self-heating at this temperature.';

  return (
    <div className="stack">
      <div className="card">
        <h2>Plasma reactor (0-D model)</h2>
        <div className="row">
          {Object.values(FUELS).map((f) => (
            <button key={f.id} className={f.id === fuelId ? 'chip on' : 'chip'} onClick={() => setFuelId(f.id)}>
              {f.name}
            </button>
          ))}
        </div>
        <div className="grid">
          <Slider label="Ion density" value={logN} min={18.5} max={21.5} step={0.1} unit="m⁻³ (log₁₀)" onChange={setLogN} fmt={(v) => `10^${v.toFixed(1)}`} />
          <Slider label="Confinement time τE" value={tauE} min={0.1} max={20} step={0.1} unit="s" onChange={setTauE} />
          <Slider label="Heating power" value={pAuxMW} min={0} max={5} step={0.05} unit="MW/m³" onChange={setPAuxMW} />
          <Slider label="Start temperature" value={t0} min={1} max={100} step={1} unit="keV" onChange={setT0} />
          <Slider label="Fuel feed time" value={feed} min={1} max={TAU_OFF} step={1} unit="s" onChange={setFeed} fmt={tauFmt} />
          <Slider label="Ash removal time" value={pump} min={0.5} max={TAU_OFF} step={0.5} unit="s" onChange={setPump} fmt={tauFmt} />
        </div>
        <div className="row">
          <button className="primary" onClick={() => setRunning((r) => !r)}>{running ? 'Pause' : 'Run'}</button>
          <button onClick={reset}>Reset</button>
        </div>
      </div>

      <div className="card">
        <h2>Status at t = {state.time.toFixed(1)} s</h2>
        <div className="stats">
          <div><span>Temperature</span><b>{state.tKeV.toFixed(1)} keV</b><small>{(state.tKeV * 11.6045).toFixed(0)} million K</small></div>
          <div><span>Fusion power</span><b>{eng(out.fusion / 1e6)} MW/m³</b></div>
          <div><span>Gain Q</span><b>{Number.isFinite(out.gain) ? out.gain.toFixed(2) : '∞'}</b></div>
          <div><span>Neutron share</span><b>{(out.neutronFraction * 100).toFixed(0)}%</b></div>
          <div><span>Bremsstrahlung</span><b>{eng(out.brems / 1e6)} MW/m³</b></div>
          <div><span>Transport loss</span><b>{eng(out.loss / 1e6)} MW/m³</b></div>
          <div><span>Ash fraction</span><b>{(out.ashFraction * 100).toFixed(1)}%</b><small>⁴He + protons</small></div>
          <div><span>Fuel burned</span><b>{out.burnedInventories.toFixed(2)}×</b><small>of initial inventory</small></div>
        </div>
        <p>{verdict}</p>
        <p className="muted">
          Try D-T at the defaults (it ignites), then switch to D-³He with the same settings (it
          cannot). Turn ash removal off to watch ⁴He build up and choke the burn. With feed off
          too, the fuel simply runs out. D-³He needs around 10× the nTτ and temperatures of 50+ keV.
        </p>
      </div>

      <div className="card">
        <h2>Temperature</h2>
        <div className="chart small">
          <ResponsiveContainer>
            <LineChart data={history} margin={{ left: 10, right: 20, top: 10, bottom: 18 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }} />
              <YAxis label={{ value: 'keV', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Line dataKey="T" name="Temperature (keV)" stroke="#d1495b" dot={false} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <h2>Power balance</h2>
        <div className="chart small">
          <ResponsiveContainer>
            <LineChart data={history} margin={{ left: 10, right: 20, top: 10, bottom: 18 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} />
              <YAxis label={{ value: 'MW/m³', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(v: number) => v.toPrecision(3)} />
              <Legend wrapperStyle={{ paddingTop: 14 }} />
              <Line dataKey="heat" name="Charged-product heating" stroke="#2e86ab" dot={false} strokeWidth={2} isAnimationActive={false} />
              <Line dataKey="brem" name="Bremsstrahlung" stroke="#e9a23b" dot={false} strokeWidth={2} isAnimationActive={false} />
              <Line dataKey="lossMW" name="Transport loss" stroke="#6a994e" dot={false} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <h2>Plasma composition</h2>
        <div className="chart small">
          <ResponsiveContainer>
            <LineChart data={history} margin={{ left: 10, right: 20, top: 10, bottom: 18 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} />
              <YAxis domain={[0, 100]} label={{ value: '% of ions', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Legend wrapperStyle={{ paddingTop: 14 }} />
              <Line dataKey="D" name="D" stroke="#2e86ab" dot={false} strokeWidth={2} isAnimationActive={false} />
              <Line dataKey="Tr" name="T" stroke="#d1495b" dot={false} strokeWidth={2} isAnimationActive={false} />
              <Line dataKey="He3" name="³He" stroke="#6a994e" dot={false} strokeWidth={2} isAnimationActive={false} />
              <Line dataKey="He4" name="⁴He (ash)" stroke="#e9a23b" dot={false} strokeWidth={2} isAnimationActive={false} />
              <Line dataKey="H" name="p (ash)" stroke="#8d6bb8" dot={false} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

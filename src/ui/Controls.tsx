import { useSim } from '../state/store';
import { EXAMPLES } from '../programs/examples';

// Tiny square-wave SVG visualizing the current clock speed
function ClockWave({ hz, running }: { hz: number; running: boolean }) {
  const period = 60; // SVG units per period
  const high = 6; const low = 18; const mid = 12;
  const cycles = 4;
  const w = period * cycles;
  let d = `M 0 ${low}`;
  for (let i = 0; i < cycles; i++) {
    const x = i * period;
    d += ` L ${x} ${low} L ${x} ${high} L ${x + period * 0.5} ${high} L ${x + period * 0.5} ${low}`;
  }
  d += ` L ${w} ${low}`;

  return (
    <div className="clock-row">
      <span className="clock-label">CLK {hz}Hz</span>
      <div className="clock-wave">
        <svg viewBox={`0 0 ${w} ${mid + 6}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="wg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={running ? '#38e0c8' : '#374d6e'} stopOpacity="0.3" />
              <stop offset="50%" stopColor={running ? '#38e0c8' : '#374d6e'} stopOpacity="1" />
              <stop offset="100%" stopColor={running ? '#38e0c8' : '#374d6e'} stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path d={d} stroke="url(#wg)" strokeWidth="1.8" fill="none" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

export function Controls() {
  const { running, speedHz, snapshot, retired } = useSim((s) => ({
    running: s.running, speedHz: s.speedHz, snapshot: s.snapshot, retired: s.retired,
  }));
  const load       = useSim((s) => s.load);
  const step       = useSim((s) => s.step);
  const reset      = useSim((s) => s.reset);
  const setRunning = useSim((s) => s.setRunning);
  const setSpeed   = useSim((s) => s.setSpeed);
  const setSource  = useSim((s) => s.setSource);

  const halted = snapshot.halted;
  const cpi = retired > 0 ? (snapshot.cycle / retired).toFixed(2) : '—';

  const stateLabel = halted ? 'halted' : running ? 'running' : 'paused';
  const stateColor = halted ? 'red' : running ? 'green' : 'yellow';

  const pickExample = (id: string) => {
    const ex = EXAMPLES.find((e) => e.id === id);
    if (ex) setSource(ex.source);
  };

  return (
    <div className="controls">
      <div className="panel-title">Simulation control</div>

      {/* Example picker + assemble */}
      <div className="ctrl-row">
        <select className="select" defaultValue={EXAMPLES[0].id}
          onChange={(e) => pickExample(e.target.value)}>
          {EXAMPLES.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <button className="btn primary" onClick={load} title="Assemble source and load into instruction memory">
          Load
        </button>
      </div>

      {/* Transport controls */}
      <div className="ctrl-row">
        <button
          className={`btn run${running ? ' paused' : ''}`}
          disabled={halted}
          onClick={() => setRunning(!running)}
        >
          {running ? '⏸ Pause' : '▶ Run'}
        </button>
        <button className="btn" disabled={halted || running} onClick={step}>
          Step →
        </button>
        <button className="btn" onClick={reset} style={{ marginLeft: 'auto' }}>
          ↺ Reset
        </button>
      </div>

      {/* Clock speed slider */}
      <div className="slider-row">
        <label>Speed</label>
        <input
          type="range" min={1} max={20} step={1} value={speedHz}
          onChange={(e) => setSpeed(Number(e.target.value))}
        />
        <span className="slv">{speedHz} Hz</span>
      </div>

      {/* Clock wave */}
      <ClockWave hz={speedHz} running={running} />

      {/* Stats strip */}
      <div className="stats-strip">
        <div className="stat-cell">
          <span className="sk">cycle</span>
          <span className="sv">{snapshot.cycle}</span>
        </div>
        <div className="stat-cell">
          <span className="sk">retired</span>
          <span className="sv">{retired}</span>
        </div>
        <div className="stat-cell">
          <span className="sk">CPI</span>
          <span className="sv">{cpi}</span>
        </div>
        <div className="stat-cell">
          <span className="sk">state</span>
          <span className={`sv ${stateColor}`}>{stateLabel}</span>
        </div>
      </div>
    </div>
  );
}

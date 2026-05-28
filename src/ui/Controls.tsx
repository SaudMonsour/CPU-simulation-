import { useSim } from '../state/store';
import { EXAMPLES } from '../programs/examples';

export function Controls() {
  const { running, speedHz, snapshot, retired } = useSim((s) => ({
    running: s.running, speedHz: s.speedHz, snapshot: s.snapshot, retired: s.retired,
  }));
  const load = useSim((s) => s.load);
  const step = useSim((s) => s.step);
  const reset = useSim((s) => s.reset);
  const setRunning = useSim((s) => s.setRunning);
  const setSpeed = useSim((s) => s.setSpeed);
  const setSource = useSim((s) => s.setSource);

  const halted = snapshot.halted;
  const cpi = retired > 0 ? (snapshot.cycle / retired).toFixed(2) : '—';

  const pickExample = (id: string) => {
    const ex = EXAMPLES.find((e) => e.id === id);
    if (ex) { setSource(ex.source); }
  };

  return (
    <div className="controls">
      <div className="row">
        <select className="select" defaultValue={EXAMPLES[0].id}
          onChange={(e) => pickExample(e.target.value)}>
          {EXAMPLES.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <button className="btn primary" onClick={load}>Assemble &amp; load</button>
      </div>

      <div className="row">
        <button className="btn" disabled={halted} onClick={() => setRunning(!running)}>
          {running ? 'Pause' : 'Run'}
        </button>
        <button className="btn" disabled={halted || running} onClick={step}>Step</button>
        <button className="btn" onClick={reset}>Reset</button>
      </div>

      <div className="row slider">
        <label>Clock</label>
        <input type="range" min={1} max={20} step={1} value={speedHz}
          onChange={(e) => setSpeed(Number(e.target.value))} />
        <span className="mono">{speedHz} Hz</span>
      </div>

      <div className="stats">
        <div><span>cycle</span><b className="mono">{snapshot.cycle}</b></div>
        <div><span>retired</span><b className="mono">{retired}</b></div>
        <div><span>CPI</span><b className="mono">{cpi}</b></div>
        <div><span>state</span><b className="mono">{halted ? 'halted' : running ? 'running' : 'paused'}</b></div>
      </div>
      <p className="note">Single-cycle core, so CPI is 1 by construction. It only becomes
        interesting once the pipeline lands (see README).</p>
    </div>
  );
}

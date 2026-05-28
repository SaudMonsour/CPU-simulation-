import { useSim, readMemWindow } from '../state/store';

const hex8 = (v: number) => '0x' + (v >>> 0).toString(16).padStart(8, '0');
const hex4 = (v: number) => '0x' + (v >>> 0).toString(16).padStart(4, '0');

export function MemoryPanel() {
  // depend on snapshot so this re-reads the engine after each step
  const snapshot = useSim((s) => s.snapshot);
  const base = useSim((s) => s.memBase);
  const touched = snapshot.mem?.addr ?? -1;
  const words = readMemWindow(base, 12);

  return (
    <div className="panel">
      <div className="panel-title">Data memory <span className="sub">@ {hex4(base)}</span></div>
      <div className="mem-list">
        {words.map((w) => {
          const hit = touched >= 0 && w.addr <= touched && touched < w.addr + 4;
          return (
            <div key={w.addr} className={`mem-row ${hit ? 'touched' : ''}`}>
              <span className="maddr mono">{hex4(w.addr)}</span>
              <span className="mval mono">{hex8(w.value)}</span>
            </div>
          );
        })}
      </div>
      {snapshot.mem && (
        <div className="mem-note mono">
          {snapshot.mem.kind} {snapshot.mem.bytes}B @ {hex4(snapshot.mem.addr)} = {hex8(snapshot.mem.value)}
        </div>
      )}
    </div>
  );
}

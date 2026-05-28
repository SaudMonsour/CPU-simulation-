import { useSim } from '../state/store';
import { abiName } from '../isa/decode';

const hex = (v: number) => (v >>> 0).toString(16).padStart(8, '0');

export function RegisterPanel() {
  const snapshot = useSim((s) => s.snapshot);
  const wrote = snapshot.wrote?.reg ?? -1;
  const rs1   = snapshot.cycle > 0 ? snapshot.decoded.fields.rs1 : -1;
  const rs2   = snapshot.cycle > 0 ? snapshot.decoded.fields.rs2 : -1;
  const usesRs2 = ['R','S','B'].includes(snapshot.decoded.fmt);

  return (
    <div className="panel">
      <div className="panel-title">
        Register file
        <span className="spacer" />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>x0–x31</span>
      </div>
      <div className="reg-grid">
        {Array.from(snapshot.regs).map((v, i) => {
          const cls = [
            'reg',
            i === wrote               ? 'wrote' : '',
            i === rs1                 ? 'read'  : '',
            usesRs2 && i === rs2      ? 'read'  : '',
            i === 0                   ? 'zero'  : '',
          ].filter(Boolean).join(' ');
          const abi = abiName(i);
          return (
            <div key={i} className={cls} title={`x${i} / ${abi}`}>
              <span className="rname">x{i}</span>
              <span className="rabi">{abi}</span>
              <span className="rval mono">{hex(v)}</span>
            </div>
          );
        })}
      </div>
      <div className="legend-mini">
        <span><span className="dot wrote" />written</span>
        <span><span className="dot read"  />read</span>
        <span><span className="dot zero"  />hardwired 0</span>
      </div>
    </div>
  );
}

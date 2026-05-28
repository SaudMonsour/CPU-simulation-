import { useSim } from '../state/store';
import { abiName } from '../isa/decode';

const hex = (v: number) => '0x' + (v >>> 0).toString(16).padStart(8, '0');

export function RegisterPanel() {
  const snapshot = useSim((s) => s.snapshot);
  const wrote = snapshot.wrote?.reg ?? -1;
  const rs1 = snapshot.cycle > 0 ? snapshot.decoded.fields.rs1 : -1;
  const rs2 = snapshot.cycle > 0 ? snapshot.decoded.fields.rs2 : -1;
  const usesRs2 = snapshot.decoded.fmt === 'R' || snapshot.decoded.fmt === 'S' || snapshot.decoded.fmt === 'B';

  return (
    <div className="panel">
      <div className="panel-title">Register file</div>
      <div className="reg-grid">
        {Array.from(snapshot.regs).map((v, i) => {
          const cls = [
            'reg',
            i === wrote ? 'wrote' : '',
            i === rs1 ? 'read' : '',
            usesRs2 && i === rs2 ? 'read' : '',
            i === 0 ? 'zero' : '',
          ].filter(Boolean).join(' ');
          return (
            <div key={i} className={cls} title={abiName(i)}>
              <span className="rname">x{i}</span>
              <span className="rval mono">{hex(v)}</span>
            </div>
          );
        })}
      </div>
      <div className="legend-mini">
        <span className="dot wrote" /> written
        <span className="dot read" /> read
        <span className="dot zero" /> hard-wired 0
      </div>
    </div>
  );
}

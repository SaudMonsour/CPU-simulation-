import { useSim } from '../state/store';

interface SigDef {
  key: keyof ReturnType<typeof useSim.getState>['snapshot']['signals'];
  label: string;
  desc: string;
  isCtrl?: boolean;
}

const SIGNAL_DEFS: SigDef[] = [
  { key: 'regWrite',  label: 'RegWrite',  desc: 'Write result to destination register',  isCtrl: false },
  { key: 'aluSrc',   label: 'ALUSrc',    desc: 'ALU B-operand comes from immediate',    isCtrl: true  },
  { key: 'memRead',  label: 'MemRead',   desc: 'Initiate a data-memory load',           isCtrl: false },
  { key: 'memWrite', label: 'MemWrite',  desc: 'Initiate a data-memory store',          isCtrl: false },
  { key: 'memToReg', label: 'MemtoReg', desc: 'WB mux selects loaded data over ALU',   isCtrl: true  },
  { key: 'branch',   label: 'Branch',    desc: 'Instruction is a conditional branch',   isCtrl: false },
  { key: 'jump',     label: 'Jump',      desc: 'Unconditional jump (jal / jalr)',        isCtrl: false },
  { key: 'taken',    label: 'Taken',     desc: 'PC was actually diverted this cycle',   isCtrl: true  },
];

export function SignalsPanel() {
  const snapshot = useSim((s) => s.snapshot);
  const sig = snapshot.signals;

  return (
    <div className="panel">
      <div className="panel-title">
        Control signals
        <span className="spacer" />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.5px' }}>
          {snapshot.decoded.name !== 'unknown' ? snapshot.decoded.name.toUpperCase() : '—'}
        </span>
      </div>
      <div className="signals-grid">
        {SIGNAL_DEFS.map((def) => {
          const on = !!sig[def.key];
          return (
            <div
              key={def.key}
              className={`sig-item${on ? ' on' : ''}${def.isCtrl ? ' ctrl-sig' : ''}`}
              title={def.desc}
            >
              <div className="sig-dot" />
              <span className="sig-name">{def.label}</span>
              <span className="sig-val">{on ? '1' : '0'}</span>
            </div>
          );
        })}
      </div>
      {snapshot.flags && snapshot.cycle > 0 && (
        <div style={{ marginTop: 8 }}>
          <div className="panel-title" style={{ marginBottom: 6 }}>ALU flags</div>
          <div className="signals-grid">
            {(['zero','sign','carry','overflow'] as const).map((f) => {
              const on = snapshot.flags[f];
              return (
                <div key={f} className={`sig-item${on ? ' on' : ''}`}>
                  <div className="sig-dot" />
                  <span className="sig-name">{f}</span>
                  <span className="sig-val">{on ? '1' : '0'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import { useSim } from '../state/store';
import { UNITS } from '../scene/units';

const hex = (v: number) => '0x' + (v >>> 0).toString(16).padStart(8, '0');

// What is this unit doing in the current snapshot? Kept terse and concrete.
function liveValues(id: string, snap: ReturnType<typeof useSim.getState>['snapshot']): [string, string][] {
  const d = snap.decoded;
  switch (id) {
    case 'pc':
      return [['PC', hex(snap.pc)], ['next PC', hex(snap.next)], ['taken', String(snap.signals.taken)]];
    case 'imem':
      return [['fetched', d.hex], ['decoded', d.asm]];
    case 'control':
      return [
        ['RegWrite', String(snap.signals.regWrite)], ['ALUSrc', String(snap.signals.aluSrc)],
        ['MemRead', String(snap.signals.memRead)], ['MemWrite', String(snap.signals.memWrite)],
        ['MemtoReg', String(snap.signals.memToReg)], ['Branch', String(snap.signals.branch)],
      ];
    case 'regs':
      return [
        [`rs1 (x${d.fields.rs1})`, hex(snap.rs1v)],
        [`rs2 (x${d.fields.rs2})`, hex(snap.rs2v)],
        ['writes', snap.wrote ? `x${snap.wrote.reg} = ${hex(snap.wrote.value)}` : '—'],
      ];
    case 'imm':
      return [['immediate', String(d.imm)], ['used', String(snap.signals.aluSrc)]];
    case 'alu':
      return [
        ['operand A', hex(snap.aluA)], ['operand B', hex(snap.aluB)], ['result', hex(snap.aluResult)],
        ['zero', String(snap.flags.zero)], ['carry', String(snap.flags.carry)],
        ['overflow', String(snap.flags.overflow)], ['sign', String(snap.flags.sign)],
      ];
    case 'dmem':
      return snap.mem
        ? [['op', snap.mem.kind], ['addr', hex(snap.mem.addr)], ['bytes', String(snap.mem.bytes)], ['value', hex(snap.mem.value)]]
        : [['op', 'idle this cycle']];
    case 'wb':
      return [
        ['source', snap.signals.memToReg ? 'memory' : 'ALU / link'],
        ['writes', snap.wrote ? `x${snap.wrote.reg} = ${hex(snap.wrote.value)}` : '—'],
      ];
    default:
      return [];
  }
}

export function InspectPanel() {
  const selected = useSim((s) => s.selected);
  const snapshot = useSim((s) => s.snapshot);

  if (!selected) {
    return (
      <div className="panel inspect empty">
        <div className="panel-title">Inspector</div>
        <p className="muted">Click any block in the scene to see what it is and what it's doing this cycle.</p>
      </div>
    );
  }

  const meta = UNITS[selected];
  const vals = liveValues(selected, snapshot);

  return (
    <div className="panel inspect">
      <div className="panel-title">{meta.label}</div>
      <p className="desc">{meta.blurb}</p>
      <div className="expert">
        <span className="tag">talk like an expert</span>
        <p>{meta.expert}</p>
      </div>
      <div className="kv">
        {vals.map(([k, v]) => (
          <div key={k} className="kv-row"><span>{k}</span><b className="mono">{v}</b></div>
        ))}
      </div>
    </div>
  );
}

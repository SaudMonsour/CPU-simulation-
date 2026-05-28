import { useState } from 'react';
import { useSim } from '../state/store';
import type { Decoded } from '../engine/types';

interface Seg { label: string; hi: number; lo: number; }

// Bit-field layout per instruction format. Shift-immediates reuse the
// funct7 + shamt split rather than a single 12-bit immediate.
function segments(d: Decoded): Seg[] {
  const shift = d.name === 'slli' || d.name === 'srli' || d.name === 'srai';
  switch (d.fmt) {
    case 'R': return [
      { label: 'funct7', hi: 31, lo: 25 }, { label: 'rs2', hi: 24, lo: 20 },
      { label: 'rs1', hi: 19, lo: 15 }, { label: 'funct3', hi: 14, lo: 12 },
      { label: 'rd', hi: 11, lo: 7 }, { label: 'opcode', hi: 6, lo: 0 },
    ];
    case 'I': return shift ? [
      { label: 'funct7', hi: 31, lo: 25 }, { label: 'shamt', hi: 24, lo: 20 },
      { label: 'rs1', hi: 19, lo: 15 }, { label: 'funct3', hi: 14, lo: 12 },
      { label: 'rd', hi: 11, lo: 7 }, { label: 'opcode', hi: 6, lo: 0 },
    ] : [
      { label: 'imm[11:0]', hi: 31, lo: 20 }, { label: 'rs1', hi: 19, lo: 15 },
      { label: 'funct3', hi: 14, lo: 12 }, { label: 'rd', hi: 11, lo: 7 },
      { label: 'opcode', hi: 6, lo: 0 },
    ];
    case 'S': return [
      { label: 'imm[11:5]', hi: 31, lo: 25 }, { label: 'rs2', hi: 24, lo: 20 },
      { label: 'rs1', hi: 19, lo: 15 }, { label: 'funct3', hi: 14, lo: 12 },
      { label: 'imm[4:0]', hi: 11, lo: 7 }, { label: 'opcode', hi: 6, lo: 0 },
    ];
    case 'B': return [
      { label: 'imm[12|10:5]', hi: 31, lo: 25 }, { label: 'rs2', hi: 24, lo: 20 },
      { label: 'rs1', hi: 19, lo: 15 }, { label: 'funct3', hi: 14, lo: 12 },
      { label: 'imm[4:1|11]', hi: 11, lo: 7 }, { label: 'opcode', hi: 6, lo: 0 },
    ];
    case 'U': return [
      { label: 'imm[31:12]', hi: 31, lo: 12 }, { label: 'rd', hi: 11, lo: 7 },
      { label: 'opcode', hi: 6, lo: 0 },
    ];
    case 'J': return [
      { label: 'imm[20|10:1|11|19:12]', hi: 31, lo: 12 }, { label: 'rd', hi: 11, lo: 7 },
      { label: 'opcode', hi: 6, lo: 0 },
    ];
    default: return [{ label: 'word', hi: 31, lo: 0 }];
  }
}

const slice = (word: number, hi: number, lo: number) => {
  const width = hi - lo + 1;
  const v = (word >>> lo) & (width >= 32 ? 0xffffffff : ((1 << width) - 1));
  return { bin: (v >>> 0).toString(2).padStart(width, '0'), val: v >>> 0, width };
};

const groupBin = (b: string) => (b.match(/.{1,4}/g) ?? []).join(' ');

export function InstructionPanel() {
  const snapshot = useSim((s) => s.snapshot);
  const [view, setView] = useState<'asm' | 'hex' | 'bin'>('asm');
  const d = snapshot.decoded;
  const fmtLabel = d.fmt === '?' ? '—' : `${d.fmt}-type`;

  const main = view === 'asm' ? d.asm : view === 'hex' ? d.hex : groupBin(d.bin);

  return (
    <div className="panel">
      <div className="panel-title">
        Instruction <span className="sub">{fmtLabel}</span>
        <span className="spacer" />
        <span className="toggle">
          {(['asm', 'hex', 'bin'] as const).map((v) => (
            <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>{v}</button>
          ))}
        </span>
      </div>

      <div className="insn-main mono">{main}</div>

      <div className="fields">
        {segments(d).map((s) => {
          const { bin, val } = slice(d.word, s.hi, s.lo);
          return (
            <div key={s.label} className="field">
              <div className="field-bits mono">{bin}</div>
              <div className="field-label">{s.label}</div>
              <div className="field-val mono">{val}</div>
            </div>
          );
        })}
      </div>
      {d.fmt !== 'U' && d.fmt !== 'R' && d.fmt !== '?' && (
        <div className="imm-note mono">immediate (sign-extended) = {d.imm}</div>
      )}
    </div>
  );
}

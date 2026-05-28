import type { Decoded, Fmt } from '../engine/types';
import { ISA, InsnDef } from './encodings';

// Sign-extend the low `bits` of v into a full Int32.
const sext = (v: number, bits: number): number => (v << (32 - bits)) >> (32 - bits);

const ABI = [
  'zero', 'ra', 'sp', 'gp', 'tp', 't0', 't1', 't2',
  's0', 's1', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5',
  'a6', 'a7', 's2', 's3', 's4', 's5', 's6', 's7',
  's8', 's9', 's10', 's11', 't3', 't4', 't5', 't6',
];

// Render registers as x-numbers; flip this if you prefer ABI names in the UI.
const reg = (n: number) => `x${n}`;
export const abiName = (n: number) => ABI[n] ?? `x${n}`;

function findDef(name: string): InsnDef | undefined {
  return ISA[name];
}

// Reverse lookup: match a raw word back to a mnemonic.
function matchName(word: number): string {
  const op = word & 0x7f;
  const f3 = (word >> 12) & 7;
  const f7 = (word >> 25) & 0x7f;

  for (const [name, d] of Object.entries(ISA)) {
    if (d.opcode !== op) continue;
    if (d.fmt === 'U' || d.fmt === 'J') return name;
    if (d.funct3 !== undefined && d.funct3 !== f3) continue;
    if (d.fmt === 'R') {
      if (d.funct7 === f7) return name;
      continue;
    }
    if (d.fmt === 'I' && d.funct7 !== undefined) {
      // shift-immediate: funct7 distinguishes srli/srai (and guards slli)
      if (d.funct7 === f7) return name;
      continue;
    }
    return name; // I (non-shift), S, B matched on opcode + funct3
  }
  return 'unknown';
}

function immediate(word: number, fmt: Fmt | '?'): number {
  switch (fmt) {
    case 'I': return sext(word >>> 20, 12);
    case 'S': return sext((((word >>> 25) & 0x7f) << 5) | ((word >>> 7) & 0x1f), 12);
    case 'B': return sext(
      (((word >>> 31) & 1) << 12) |
      (((word >>> 7) & 1) << 11) |
      (((word >>> 25) & 0x3f) << 5) |
      (((word >>> 8) & 0xf) << 1), 13);
    case 'U': return (word & 0xfffff000) | 0; // already shifted; this is the value
    case 'J': return sext(
      (((word >>> 31) & 1) << 20) |
      (((word >>> 12) & 0xff) << 12) |
      (((word >>> 20) & 1) << 11) |
      (((word >>> 21) & 0x3ff) << 1), 21);
    default: return 0;
  }
}

function asmText(name: string, fmt: Fmt | '?', rd: number, rs1: number, rs2: number, imm: number): string {
  if (name === 'unknown') return '.word';
  switch (fmt) {
    case 'R': return `${name} ${reg(rd)}, ${reg(rs1)}, ${reg(rs2)}`;
    case 'I':
      if (name === 'jalr') return `${name} ${reg(rd)}, ${imm}(${reg(rs1)})`;
      if (ISA[name].opcode === 0x03) return `${name} ${reg(rd)}, ${imm}(${reg(rs1)})`; // loads
      if (name === 'slli' || name === 'srli' || name === 'srai')
        return `${name} ${reg(rd)}, ${reg(rs1)}, ${imm & 0x1f}`;
      return `${name} ${reg(rd)}, ${reg(rs1)}, ${imm}`;
    case 'S': return `${name} ${reg(rs2)}, ${imm}(${reg(rs1)})`;
    case 'B': return `${name} ${reg(rs1)}, ${reg(rs2)}, ${imm >= 0 ? '+' : ''}${imm}`;
    case 'U': return `${name} ${reg(rd)}, 0x${((imm >>> 12) & 0xfffff).toString(16)}`;
    case 'J': return `${name} ${reg(rd)}, ${imm >= 0 ? '+' : ''}${imm}`;
    default: return name;
  }
}

export function decode(word: number): Decoded {
  word = word >>> 0;
  const name = matchName(word);
  const def = findDef(name);
  const fmt: Fmt | '?' = def ? def.fmt : '?';

  const rd = (word >> 7) & 0x1f;
  const rs1 = (word >> 15) & 0x1f;
  const rs2 = (word >> 20) & 0x1f;
  const shamt = (word >> 20) & 0x1f;
  const imm = immediate(word, fmt);

  return {
    word,
    name,
    fmt,
    fields: { rd, rs1, rs2, shamt },
    imm,
    asm: asmText(name, fmt, rd, rs1, rs2, imm),
    hex: '0x' + word.toString(16).padStart(8, '0'),
    bin: word.toString(2).padStart(32, '0'),
  };
}

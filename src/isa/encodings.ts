import type { Fmt } from '../engine/types';

export interface InsnDef {
  fmt: Fmt;
  opcode: number;
  funct3?: number;
  funct7?: number;
}

// The RV32I subset we implement. funct7 on an I-type entry marks a
// shift-immediate (slli/srli/srai), where the shamt lives in imm[4:0]
// and funct7 distinguishes logical vs arithmetic shift.
export const ISA: Record<string, InsnDef> = {
  // R-type
  add:  { fmt: 'R', opcode: 0x33, funct3: 0, funct7: 0x00 },
  sub:  { fmt: 'R', opcode: 0x33, funct3: 0, funct7: 0x20 },
  sll:  { fmt: 'R', opcode: 0x33, funct3: 1, funct7: 0x00 },
  slt:  { fmt: 'R', opcode: 0x33, funct3: 2, funct7: 0x00 },
  sltu: { fmt: 'R', opcode: 0x33, funct3: 3, funct7: 0x00 },
  xor:  { fmt: 'R', opcode: 0x33, funct3: 4, funct7: 0x00 },
  srl:  { fmt: 'R', opcode: 0x33, funct3: 5, funct7: 0x00 },
  sra:  { fmt: 'R', opcode: 0x33, funct3: 5, funct7: 0x20 },
  or:   { fmt: 'R', opcode: 0x33, funct3: 6, funct7: 0x00 },
  and:  { fmt: 'R', opcode: 0x33, funct3: 7, funct7: 0x00 },

  // I-type arithmetic
  addi:  { fmt: 'I', opcode: 0x13, funct3: 0 },
  slti:  { fmt: 'I', opcode: 0x13, funct3: 2 },
  sltiu: { fmt: 'I', opcode: 0x13, funct3: 3 },
  xori:  { fmt: 'I', opcode: 0x13, funct3: 4 },
  ori:   { fmt: 'I', opcode: 0x13, funct3: 6 },
  andi:  { fmt: 'I', opcode: 0x13, funct3: 7 },
  slli:  { fmt: 'I', opcode: 0x13, funct3: 1, funct7: 0x00 },
  srli:  { fmt: 'I', opcode: 0x13, funct3: 5, funct7: 0x00 },
  srai:  { fmt: 'I', opcode: 0x13, funct3: 5, funct7: 0x20 },

  // Loads (I-type)
  lb:  { fmt: 'I', opcode: 0x03, funct3: 0 },
  lh:  { fmt: 'I', opcode: 0x03, funct3: 1 },
  lw:  { fmt: 'I', opcode: 0x03, funct3: 2 },
  lbu: { fmt: 'I', opcode: 0x03, funct3: 4 },
  lhu: { fmt: 'I', opcode: 0x03, funct3: 5 },

  // Stores (S-type)
  sb: { fmt: 'S', opcode: 0x23, funct3: 0 },
  sh: { fmt: 'S', opcode: 0x23, funct3: 1 },
  sw: { fmt: 'S', opcode: 0x23, funct3: 2 },

  // Branches (B-type)
  beq:  { fmt: 'B', opcode: 0x63, funct3: 0 },
  bne:  { fmt: 'B', opcode: 0x63, funct3: 1 },
  blt:  { fmt: 'B', opcode: 0x63, funct3: 4 },
  bge:  { fmt: 'B', opcode: 0x63, funct3: 5 },
  bltu: { fmt: 'B', opcode: 0x63, funct3: 6 },
  bgeu: { fmt: 'B', opcode: 0x63, funct3: 7 },

  // Jumps
  jal:  { fmt: 'J', opcode: 0x6f },
  jalr: { fmt: 'I', opcode: 0x67, funct3: 0 },

  // Upper immediate (U-type)
  lui:   { fmt: 'U', opcode: 0x37 },
  auipc: { fmt: 'U', opcode: 0x17 },
};

// ABI register names mapped to their x-numbers. s0 and fp are the same reg.
export const REG_ABI: Record<string, number> = {
  zero: 0, ra: 1, sp: 2, gp: 3, tp: 4,
  t0: 5, t1: 6, t2: 7,
  s0: 8, fp: 8, s1: 9,
  a0: 10, a1: 11, a2: 12, a3: 13, a4: 14, a5: 15, a6: 16, a7: 17,
  s2: 18, s3: 19, s4: 20, s5: 21, s6: 22, s7: 23, s8: 24, s9: 25, s10: 26, s11: 27,
  t3: 28, t4: 29, t5: 30, t6: 31,
};

export function parseReg(token: string): number {
  const t = token.trim().toLowerCase();
  const m = /^x(\d{1,2})$/.exec(t);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 0 && n <= 31) return n;
  }
  if (t in REG_ABI) return REG_ABI[t];
  throw new Error(`unknown register "${token}"`);
}

const u = (x: number) => x >>> 0;

export interface EncodeArgs {
  rd?: number;
  rs1?: number;
  rs2?: number;
  imm?: number;   // for B/J this is the byte offset; for U the 20-bit operand
  shamt?: number;
}

export function encode(def: InsnDef, f: EncodeArgs): number {
  const op = def.opcode;
  const f3 = def.funct3 ?? 0;
  const f7 = def.funct7 ?? 0;
  const rd = f.rd ?? 0;
  const rs1 = f.rs1 ?? 0;
  const rs2 = f.rs2 ?? 0;
  const imm = f.imm ?? 0;

  switch (def.fmt) {
    case 'R':
      return u((f7 << 25) | (rs2 << 20) | (rs1 << 15) | (f3 << 12) | (rd << 7) | op);

    case 'I': {
      if (def.funct7 !== undefined) {
        // shift-immediate: shamt in [24:20], funct7 in [31:25]
        const shamt = (f.shamt ?? imm) & 0x1f;
        return u((f7 << 25) | (shamt << 20) | (rs1 << 15) | (f3 << 12) | (rd << 7) | op);
      }
      return u(((imm & 0xfff) << 20) | (rs1 << 15) | (f3 << 12) | (rd << 7) | op);
    }

    case 'S': {
      const i = imm & 0xfff;
      const hi = (i >> 5) & 0x7f;
      const lo = i & 0x1f;
      return u((hi << 25) | (rs2 << 20) | (rs1 << 15) | (f3 << 12) | (lo << 7) | op);
    }

    case 'B': {
      const b12 = (imm >> 12) & 1;
      const b11 = (imm >> 11) & 1;
      const b10_5 = (imm >> 5) & 0x3f;
      const b4_1 = (imm >> 1) & 0xf;
      return u((b12 << 31) | (b10_5 << 25) | (rs2 << 20) | (rs1 << 15) |
               (f3 << 12) | (b4_1 << 8) | (b11 << 7) | op);
    }

    case 'U':
      // operand is the raw 20-bit value; it lands in bits [31:12]
      return u(((imm & 0xfffff) << 12) | (rd << 7) | op);

    case 'J': {
      const b20 = (imm >> 20) & 1;
      const b10_1 = (imm >> 1) & 0x3ff;
      const b11 = (imm >> 11) & 1;
      const b19_12 = (imm >> 12) & 0xff;
      return u((b20 << 31) | (b10_1 << 21) | (b11 << 20) | (b19_12 << 12) | (rd << 7) | op);
    }
  }
}

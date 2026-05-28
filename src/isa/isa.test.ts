import { describe, it, expect } from 'vitest';
import { assemble } from './assembler';
import { decode } from './decode';

const enc = (src: string) => assemble(src).words[0] >>> 0;

describe('known encodings', () => {
  // These hex values are the canonical RV32I encodings; an assembler and a
  // PhD's reference card should agree on them.
  it('add x1, x2, x3', () => {
    expect(enc('add x1, x2, x3')).toBe(0x003100b3);
  });
  it('addi x1, x2, -4', () => {
    expect(enc('addi x1, x2, -4')).toBe(0xffc10093);
  });
  it('lw x5, 8(x6)', () => {
    expect(enc('lw x5, 8(x6)')).toBe(0x00832283);
  });
  it('sw x5, 12(x6)', () => {
    expect(enc('sw x5, 12(x6)')).toBe(0x00532623);
  });
});

describe('decode reports the right format and fields', () => {
  it('classifies an R-type', () => {
    const d = decode(enc('sub x4, x5, x6'));
    expect(d.fmt).toBe('R');
    expect(d.name).toBe('sub');
    expect(d.fields.rd).toBe(4);
    expect(d.fields.rs1).toBe(5);
    expect(d.fields.rs2).toBe(6);
  });

  it('recovers a sign-extended I-type immediate', () => {
    const d = decode(enc('addi x1, x0, -1'));
    expect(d.fmt).toBe('I');
    expect(d.imm).toBe(-1);
  });

  it('distinguishes srli from srai by funct7', () => {
    expect(decode(enc('srli x1, x2, 3')).name).toBe('srli');
    expect(decode(enc('srai x1, x2, 3')).name).toBe('srai');
  });

  it('reconstructs the branch offset', () => {
    // beq to a label 8 bytes ahead -> imm = +8
    const d = decode(assemble('beq x1, x2, 8').words[0]);
    expect(d.fmt).toBe('B');
    expect(d.imm).toBe(8);
  });

  it('handles lui as a U-type value in the upper bits', () => {
    const d = decode(enc('lui x1, 0x12345'));
    expect(d.fmt).toBe('U');
    expect(d.imm >>> 0).toBe(0x12345000);
  });
});

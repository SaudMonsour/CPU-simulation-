import { describe, it, expect } from 'vitest';
import { rippleAdd, alu } from './alu';

describe('ripple-carry adder', () => {
  it('adds small numbers', () => {
    expect(rippleAdd(2, 3).sum).toBe(5);
  });

  it('wraps at 32 bits and reports carry-out', () => {
    const r = rippleAdd(0xffffffff | 0, 1);
    expect(r.sum).toBe(0);
    expect(r.carryOut).toBe(1);
  });

  it('flags signed overflow on 0x7fffffff + 1', () => {
    const r = alu('add', 0x7fffffff, 1);
    expect(r.value).toBe(-0x80000000); // wrapped to most-negative
    expect(r.overflow).toBe(true);
    expect(r.carry).toBe(false);
  });

  it('no overflow on -1 + 1', () => {
    const r = alu('add', -1, 1);
    expect(r.value).toBe(0);
    expect(r.zero).toBe(true);
    expect(r.overflow).toBe(false);
    expect(r.carry).toBe(true); // 0xffffffff + 1 carries out
  });
});

describe('subtraction is add-of-negation', () => {
  it('computes 5 - 8 = -3', () => {
    const r = alu('sub', 5, 8);
    expect(r.value).toBe(-3);
    expect(r.sign).toBe(true);
  });

  it('detects overflow on most-negative minus one', () => {
    const r = alu('sub', -0x80000000, 1);
    expect(r.overflow).toBe(true);
  });
});

describe('shifts and compares', () => {
  it('sra preserves sign, srl does not', () => {
    expect(alu('sra', -8, 1).value).toBe(-4);
    expect(alu('srl', -8, 1).value).toBe(0x7ffffffc);
  });

  it('slt is signed, sltu is unsigned', () => {
    expect(alu('slt', -1, 1).value).toBe(1);
    expect(alu('sltu', -1, 1).value).toBe(0); // -1 is 0xffffffff, the larger unsigned
  });
});

import { describe, it, expect } from 'vitest';
import { CPU } from './cpu';
import { assemble } from '../isa/assembler';

function run(src: string, maxCycles = 10000): CPU {
  const cpu = new CPU();
  cpu.load(assemble(src).words);
  let n = 0;
  while (!cpu.halted && n < maxCycles) { cpu.step(); n++; }
  return cpu;
}

describe('basic semantics', () => {
  it('keeps x0 wired to zero', () => {
    const cpu = run('addi x0, x0, 5');
    expect(cpu.regs[0]).toBe(0);
  });

  it('loads a negative immediate via sign extension', () => {
    const cpu = run('addi x1, x0, -1');
    expect(cpu.regs[1]).toBe(-1);
  });

  it('builds a 32-bit constant with the li pseudo (lui + addi)', () => {
    const cpu = run('li x5, 0x12345678');
    expect(cpu.regs[5] >>> 0).toBe(0x12345678);
  });

  it('round-trips a word through memory (sw then lw)', () => {
    const cpu = run(`
      li x1, 0xdeadbeef
      addi x2, x0, 64
      sw x1, 0(x2)
      lw x3, 0(x2)
    `);
    expect(cpu.regs[3] >>> 0).toBe(0xdeadbeef);
  });

  it('sign-extends a byte load (lb) but not lbu', () => {
    const cpu = run(`
      addi x2, x0, 100
      addi x1, x0, -2
      sb x1, 0(x2)
      lb x3, 0(x2)
      lbu x4, 0(x2)
    `);
    expect(cpu.regs[3]).toBe(-2);     // 0xFE sign-extended
    expect(cpu.regs[4]).toBe(0xfe);   // zero-extended
  });
});

describe('control flow', () => {
  it('sums 1..10 with a branch-backward loop', () => {
    // x10 = sum, x11 = i, loop while i <= 10
    const cpu = run(`
          addi x10, x0, 0
          addi x11, x0, 1
      loop:
          add  x10, x10, x11
          addi x11, x11, 1
          addi x12, x0, 11
          blt  x11, x12, loop
    `);
    expect(cpu.regs[10]).toBe(55);
  });

  it('takes a forward branch and skips an instruction', () => {
    const cpu = run(`
          addi x1, x0, 1
          addi x2, x0, 1
          beq  x1, x2, skip
          addi x3, x0, 999
      skip:
          addi x4, x0, 7
    `);
    expect(cpu.regs[3]).toBe(0);  // skipped
    expect(cpu.regs[4]).toBe(7);
  });

  it('links the return address on jal', () => {
    const cpu = run(`
          jal  x1, target
          addi x5, x0, 1
      target:
          addi x6, x0, 2
    `);
    expect(cpu.regs[1]).toBe(4);  // pc(0) + 4
    expect(cpu.regs[5]).toBe(0);  // jumped over
    expect(cpu.regs[6]).toBe(2);
  });
});

describe('array traversal (memory access pattern)', () => {
  it('writes then sums an array of four words', () => {
    const cpu = run(`
          addi x2, x0, 200      # base
          addi x1, x0, 10
          sw   x1, 0(x2)
          addi x1, x0, 20
          sw   x1, 4(x2)
          addi x1, x0, 30
          sw   x1, 8(x2)
          addi x1, x0, 40
          sw   x1, 12(x2)

          addi x10, x0, 0       # sum
          addi x11, x0, 0       # offset
          addi x12, x0, 16      # end offset
      loop:
          add  x13, x2, x11
          lw   x14, 0(x13)
          add  x10, x10, x14
          addi x11, x11, 4
          blt  x11, x12, loop
    `);
    expect(cpu.regs[10]).toBe(100);
  });
});

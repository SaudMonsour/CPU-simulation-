import type { Signals, Snapshot, MemAccess, RegWriteInfo, Flags } from './types';
import { alu, AluOp } from './alu';
import { decode } from '../isa/decode';

const MEM_BYTES = 0x10000; // 64 KiB of flat, byte-addressable data memory

const noSignals = (): Signals => ({
  regWrite: false, aluSrc: false, memRead: false, memWrite: false,
  memToReg: false, branch: false, jump: false, taken: false,
});

const noFlags = (): Flags => ({ zero: false, sign: false, carry: false, overflow: false });

// Functionally-correct single-cycle machine. Each call to step() fetches,
// decodes, executes, and retires exactly one instruction, then returns a
// full snapshot. The 5-stage pipeline is a separate engine variant (see
// README, "Not done yet") that will reuse this same ISA logic.
export class CPU {
  regs = new Int32Array(32);
  mem = new Uint8Array(MEM_BYTES);
  imem: Uint32Array = new Uint32Array(0);
  pc = 0;
  cycle = 0;
  halted = false;

  load(words: number[]): void {
    this.imem = Uint32Array.from(words);
    this.reset();
  }

  reset(): void {
    this.regs = new Int32Array(32);
    this.mem = new Uint8Array(MEM_BYTES);
    this.regs[2] = MEM_BYTES - 16; // a conventional initial stack pointer
    this.pc = 0;
    this.cycle = 0;
    this.halted = this.imem.length === 0;
  }

  private read(i: number): number {
    return i === 0 ? 0 : this.regs[i] | 0;
  }
  private write(i: number, v: number): void {
    if (i !== 0) this.regs[i] = v | 0; // x0 stays wired to zero
  }

  private loadMem(addr: number, bytes: number, signed: boolean): number {
    const a = addr >>> 0;
    let v = 0;
    for (let k = 0; k < bytes; k++) v |= this.mem[(a + k) & (MEM_BYTES - 1)] << (8 * k);
    if (signed) {
      const bits = bytes * 8;
      v = (v << (32 - bits)) >> (32 - bits);
    }
    return v | 0;
  }
  private storeMem(addr: number, bytes: number, value: number): void {
    const a = addr >>> 0;
    for (let k = 0; k < bytes; k++) this.mem[(a + k) & (MEM_BYTES - 1)] = (value >> (8 * k)) & 0xff;
  }

  memWindow(base: number, count: number): { addr: number; value: number }[] {
    const out = [];
    for (let i = 0; i < count; i++) {
      const addr = (base + i * 4) >>> 0;
      out.push({ addr, value: this.loadMem(addr, 4, false) });
    }
    return out;
  }

  step(): Snapshot {
    if (this.halted) return this.snapshot(decode(0), 0, 0, 0, 0, 0, noFlags(), noSignals(), null, null);

    const pc = this.pc >>> 0;
    const word = (pc >> 2) < this.imem.length ? this.imem[pc >> 2] >>> 0 : 0;
    const d = decode(word);

    const rs1v = this.read(d.fields.rs1);
    const rs2v = this.read(d.fields.rs2);
    const sig = noSignals();
    const imm = d.imm;

    let next = (pc + 4) >>> 0;
    let aluA = rs1v;
    let aluB = rs2v;
    let aluResult = 0;
    let flags = noFlags();
    let mem: MemAccess | null = null;
    let wrote: RegWriteInfo | null = null;
    let result = 0; // value written back to rd

    const doAlu = (op: AluOp, a: number, b: number) => {
      const r = alu(op, a, b);
      aluA = a; aluB = b; aluResult = r.value;
      flags = { zero: r.zero, sign: r.sign, carry: r.carry, overflow: r.overflow };
      return r.value;
    };

    switch (d.fmt) {
      case 'R': {
        sig.regWrite = true;
        const map: Record<string, AluOp> = {
          add: 'add', sub: 'sub', and: 'and', or: 'or', xor: 'xor',
          sll: 'sll', srl: 'srl', sra: 'sra', slt: 'slt', sltu: 'sltu',
        };
        result = doAlu(map[d.name], rs1v, rs2v);
        break;
      }
      case 'I': {
        if (d.name === 'jalr') {
          sig.regWrite = true; sig.jump = true; sig.taken = true;
          result = next;                            // link = pc + 4
          next = ((rs1v + imm) & ~1) >>> 0;
          aluA = rs1v; aluB = imm; aluResult = next | 0;
        } else if ((word & 0x7f) === 0x03) {
          // loads
          sig.regWrite = true; sig.memRead = true; sig.aluSrc = true; sig.memToReg = true;
          const addr = doAlu('add', rs1v, imm) >>> 0;
          const sizes: Record<string, [number, boolean]> = {
            lb: [1, true], lbu: [1, false], lh: [2, true], lhu: [2, false], lw: [4, true],
          };
          const [bytes, signed] = sizes[d.name];
          result = this.loadMem(addr, bytes, signed);
          mem = { kind: 'read', addr, bytes, value: result };
        } else {
          // arithmetic immediates + shifts
          sig.regWrite = true; sig.aluSrc = true;
          const map: Record<string, AluOp> = {
            addi: 'add', andi: 'and', ori: 'or', xori: 'xor',
            slti: 'slt', sltiu: 'sltu', slli: 'sll', srli: 'srl', srai: 'sra',
          };
          const operand = (d.name === 'slli' || d.name === 'srli' || d.name === 'srai')
            ? d.fields.shamt
            : imm;
          result = doAlu(map[d.name], rs1v, operand);
        }
        break;
      }
      case 'S': {
        sig.memWrite = true; sig.aluSrc = true;
        const addr = doAlu('add', rs1v, imm) >>> 0;
        const bytes = d.name === 'sb' ? 1 : d.name === 'sh' ? 2 : 4;
        this.storeMem(addr, bytes, rs2v);
        mem = { kind: 'write', addr, bytes, value: rs2v & ((bytes === 4) ? -1 : (1 << (bytes * 8)) - 1) };
        break;
      }
      case 'B': {
        sig.branch = true;
        // the branch adder computes the target; the ALU does the comparison
        const cmp: Record<string, boolean> = {
          beq: rs1v === rs2v,
          bne: rs1v !== rs2v,
          blt: (rs1v | 0) < (rs2v | 0),
          bge: (rs1v | 0) >= (rs2v | 0),
          bltu: (rs1v >>> 0) < (rs2v >>> 0),
          bgeu: (rs1v >>> 0) >= (rs2v >>> 0),
        };
        doAlu('sub', rs1v, rs2v); // surfaces the zero flag used by beq/bne
        if (cmp[d.name]) { next = (pc + imm) >>> 0; sig.taken = true; }
        aluResult = (pc + imm) | 0; // show the computed target
        break;
      }
      case 'J': {
        // jal
        sig.regWrite = true; sig.jump = true; sig.taken = true;
        result = next;
        next = (pc + imm) >>> 0;
        aluResult = next | 0;
        break;
      }
      case 'U': {
        sig.regWrite = true;
        result = d.name === 'lui' ? (imm | 0) : ((pc + imm) | 0); // auipc adds PC
        aluResult = result;
        break;
      }
      default:
        // nothing decoded — treat as a halt so run/step stops cleanly
        this.halted = true;
        break;
    }

    if (sig.regWrite && d.fields.rd !== 0) {
      this.write(d.fields.rd, result);
      wrote = { reg: d.fields.rd, value: result | 0 };
    }

    this.pc = next;
    this.cycle += 1;
    if ((this.pc >> 2) >= this.imem.length) this.halted = true;

    return this.snapshot(d, rs1v, rs2v, aluA, aluB, aluResult, flags, sig, mem, wrote, pc, next);
  }

  private snapshot(
    decoded: ReturnType<typeof decode>,
    rs1v: number, rs2v: number, aluA: number, aluB: number, aluResult: number,
    flags: Flags, signals: Signals, mem: MemAccess | null, wrote: RegWriteInfo | null,
    pc = this.pc, next = this.pc,
  ): Snapshot {
    return {
      cycle: this.cycle,
      pc, next, decoded, rs1v, rs2v, aluA, aluB, aluResult,
      flags, signals, mem, wrote,
      regs: Int32Array.from(this.regs),
      halted: this.halted,
    };
  }
}

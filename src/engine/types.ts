// Core data types shared between the simulation engine and the renderer.
// The engine produces a Snapshot every executed instruction; the 3D scene
// only ever reads these. Nothing in here knows about React or three.js.

export type Fmt = 'R' | 'I' | 'S' | 'B' | 'U' | 'J';

export interface Fields {
  rd: number;
  rs1: number;
  rs2: number;
  shamt: number; // only meaningful for the shift-immediate instructions
}

export interface Decoded {
  word: number;
  name: string;     // mnemonic, or 'unknown' if nothing matched
  fmt: Fmt | '?';
  fields: Fields;
  imm: number;      // sign-extended (U-type carries the already-shifted value)
  asm: string;      // reconstructed assembly, e.g. "addi x1, x0, -4"
  hex: string;      // 0x........
  bin: string;      // 32 chars, MSB first
}

export interface Flags {
  zero: boolean;
  sign: boolean;
  carry: boolean;
  overflow: boolean;
}

// One bit per control line the decode/control unit asserts for this insn.
// At single-cycle granularity these are all decided up front; once the
// pipeline lands they become per-stage latched signals.
export interface Signals {
  regWrite: boolean;
  aluSrc: boolean;   // second ALU operand comes from the immediate
  memRead: boolean;
  memWrite: boolean;
  memToReg: boolean; // write-back mux selects loaded data over the ALU result
  branch: boolean;
  jump: boolean;
  taken: boolean;    // PC actually diverted (branch taken or any jump)
}

export interface MemAccess {
  kind: 'read' | 'write';
  addr: number;
  bytes: number;
  value: number;
}

export interface RegWriteInfo {
  reg: number;
  value: number;
}

export interface Snapshot {
  cycle: number;
  pc: number;
  next: number;
  decoded: Decoded;
  rs1v: number;
  rs2v: number;
  aluA: number;
  aluB: number;
  aluResult: number;
  flags: Flags;
  signals: Signals;
  mem: MemAccess | null;
  wrote: RegWriteInfo | null;
  regs: Int32Array; // copy, safe for the UI to hold onto
  halted: boolean;
}

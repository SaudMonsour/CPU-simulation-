// Layout + documentation for each datapath block. Shared by the 3D scene
// (which reads pos/size/color) and the inspector panel (which reads the
// descriptions). Positions are in world units on the z=0 plane.

export type Vec3 = [number, number, number];

export interface UnitMeta {
  id: string;
  label: string;
  pos: Vec3;
  size: Vec3;
  color: string;
  blurb: string;   // what it is / does
  expert: string;  // phrasing you can repeat to someone who knows the field
}

export const UNITS: Record<string, UnitMeta> = {
  pc: {
    id: 'pc', label: 'PC', pos: [-9, 0, 0], size: [1.2, 1.0, 0.8], color: '#3b82f6',
    blurb: 'The program counter holds the byte address of the instruction being fetched. By default it advances by 4 each cycle; branches and jumps overwrite it through the PC mux.',
    expert: 'The PC is sequenced by a mux selecting between PC+4 and a computed branch/jump target.',
  },
  imem: {
    id: 'imem', label: 'Instr Mem', pos: [-6.3, 0, 0], size: [1.8, 1.2, 0.8], color: '#6366f1',
    blurb: 'Instruction memory (an I-cache in real hardware) returns the 32-bit instruction word at the PC. Kept separate from data memory so fetch and load/store do not compete for one port.',
    expert: 'Splitting the I-cache from the D-cache removes the structural hazard a unified single-ported memory would create.',
  },
  control: {
    id: 'control', label: 'Control', pos: [-3, 2.4, 0], size: [1.8, 1.0, 0.8], color: '#f59e0b',
    blurb: 'The control unit decodes the opcode and funct fields into the control signals that steer the rest of the datapath: RegWrite, ALUSrc, MemRead, MemWrite, MemtoReg, Branch, and the ALU operation.',
    expert: 'Control derives the datapath select/enable lines from opcode + funct3/funct7.',
  },
  regs: {
    id: 'regs', label: 'Register File', pos: [-3, 0, 0], size: [1.9, 1.3, 0.8], color: '#10b981',
    blurb: '32 integer registers x0..x31 with two read ports and one write port. x0 is hard-wired to zero. Operands are read here in decode; the write-back result lands here at the end of the cycle.',
    expert: 'A 2-read/1-write register file; x0 reads as a constant zero regardless of writes.',
  },
  imm: {
    id: 'imm', label: 'Imm Gen', pos: [-3, -2.3, 0], size: [1.6, 1.0, 0.8], color: '#14b8a6',
    blurb: 'The immediate generator extracts and sign-extends the immediate from the instruction according to its format (I, S, B, U, J). The bits sit in different places in each format.',
    expert: 'Immediates are sign-extended in every format except U (already placed in the upper 20 bits).',
  },
  alu: {
    id: 'alu', label: 'ALU', pos: [0.4, 0, 0], size: [1.6, 1.6, 0.9], color: '#ef4444',
    blurb: 'The arithmetic-logic unit computes the result: add/sub (two\'s complement), bitwise logic, shifts, and comparisons. It also computes effective addresses for loads/stores and the branch comparison.',
    expert: 'Subtraction is a + (~b) + 1; signed overflow is the XOR of the carry into and out of the MSB.',
  },
  dmem: {
    id: 'dmem', label: 'Data Mem', pos: [3.6, 0, 0], size: [1.8, 1.3, 0.8], color: '#8b5cf6',
    blurb: 'Data memory (the L1 D-cache fronting DRAM in real hardware) is read by loads and written by stores. The ALU result supplies the effective address.',
    expert: 'Loads/stores hit the D-cache; a miss walks down the hierarchy with the latency the cache model would charge.',
  },
  wb: {
    id: 'wb', label: 'WB Mux', pos: [6.6, 0, 0], size: [1.2, 1.2, 0.8], color: '#22d3ee',
    blurb: 'The write-back mux chooses what gets written to rd: the ALU result, loaded data (MemtoReg), or the link address (PC+4) for jal/jalr.',
    expert: 'MemtoReg selects loaded data over the ALU result on the write-back path.',
  },
};

export const UNIT_ORDER = ['pc', 'imem', 'control', 'regs', 'imm', 'alu', 'dmem', 'wb'];

export interface Bus {
  from: string;
  to: string;
  kind: 'pc' | 'data' | 'control';
}

export const BUSES: Bus[] = [
  { from: 'pc', to: 'imem', kind: 'pc' },
  { from: 'imem', to: 'regs', kind: 'data' },
  { from: 'imem', to: 'control', kind: 'control' },
  { from: 'imem', to: 'imm', kind: 'data' },
  { from: 'regs', to: 'alu', kind: 'data' },
  { from: 'imm', to: 'alu', kind: 'data' },
  { from: 'control', to: 'alu', kind: 'control' },
  { from: 'regs', to: 'dmem', kind: 'data' },
  { from: 'alu', to: 'dmem', kind: 'data' },
  { from: 'alu', to: 'wb', kind: 'data' },
  { from: 'dmem', to: 'wb', kind: 'data' },
  { from: 'wb', to: 'regs', kind: 'data' },
];

export const busId = (b: Bus) => `${b.from}-${b.to}`;

// Layout and documentation for every datapath block.
// Positions follow a left-to-right 5-stage pipeline floor plan.
// x-axis = pipeline direction  y-axis = height  z-axis = depth

export type Vec3 = [number, number, number];

export interface UnitMeta {
  id: string;
  label: string;
  pos: Vec3;
  size: Vec3;
  color: string;
  stage: 'IF' | 'ID' | 'EX' | 'MEM' | 'WB';
  blurb: string;
  expert: string;
}

export const UNITS: Record<string, UnitMeta> = {
  pc: {
    id: 'pc', label: 'PC', stage: 'IF',
    pos: [-11, 0, 0], size: [1.4, 0.7, 1.2], color: '#3b82f6',
    blurb: 'The Program Counter holds the byte address of the instruction being fetched. Each cycle it advances by 4; branches and jumps overwrite it through the PC mux.',
    expert: 'The PC is sequenced by a 2-input mux selecting between PC+4 and a computed branch/jump target. In a pipelined machine the branch target is resolved in the EX or MEM stage, creating a control hazard.',
  },
  imem: {
    id: 'imem', label: 'I-Cache', stage: 'IF',
    pos: [-8.5, 0, 0], size: [2.2, 0.7, 1.6], color: '#6366f1',
    blurb: 'Instruction memory (an L1 I-cache in real hardware) returns the 32-bit instruction word addressed by the PC. It is kept separate from data memory to avoid structural hazards.',
    expert: 'Splitting I-cache from D-cache removes the structural hazard that a single-ported unified memory would impose on the fetch and memory stages simultaneously.',
  },
  control: {
    id: 'control', label: 'Control', stage: 'ID',
    pos: [-4, 2.9, 0], size: [2.2, 0.7, 1.4], color: '#f59e0b',
    blurb: 'The control unit decodes the opcode and funct fields into the signals that steer the datapath: RegWrite, ALUSrc, MemRead, MemWrite, MemtoReg, Branch, and ALUOp.',
    expert: 'Control is purely combinational — it maps opcode+funct3+funct7 to the set of datapath enable/select lines. In a real design these become the bits loaded into the ID/EX pipeline register.',
  },
  regs: {
    id: 'regs', label: 'Register File', stage: 'ID',
    pos: [-4, 0, 0], size: [2.4, 0.7, 2.4], color: '#10b981',
    blurb: '32 × 32-bit integer registers x0–x31 with two asynchronous read ports and one synchronous write port. x0 is hard-wired to zero; writes to it are silently discarded.',
    expert: 'A 2R/1W register file. x0 is a constant-zero source, not a register. The write port is gated by RegWrite and the write-back clock edge. RAW hazards arise when a subsequent instruction reads a register not yet written back.',
  },
  imm: {
    id: 'imm', label: 'Imm Gen', stage: 'ID',
    pos: [-4, -2.9, 0], size: [2.0, 0.7, 1.2], color: '#14b8a6',
    blurb: 'The immediate generator extracts bits from the instruction word and sign-extends them to 32 bits. Each instruction format (I, S, B, U, J) scatters the immediate bits differently.',
    expert: 'Sign extension replicates bit 31 of the instruction into the upper bits of the immediate. U-type already provides bits [31:12]; J and B-type immediates encode word- and half-word-aligned offsets with bit 0 implicit.',
  },
  alu: {
    id: 'alu', label: 'ALU', stage: 'EX',
    pos: [1.5, 0, 0], size: [2.6, 0.7, 2.4], color: '#ef4444',
    blurb: 'The arithmetic-logic unit computes the result: addition/subtraction (two\'s complement), bitwise AND/OR/XOR, shifts, and signed/unsigned comparisons. It also computes effective addresses for loads/stores.',
    expert: 'Subtraction is implemented as a + (~b) + 1 via carry-in. Signed overflow is detected as XOR of carry-into and carry-out of bit 31. The zero flag drives the branch mux. ALU operation is selected by ALUOp + funct3 + funct7.',
  },
  dmem: {
    id: 'dmem', label: 'D-Cache', stage: 'MEM',
    pos: [6.5, 0, 0], size: [2.4, 0.7, 2.0], color: '#8b5cf6',
    blurb: 'Data memory (the L1 D-cache in real hardware) is read by load instructions and written by stores. The effective address comes from the ALU; the data to store comes from rs2 via the MEM/WB path.',
    expert: 'On a cache miss the pipeline stalls for the fill latency (typically 10–200 cycles to DRAM). Write-back + write-allocate is the standard policy for performance. A dirty eviction must first flush the victim line.',
  },
  wb: {
    id: 'wb', label: 'WB Mux', stage: 'WB',
    pos: [11, 0, 0], size: [1.6, 0.7, 1.2], color: '#22d3ee',
    blurb: 'The write-back mux selects what value gets written to the destination register: the ALU result for arithmetic, loaded data for lw/lb (MemtoReg), or PC+4 for jal/jalr (link register).',
    expert: 'MemtoReg is a 2-bit mux select in practice (ALU result / load data / link address). The selected value drives the register file write port on the trailing clock edge.',
  },
};

export const UNIT_ORDER = ['pc', 'imem', 'control', 'regs', 'imm', 'alu', 'dmem', 'wb'];

export interface Bus {
  from: string;
  to: string;
  kind: 'pc' | 'data' | 'control';
}

export const BUSES: Bus[] = [
  { from: 'pc',      to: 'imem',    kind: 'pc'      },
  { from: 'imem',    to: 'regs',    kind: 'data'    },
  { from: 'imem',    to: 'control', kind: 'control' },
  { from: 'imem',    to: 'imm',     kind: 'data'    },
  { from: 'regs',    to: 'alu',     kind: 'data'    },
  { from: 'imm',     to: 'alu',     kind: 'data'    },
  { from: 'control', to: 'alu',     kind: 'control' },
  { from: 'regs',    to: 'dmem',    kind: 'data'    },
  { from: 'alu',     to: 'dmem',    kind: 'data'    },
  { from: 'alu',     to: 'wb',      kind: 'data'    },
  { from: 'dmem',    to: 'wb',      kind: 'data'    },
  { from: 'wb',      to: 'regs',    kind: 'data'    },
];

export const busId = (b: Bus) => `${b.from}-${b.to}`;

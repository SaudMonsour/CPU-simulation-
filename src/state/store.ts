import { create } from 'zustand';
import { CPU } from '../engine/cpu';
import type { Snapshot, Signals, Flags } from '../engine/types';
import { decode } from '../isa/decode';
import { assemble, AsmError } from '../isa/assembler';
import { EXAMPLES } from '../programs/examples';

// The engine instance lives outside React. The store holds the latest
// snapshot plus UI state; components re-render off the snapshot.
const cpu = new CPU();

const blankSignals = (): Signals => ({
  regWrite: false, aluSrc: false, memRead: false, memWrite: false,
  memToReg: false, branch: false, jump: false, taken: false,
});
const blankFlags = (): Flags => ({ zero: false, sign: false, carry: false, overflow: false });

// A pre-execution view: the instruction the PC currently points at, with the
// register file as it stands. Used right after loading, before the first step.
function preview(): Snapshot {
  const word = (cpu.pc >> 2) < cpu.imem.length ? cpu.imem[cpu.pc >> 2] >>> 0 : 0;
  return {
    cycle: cpu.cycle, pc: cpu.pc, next: (cpu.pc + 4) >>> 0,
    decoded: decode(word),
    rs1v: 0, rs2v: 0, aluA: 0, aluB: 0, aluResult: 0,
    flags: blankFlags(), signals: blankSignals(),
    mem: null, wrote: null,
    regs: Int32Array.from(cpu.regs), halted: cpu.halted,
  };
}

interface SimState {
  source: string;
  error: string | null;
  snapshot: Snapshot;
  running: boolean;
  speedHz: number;
  retired: number;       // instructions retired since load
  selected: string | null;
  memBase: number;       // base address shown in the memory panel

  setSource: (s: string) => void;
  load: () => void;
  step: () => void;
  reset: () => void;
  setRunning: (r: boolean) => void;
  setSpeed: (hz: number) => void;
  select: (id: string | null) => void;
}

export const useSim = create<SimState>((set, get) => ({
  source: EXAMPLES[0].source,
  error: null,
  snapshot: preview(),
  running: false,
  speedHz: 2,
  retired: 0,
  selected: null,
  memBase: 0,

  setSource: (s) => set({ source: s }),

  load: () => {
    try {
      const { words } = assemble(get().source);
      cpu.load(words);
      set({ error: null, snapshot: preview(), retired: 0, running: false, memBase: 0 });
    } catch (e) {
      const msg = e instanceof AsmError ? e.message : (e as Error).message;
      set({ error: msg, running: false });
    }
  },

  step: () => {
    if (cpu.halted) { set({ running: false }); return; }
    const snap = cpu.step();
    const memBase = snap.mem ? (snap.mem.addr & ~0x3f) : get().memBase;
    set((s) => ({ snapshot: snap, retired: s.retired + 1, memBase, running: snap.halted ? false : s.running }));
  },

  reset: () => {
    cpu.reset();
    set({ snapshot: preview(), retired: 0, running: false, selected: null, memBase: 0, error: null });
  },

  setRunning: (r) => set({ running: r && !cpu.halted }),
  setSpeed: (hz) => set({ speedHz: hz }),
  select: (id) => set({ selected: id }),
}));

// Helper for the memory panel; reads straight from the live engine.
export function readMemWindow(base: number, count: number) {
  return cpu.memWindow(base, count);
}

# RV32I visual datapath

An interactive 3D view of a RISC-V RV32I core. You write assembly, the engine
assembles and executes it one instruction at a time, and the 3D scene shows the
data moving through the datapath while panels show the registers, memory, and
the decoded instruction down to its bit fields.

The engine is a plain TypeScript module with no idea that React or three.js
exist. It executes instructions and hands back a snapshot of the whole machine;
the renderer only ever draws snapshots. That split is the point — it keeps the
simulation testable and keeps timing logic out of the view code.

## Running it

    npm install
    npm run dev        # http://localhost:5173
    npm test           # engine + assembler tests (vitest)
    npm run build      # typecheck (strict) + production build

This is a Vite app, not a single HTML file — it needs `npm run dev` (or a build)
to run; it won't render if you just open a file. To deploy, `npm run build` and
serve the `dist/` folder anywhere static.

## How it's laid out

    src/engine/    pure simulation: ALU, CPU, snapshot types
    src/isa/       instruction encodings, assembler, decoder
    src/state/     zustand store wrapping the engine + clock controls
    src/scene/     react-three-fiber scene, datapath blocks, buses, pulses
    src/ui/        editor, controls, register/memory/instruction/inspect panels, glossary
    src/programs/  preloaded example programs

The dependency arrow only ever points one way: `scene` and `ui` read from
`state`, `state` drives `engine`, and `engine` depends on nothing but `isa`.

## What's implemented

- **RV32I integer subset**, executed correctly: add/sub/and/or/xor, the shifts
  (sll/srl/sra and their immediate forms), slt/sltu, the I-type arithmetic,
  loads and stores (lb/lbu/lh/lhu/lw, sb/sh/sw), branches (beq/bne/blt/bge and
  the unsigned pair), jal/jalr, and lui/auipc.
- **An assembler** with labels and the common pseudo-instructions (nop, mv, li,
  j, jr, ret, beqz, bnez), with errors reported by line number.
- **A decoder** that recovers the format, fields, and sign-extended immediate
  from any word, and reconstructs the assembly text.
- **A real ALU**, not `(a + b) | 0`: addition is an explicit ripple-carry chain
  so the carry into the MSB is available, which is how overflow is detected.
  Subtraction is `a + (~b) + 1`.
- **3D datapath** with the PC, instruction memory, control, register file,
  immediate generator, ALU, data memory, and write-back mux as separate blocks,
  with buses between them. The blocks and buses that are active for the current
  instruction light up, and pulses travel along the active data/control buses.
- **Clock controls**: assemble & load, single-step, run/pause, and a speed
  slider, with live cycle and instruction counters.
- **State panels**: the 32 registers (with the written and read ones marked and
  x0 shown as hard-wired zero), a data-memory window that follows the most
  recent access, and the current instruction shown as assembly / hex / binary
  with the per-format bit-field breakdown.
- **Click-to-inspect** on every block (description + "talk like an expert" note
  + the values it's handling this cycle) and a **glossary** of the terminology.
- **Tests** (vitest) covering the adder and its flags, two's-complement
  subtraction, the shift/compare distinctions, x0 staying zero, sign-extended
  byte loads, memory round-trips, the sum-1..N and array-traversal loops, jal
  linking, and assembler/decoder round-trips against known RV32I encodings.

## Not done yet

This is the single-cycle core and its 3D view. The larger machine described in
the spec is built on top of this, in the order the spec lays out, and isn't here
yet. Being blunt about it rather than implying otherwise:

- **The 5-stage pipeline.** Right now each instruction executes in one step, so
  the IF/ID/EX/MEM/WB stages and the pipeline registers between them aren't
  modeled. The datapath diagram therefore shows *single-cycle activity*, not
  stage occupancy.
- **Hazards.** No forwarding/bypass network, no load-use stall, no branch flush,
  because those only exist once there's a pipeline to have them.
- **Branch prediction.** No predictor or misprediction penalty yet.
- **The cache hierarchy.** Data memory is a flat array. There's no L1/L2/L3, no
  tag/index/offset decomposition, no associativity, no LRU/FIFO/Random, no
  write-through/write-back or dirty bits, and no AMAT — this is the biggest
  remaining piece.
- **MESI / multicore.** Single core only.
- **Extra ALU views.** No carry-lookahead-vs-ripple comparison animation, no
  Booth multiplier, no IEEE-754 FPU.
- **The pipeline timeline chart, camera presets, and narration mode.**

Because it's single-cycle, **CPI is 1 by construction** and the counter says so.
CPI only becomes meaningful once the pipeline and its stalls exist.

## Accuracy notes

- Memory is byte-addressable, little-endian, 64 KiB, with no access latency.
  Instruction and data memory are conceptually separate (which is what avoids
  the classic structural hazard) but both are plain arrays here.
- The stack pointer (x2) is initialised near the top of memory so stack-style
  code has somewhere to go; nothing else is special.
- The immediate shown in the instruction panel is the sign-extended value the
  datapath actually uses; for U-type that's the value already placed in the
  upper 20 bits.

## Next step

The natural continuation is milestone 2 from the spec: add the pipeline and its
registers to the engine, then hazard detection, forwarding, stalls, and branch
handling, with tests for each — all reusing the ISA logic that's already here
and verified. The cache subsystem (milestone 3) follows the same pattern.

const TERMS: [string, string][] = [
  ['Datapath', 'The hardware that carries and operates on data: register file, ALU, muxes, buses, and memory ports.'],
  ['Control unit', 'Logic that decodes an instruction into the select/enable signals steering the datapath.'],
  ['Register file', 'A small, fast bank of registers with multiple read ports and a write port; x0 is hard-wired to zero.'],
  ['Immediate', 'A constant encoded inside the instruction; sign-extended to 32 bits before use (except U-type).'],
  ['Two\u2019s complement', 'Signed integer encoding where negation is bitwise-NOT plus one; addition handles signed and unsigned alike.'],
  ['Ripple-carry adder', 'Full-adders chained so each carry feeds the next bit; simple but its delay grows linearly with width.'],
  ['Carry-lookahead adder', 'An adder that computes carries in parallel from generate/propagate signals, shortening the critical path.'],
  ['Overflow', 'For signed addition, detected when the carry into the MSB differs from the carry out of it.'],
  ['ALU', 'Arithmetic-logic unit: performs add/sub, logic, shifts, and comparisons, and produces status flags.'],
  ['Effective address', 'base register + sign-extended offset, computed by the ALU for a load or store.'],
  ['Pipeline', 'Overlapping instruction execution across stages (IF/ID/EX/MEM/WB) so a new instruction can start each cycle.'],
  ['Pipeline register', 'A latch between two stages that captures all values an instruction carries forward, on the clock edge.'],
  ['Data hazard', 'A later instruction needs a result a not-yet-finished earlier instruction will produce (a RAW dependency).'],
  ['Forwarding', 'Routing a result straight from a later stage back to the ALU input, avoiding a stall (the bypass network).'],
  ['Load-use hazard', 'A use of a loaded value one cycle too early; forwarding cannot help, so a one-cycle stall is inserted.'],
  ['Stall / bubble', 'A cycle where the pipeline holds an instruction back and injects a no-op to wait for a dependency.'],
  ['Control hazard', 'Uncertainty about the next PC after a branch; mispredicted fetches must be flushed.'],
  ['Branch predictor', 'Hardware that guesses branch direction/target early; a 2-bit predictor tolerates one wrong outcome before flipping.'],
  ['Structural hazard', 'Two instructions need the same hardware resource in the same cycle; split I/D caches avoid the classic one.'],
  ['CPI', 'Cycles per instruction. A single-cycle machine is 1 by definition; pipelining lowers it toward 1 minus hazard penalties.'],
  ['Critical path', 'The slowest combinational path between latches; it sets the minimum clock period and thus the max frequency.'],
  ['Cache line / block', 'The unit a cache moves at once (several words), exploiting spatial locality.'],
  ['Tag / index / offset', 'Address split a cache uses: index picks the set, tag confirms identity, offset picks the byte in the block.'],
  ['Set-associative', 'A cache where each index holds N lines (ways); a line may go in any way of its set.'],
  ['Hit rate / AMAT', 'Fraction of accesses served by the cache; average memory access time = hit time + miss rate \u00d7 miss penalty.'],
  ['Replacement policy', 'Which line to evict on a miss in a full set: LRU, FIFO, or Random.'],
  ['Write-back / dirty bit', 'A policy that writes a modified line to the lower level only on eviction; the dirty bit marks it modified.'],
  ['MESI', 'A coherence protocol; each cached line is Modified, Exclusive, Shared, or Invalid, kept consistent by bus snooping.'],
];

export function Glossary({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Glossary</h2>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <dl className="glossary">
          {TERMS.map(([t, d]) => (
            <div key={t} className="gloss-row">
              <dt>{t}</dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

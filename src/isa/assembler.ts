import { ISA, encode, parseReg } from './encodings';

export class AsmError extends Error {
  constructor(public line: number, message: string) {
    super(`line ${line}: ${message}`);
    this.name = 'AsmError';
  }
}

interface RawLine {
  line: number;
  label?: string;
  op?: string;
  args: string[];
}

// An instruction after pseudo-expansion, before label resolution.
interface Pending {
  line: number;
  addr: number;
  op: string;
  args: string[];
}

const stripComment = (s: string) => {
  const h = s.indexOf('#');
  const h2 = s.indexOf(';');
  let cut = s.length;
  if (h >= 0) cut = Math.min(cut, h);
  if (h2 >= 0) cut = Math.min(cut, h2);
  return s.slice(0, cut);
};

function tokenizeLine(text: string, line: number): RawLine {
  let s = stripComment(text).trim();
  const out: RawLine = { line, args: [] };
  if (!s) return out;

  const colon = s.indexOf(':');
  if (colon >= 0) {
    out.label = s.slice(0, colon).trim();
    s = s.slice(colon + 1).trim();
    if (!s) return out;
  }

  const sp = s.search(/\s/);
  if (sp < 0) {
    out.op = s.toLowerCase();
    return out;
  }
  out.op = s.slice(0, sp).toLowerCase();
  out.args = s.slice(sp + 1).split(',').map((a) => a.trim()).filter(Boolean);
  return out;
}

function parseNum(tok: string, line: number): number {
  const t = tok.trim();
  let v: number;
  if (/^[-+]?0x[0-9a-f]+$/i.test(t)) v = parseInt(t, 16);
  else if (/^[-+]?\d+$/.test(t)) v = parseInt(t, 10);
  else throw new AsmError(line, `expected a number, got "${tok}"`);
  return v | 0;
}

// "offset(reg)" used by loads and stores
function parseMem(tok: string, line: number): { imm: number; reg: number } {
  const m = /^([-+]?(?:0x[0-9a-f]+|\d+))\s*\(\s*(\w+)\s*\)$/i.exec(tok.trim());
  if (!m) throw new AsmError(line, `expected offset(reg), got "${tok}"`);
  return { imm: parseNum(m[1], line), reg: parseReg(m[2]) };
}

const PSEUDO = new Set(['nop', 'mv', 'li', 'j', 'jr', 'ret', 'beqz', 'bnez', 'la']);

// Turn one source line into one or more concrete instructions. li may expand
// to lui+addi for values that don't fit a 12-bit signed immediate.
function expand(r: RawLine): { op: string; args: string[] }[] {
  if (!r.op) return [];
  switch (r.op) {
    case 'nop': return [{ op: 'addi', args: ['x0', 'x0', '0'] }];
    case 'mv': return [{ op: 'addi', args: [r.args[0], r.args[1], '0'] }];
    case 'j': return [{ op: 'jal', args: ['x0', r.args[0]] }];
    case 'jr': return [{ op: 'jalr', args: ['x0', `0(${r.args[0]})`] }];
    case 'ret': return [{ op: 'jalr', args: ['x0', '0(ra)'] }];
    case 'beqz': return [{ op: 'beq', args: [r.args[0], 'x0', r.args[1]] }];
    case 'bnez': return [{ op: 'bne', args: [r.args[0], 'x0', r.args[1]] }];
    case 'li': {
      const v = parseNum(r.args[1], r.line) | 0;
      if (v >= -2048 && v <= 2047) {
        return [{ op: 'addi', args: [r.args[0], 'x0', String(v)] }];
      }
      // upper = v rounded so the signed lower 12 bits add back correctly
      const lo = ((v & 0xfff) << 20) >> 20; // sign-extended low 12
      const hi = ((v - lo) >> 12) & 0xfffff;
      return [
        { op: 'lui', args: [r.args[0], String(hi)] },
        { op: 'addi', args: [r.args[0], r.args[0], String(lo)] },
      ];
    }
    default:
      return [{ op: r.op, args: r.args }];
  }
}

export interface AsmResult {
  words: number[];
  // address (byte) -> source line, for the UI to map PC back to text
  lineByAddr: Map<number, number>;
}

export function assemble(source: string): AsmResult {
  const rawLines = source.split('\n').map((t, i) => tokenizeLine(t, i + 1));

  // Pass 1: expand pseudos, assign addresses, collect labels.
  const labels = new Map<string, number>();
  const pending: Pending[] = [];
  let addr = 0;

  for (const r of rawLines) {
    if (r.label) {
      if (labels.has(r.label)) throw new AsmError(r.line, `duplicate label "${r.label}"`);
      labels.set(r.label, addr);
    }
    if (!r.op) continue;
    if (!PSEUDO.has(r.op) && !(r.op in ISA)) {
      throw new AsmError(r.line, `unknown instruction "${r.op}"`);
    }
    for (const e of expand(r)) {
      pending.push({ line: r.line, addr, op: e.op, args: e.args });
      addr += 4;
    }
  }

  // Pass 2: encode, resolving label references for branches and jumps.
  const words: number[] = [];
  const lineByAddr = new Map<number, number>();

  const need = (args: string[], n: number, line: number) => {
    if (args.length !== n) throw new AsmError(line, `expected ${n} operands, got ${args.length}`);
  };
  const branchTarget = (tok: string, here: number, line: number): number => {
    if (labels.has(tok)) return labels.get(tok)! - here;
    return parseNum(tok, line); // allow a raw byte offset too
  };

  for (const p of pending) {
    const def = ISA[p.op];
    if (!def) throw new AsmError(p.line, `unknown instruction "${p.op}"`);
    let word = 0;

    try {
      switch (def.fmt) {
        case 'R': {
          need(p.args, 3, p.line);
          word = encode(def, {
            rd: parseReg(p.args[0]), rs1: parseReg(p.args[1]), rs2: parseReg(p.args[2]),
          });
          break;
        }
        case 'I': {
          if (def.opcode === 0x03 || def.opcode === 0x67) {
            // loads + jalr use offset(reg) form
            need(p.args, 2, p.line);
            const m = parseMem(p.args[1], p.line);
            word = encode(def, { rd: parseReg(p.args[0]), rs1: m.reg, imm: m.imm });
          } else if (def.funct7 !== undefined) {
            // shift-immediate
            need(p.args, 3, p.line);
            word = encode(def, {
              rd: parseReg(p.args[0]), rs1: parseReg(p.args[1]),
              shamt: parseNum(p.args[2], p.line) & 0x1f,
            });
          } else {
            need(p.args, 3, p.line);
            word = encode(def, {
              rd: parseReg(p.args[0]), rs1: parseReg(p.args[1]),
              imm: parseNum(p.args[2], p.line),
            });
          }
          break;
        }
        case 'S': {
          need(p.args, 2, p.line);
          const m = parseMem(p.args[1], p.line);
          word = encode(def, { rs2: parseReg(p.args[0]), rs1: m.reg, imm: m.imm });
          break;
        }
        case 'B': {
          need(p.args, 3, p.line);
          word = encode(def, {
            rs1: parseReg(p.args[0]), rs2: parseReg(p.args[1]),
            imm: branchTarget(p.args[2], p.addr, p.line),
          });
          break;
        }
        case 'U': {
          need(p.args, 2, p.line);
          word = encode(def, { rd: parseReg(p.args[0]), imm: parseNum(p.args[1], p.line) });
          break;
        }
        case 'J': {
          need(p.args, 2, p.line);
          word = encode(def, {
            rd: parseReg(p.args[0]),
            imm: branchTarget(p.args[1], p.addr, p.line),
          });
          break;
        }
      }
    } catch (e) {
      if (e instanceof AsmError) throw e;
      throw new AsmError(p.line, (e as Error).message);
    }

    lineByAddr.set(p.addr, p.line);
    words.push(word >>> 0);
  }

  return { words, lineByAddr };
}

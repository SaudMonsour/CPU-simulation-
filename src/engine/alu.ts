import type { Flags } from '../engine/types';

export interface AddResult {
  sum: number;       // Int32
  carryOut: number;  // carry out of bit 31
  carryIn31: number; // carry into bit 31 (needed for signed overflow)
}

// 32-bit addition done one bit at a time, the way a chained array of
// full-adders works in hardware. We keep this explicit (rather than just
// `(a + b) | 0`) because the visualization walks the carry across the bits,
// and because overflow detection needs the carry going *into* the MSB.
export function rippleAdd(a: number, b: number, cin = 0): AddResult {
  let carry = cin & 1;
  let sum = 0;
  let carryIn31 = 0;

  for (let i = 0; i < 32; i++) {
    const ai = (a >>> i) & 1;
    const bi = (b >>> i) & 1;
    const s = ai ^ bi ^ carry;
    const cout = (ai & bi) | (ai & carry) | (bi & carry);
    if (i === 31) carryIn31 = carry;
    sum = (sum | (s << i)) >>> 0;
    carry = cout;
  }

  return { sum: sum | 0, carryOut: carry, carryIn31 };
}

export type AluOp =
  | 'add' | 'sub'
  | 'and' | 'or' | 'xor'
  | 'sll' | 'srl' | 'sra'
  | 'slt' | 'sltu'
  | 'passb';

export interface AluResult extends Flags {
  value: number;
}

export function alu(op: AluOp, a: number, b: number): AluResult {
  let value = 0;
  let carry = false;
  let overflow = false;

  switch (op) {
    case 'add': {
      const r = rippleAdd(a, b, 0);
      value = r.sum;
      carry = r.carryOut === 1;
      // signed overflow iff the carry into the MSB differs from the carry out
      overflow = (r.carryIn31 ^ r.carryOut) === 1;
      break;
    }
    case 'sub': {
      // a - b == a + (~b) + 1
      const r = rippleAdd(a, ~b >>> 0, 1);
      value = r.sum;
      carry = r.carryOut === 1;
      overflow = (r.carryIn31 ^ r.carryOut) === 1;
      break;
    }
    case 'and': value = (a & b) | 0; break;
    case 'or':  value = (a | b) | 0; break;
    case 'xor': value = (a ^ b) | 0; break;
    case 'sll': value = (a << (b & 31)) | 0; break;
    case 'srl': value = (a >>> (b & 31)) | 0; break;
    case 'sra': value = (a >> (b & 31)) | 0; break;        // arithmetic, keeps sign
    case 'slt': value = (a | 0) < (b | 0) ? 1 : 0; break;  // signed
    case 'sltu': value = (a >>> 0) < (b >>> 0) ? 1 : 0; break;
    case 'passb': value = b | 0; break;
  }

  return {
    value: value | 0,
    zero: (value | 0) === 0,
    sign: ((value >>> 31) & 1) === 1,
    carry,
    overflow,
  };
}

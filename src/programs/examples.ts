export interface Example {
  id: string;
  name: string;
  blurb: string;
  source: string;
}

export const EXAMPLES: Example[] = [
  {
    id: 'sum',
    name: 'Sum 1..N',
    blurb: 'A counting loop. Exercises the ALU and a backward-taken branch.',
    source: `# x10 = sum, x11 = i; loop while i < 11
    addi x10, x0, 0
    addi x11, x0, 1
loop:
    add  x10, x10, x11
    addi x11, x11, 1
    addi x12, x0, 11
    blt  x11, x12, loop
`,
  },
  {
    id: 'twos',
    name: "Two's complement",
    blurb: 'Negative immediates, subtraction as add-of-negation, and a shift.',
    source: `    addi x1, x0, -1      # 0xffffffff
    addi x2, x0, 8
    sub  x3, x2, x1      # 8 - (-1) = 9
    srai x4, x1, 1       # arithmetic shift keeps the sign
    srli x5, x1, 28      # logical shift does not
`,
  },
  {
    id: 'branch',
    name: 'Branch + jump',
    blurb: 'A taken forward branch and a jal that links a return address.',
    source: `    addi x1, x0, 5
    addi x2, x0, 5
    beq  x1, x2, equal
    addi x3, x0, 111    # skipped when equal
equal:
    jal  x1, done
    addi x4, x0, 222    # skipped by the jump
done:
    addi x5, x0, 7
`,
  },
  {
    id: 'array',
    name: 'Array traversal',
    blurb: 'Stores four words then walks them with lw — the memory access pattern a cache feeds on.',
    source: `    addi x2, x0, 200    # base address
    addi x1, x0, 10
    sw   x1, 0(x2)
    addi x1, x0, 20
    sw   x1, 4(x2)
    addi x1, x0, 30
    sw   x1, 8(x2)
    addi x1, x0, 40
    sw   x1, 12(x2)

    addi x10, x0, 0     # sum
    addi x11, x0, 0     # byte offset
    addi x12, x0, 16
loop:
    add  x13, x2, x11
    lw   x14, 0(x13)
    add  x10, x10, x14
    addi x11, x11, 4
    blt  x11, x12, loop
`,
  },
];

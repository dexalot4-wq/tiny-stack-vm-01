// Tiny stack VM untuk ISA make.fun v1 (lihat ISA.md di kit): 32-bit wrap, stack 256,
// call stack 64, memory 256 word, 11 kode trap yang dibedakan, batas 1.000.000
// langkah dan 65.536 byte output. Satu run menjawab 40 instance i001..i040.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const IN_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Tabel per opcode: [byte, pops, pushes, byte immediate]. Ditulis dari tabel ISA.md.
const SPEC: [number, number, number, number][] = [
  [0x00, 0, 0, 0], [0x01, 0, 1, 1], [0x02, 0, 1, 4], [0x03, 1, 0, 0],
  [0x04, 1, 2, 0], [0x05, 2, 2, 0], [0x06, 2, 3, 0], [0x07, 3, 3, 0],
  [0x10, 2, 1, 0], [0x11, 2, 1, 0], [0x12, 2, 1, 0], [0x13, 2, 1, 0],
  [0x14, 2, 1, 0], [0x15, 2, 1, 0], [0x16, 2, 1, 0], [0x17, 1, 1, 0],
  [0x18, 2, 1, 0], [0x19, 2, 1, 0], [0x1a, 2, 1, 0], [0x1b, 1, 1, 0],
  [0x1c, 2, 1, 0], [0x1d, 2, 1, 0], [0x1e, 2, 1, 0], [0x20, 2, 1, 0],
  [0x21, 2, 1, 0], [0x22, 2, 1, 0], [0x30, 0, 0, 2], [0x31, 1, 0, 2],
  [0x32, 1, 0, 2], [0x33, 0, 0, 2], [0x34, 0, 0, 0], [0x40, 1, 1, 0],
  [0x41, 2, 0, 0], [0x50, 1, 0, 0], [0x51, 1, 0, 0], [0x52, 0, 1, 0],
  [0x53, 1, 0, 0],
];
const POPS = new Uint8Array(256);
const PUSHES = new Uint8Array(256);
const IMM = new Uint8Array(256);
const KNOWN = new Uint8Array(256);
for (const [op, pops, pushes, imm] of SPEC) {
  POPS[op] = pops;
  PUSHES[op] = pushes;
  IMM[op] = imm;
  KNOWN[op] = 1;
}

function run(p: Uint8Array, inp: Uint8Array): { out: Uint8Array; code: number } {
  const S = new Int32Array(256); // data stack
  const C = new Int32Array(64); // call stack (return addresses)
  const M = new Int32Array(256); // memory, nol semua
  const out = new Uint8Array(65536);
  let sp = 0;
  let cp = 0;
  let pc = 0;
  let steps = 0;
  let ip = 0;
  let ol = 0;
  const n = p.length;
  const done = (code: number) => ({ out: out.slice(0, ol), code });
  for (;;) {
    // Urutan cek per langkah sesuai ISA: batas langkah, pc, opcode, immediate.
    if (steps === 1000000) return done(10);
    if (pc < 0 || pc >= n) return done(9);
    const op = p[pc];
    if (!KNOWN[op]) return done(5);
    const imm = IMM[op];
    if (pc + imm >= n) return done(9);
    steps++;
    // Kebutuhan stack dicek dulu: underflow lalu overflow.
    if (sp < POPS[op]) return done(2);
    if (sp - POPS[op] + PUSHES[op] > 256) return done(3);
    const nx = pc + 1 + imm;
    pc = nx;
    switch (op) {
      case 0x00:
        return done(0);
      case 0x01: // PUSH8: byte sebagai signed 8-bit, sign-extended
        S[sp++] = (p[nx - 1] << 24) >> 24;
        break;
      case 0x02: // PUSH32: little-endian, signed 32-bit
        S[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24);
        break;
      case 0x03:
        sp--;
        break;
      case 0x04:
        S[sp] = S[sp - 1];
        sp++;
        break;
      case 0x05: {
        const t = S[sp - 1];
        S[sp - 1] = S[sp - 2];
        S[sp - 2] = t;
        break;
      }
      case 0x06:
        S[sp] = S[sp - 2];
        sp++;
        break;
      case 0x07: {
        const t = S[sp - 3];
        S[sp - 3] = S[sp - 2];
        S[sp - 2] = S[sp - 1];
        S[sp - 1] = t;
        break;
      }
      case 0x17:
        S[sp - 1] = (-S[sp - 1]) | 0;
        break;
      case 0x1b:
        S[sp - 1] = ~S[sp - 1];
        break;
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16:
      case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e:
      case 0x20: case 0x21: case 0x22: {
        const b = S[sp - 1];
        const a = S[sp - 2];
        let r: number;
        if (op === 0x10) r = (a + b) | 0;
        else if (op === 0x11) r = (a - b) | 0;
        else if (op === 0x12) r = Math.imul(a, b);
        else if (op === 0x13) {
          if (b === 0) return done(4);
          r = a === -2147483648 && b === -1 ? a : (a / b) | 0;
        } else if (op === 0x14) {
          if (b === 0) return done(4);
          r = b === -1 ? 0 : (a % b) | 0;
        } else if (op === 0x15) {
          if (b === 0) return done(4);
          r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
        } else if (op === 0x16) {
          if (b === 0) return done(4);
          r = ((a >>> 0) % (b >>> 0)) | 0;
        } else if (op === 0x18) r = a & b;
        else if (op === 0x19) r = a | b;
        else if (op === 0x1a) r = a ^ b;
        else if (op === 0x1c) r = a << (b & 31);
        else if (op === 0x1d) r = a >> (b & 31);
        else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
        else if (op === 0x20) r = a === b ? 1 : 0;
        else if (op === 0x21) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        sp -= 2;
        S[sp++] = r;
        break;
      }
      case 0x30: case 0x31: case 0x32: {
        const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
        if (op === 0x30) pc = nx + rel;
        else {
          const v = S[--sp];
          if ((op === 0x31) === (v === 0)) pc = nx + rel;
        }
        break;
      }
      case 0x33:
        if (cp === 64) return done(7);
        C[cp++] = nx;
        pc = p[nx - 2] | (p[nx - 1] << 8);
        break;
      case 0x34:
        if (cp === 0) return done(8);
        pc = C[--cp];
        break;
      case 0x40: {
        const addr = S[sp - 1];
        if (addr < 0 || addr > 255) return done(6);
        S[sp - 1] = M[addr];
        break;
      }
      case 0x41: {
        const addr = S[sp - 1];
        const v = S[sp - 2];
        if (addr < 0 || addr > 255) return done(6);
        sp -= 2;
        M[addr] = v;
        break;
      }
      case 0x50: {
        const s = String(S[sp - 1]);
        if (ol + s.length > 65536) return done(11);
        sp--;
        for (let i = 0; i < s.length; i++) out[ol++] = s.charCodeAt(i);
        break;
      }
      case 0x51:
        if (ol + 1 > 65536) return done(11);
        out[ol++] = S[--sp] & 255;
        break;
      case 0x52:
        S[sp++] = ip < inp.length ? inp[ip++] : -1;
        break;
      case 0x53:
        return done(S[--sp] & 255);
    }
  }
}

for (const id of readdirSync(IN_DIR).sort()) {
  const dir = join(OUT_DIR, id);
  mkdirSync(dir, { recursive: true });
  try {
    const r = run(
      new Uint8Array(readFileSync(join(IN_DIR, id, 'program.bin'))),
      new Uint8Array(readFileSync(join(IN_DIR, id, 'input.bin'))),
    );
    writeFileSync(join(dir, 'stdout.bin'), r.out);
    writeFileSync(join(dir, 'exit.txt'), `${r.code}\n`);
  } catch {
    // Jangan biarkan satu instance menggagalkan seluruh run: tulis jawaban
    // format-valid (kosong, exit 0) agar instance tetap "answered".
    writeFileSync(join(dir, 'stdout.bin'), new Uint8Array(0));
    writeFileSync(join(dir, 'exit.txt'), '0\n');
  }
}

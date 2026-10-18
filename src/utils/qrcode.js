/**
 * Minimal, dependency free QR code encoder (byte mode only).
 * Based on the algorithm described in ISO/IEC 18004 and the reference
 * implementation approach by Project Nayuki.
 */

/** @typedef {"L" | "M" | "Q" | "H"} ErrorCorrectionLevel */

/** @type {{[key in ErrorCorrectionLevel]: {ordinal: number, formatBits: number}}} */
const ECL = {
  L: { ordinal: 0, formatBits: 1 },
  M: { ordinal: 1, formatBits: 0 },
  Q: { ordinal: 2, formatBits: 3 },
  H: { ordinal: 3, formatBits: 2 },
};

// prettier-ignore
const ECC_CODEWORDS_PER_BLOCK = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];

// prettier-ignore
const NUM_ERROR_CORRECTION_BLOCKS = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

/**
 * Encode text into a QR code matrix. true = dark module.
 * @type {(text: string, ecl?: ErrorCorrectionLevel) => boolean[][]}
 */
export function encodeQr(text, ecl = "M") {
  const data = Array.from(new TextEncoder().encode(text));
  const level = ECL[ecl];

  // Find the smallest version that fits the data
  let version = 1;
  let dataCapacityBits = 0;
  for (; ; version++) {
    if (version > 40) {
      throw new Error("Data too long for a QR code");
    }
    dataCapacityBits = getNumDataCodewords(version, level.ordinal) * 8;
    const countBits = version <= 9 ? 8 : 16;
    if (4 + countBits + data.length * 8 <= dataCapacityBits) {
      break;
    }
  }

  // Build the bit stream
  /** @type {number[]} */
  const bits = [];
  appendBits(bits, 0b0100, 4); // byte mode
  appendBits(bits, data.length, version <= 9 ? 8 : 16);
  data.forEach((b) => appendBits(bits, b, 8));
  appendBits(bits, 0, Math.min(4, dataCapacityBits - bits.length)); // terminator
  appendBits(bits, 0, (8 - (bits.length % 8)) % 8); // byte align
  for (let pad = 0xec; bits.length < dataCapacityBits; pad ^= 0xec ^ 0x11) {
    appendBits(bits, pad, 8);
  }

  /** @type {number[]} */
  const dataCodewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | bits[i + j];
    }
    dataCodewords.push(byte);
  }

  const codewords = addEccAndInterleave(dataCodewords, version, level.ordinal);
  const qr = new QrMatrix(version);
  qr.drawFunctionPatterns(level.formatBits);
  qr.drawCodewords(codewords);

  // Pick the mask with the lowest penalty
  let bestMask = 0;
  let minPenalty = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    qr.applyMask(mask);
    qr.drawFormatBits(level.formatBits, mask);
    const penalty = qr.getPenaltyScore();
    if (penalty < minPenalty) {
      bestMask = mask;
      minPenalty = penalty;
    }
    qr.applyMask(mask); // XOR again to undo
  }
  qr.applyMask(bestMask);
  qr.drawFormatBits(level.formatBits, bestMask);
  return qr.modules;
}

/**
 * Render a QR matrix to terminal lines using half block characters.
 * Light modules are drawn with the foreground color, dark modules are left as
 * background, so render with a light foreground on a dark background.
 * @type {(modules: boolean[][], quietZone?: number) => string[]}
 */
export function qrToLines(modules, quietZone = 2) {
  const size = modules.length;
  /** @type {(x: number, y: number) => boolean} */
  const isLight = (x, y) => {
    if (x < 0 || y < 0 || x >= size || y >= size) {
      return true;
    }
    return !modules[y][x];
  };
  const lines = [];
  for (let y = -quietZone; y < size + quietZone; y += 2) {
    let line = "";
    for (let x = -quietZone; x < size + quietZone; x++) {
      const top = isLight(x, y);
      const bottom = y + 1 < size + quietZone ? isLight(x, y + 1) : false;
      line += top && bottom ? "█" : top ? "▀" : bottom ? "▄" : " ";
    }
    lines.push(line);
  }
  return lines;
}

/** @type {(bits: number[], value: number, length: number) => void} */
function appendBits(bits, value, length) {
  for (let i = length - 1; i >= 0; i--) {
    bits.push((value >>> i) & 1);
  }
}

/** @type {(version: number) => number} */
function getNumRawDataModules(version) {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) {
      result -= 36;
    }
  }
  return result;
}

/** @type {(version: number, ecl: number) => number} */
function getNumDataCodewords(version, ecl) {
  return (
    Math.floor(getNumRawDataModules(version) / 8) -
    ECC_CODEWORDS_PER_BLOCK[ecl][version] *
      NUM_ERROR_CORRECTION_BLOCKS[ecl][version]
  );
}

/** @type {(data: number[], version: number, ecl: number) => number[]} */
function addEccAndInterleave(data, version, ecl) {
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecl][version];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecl][version];
  const rawCodewords = Math.floor(getNumRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  const divisor = reedSolomonComputeDivisor(blockEccLen);
  /** @type {number[][]} */
  const blocks = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(
      k,
      k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1),
    );
    k += dat.length;
    const ecc = reedSolomonComputeRemainder(dat, divisor);
    if (i < numShortBlocks) {
      dat.push(0); // padding, skipped during interleave
    }
    blocks.push(dat.concat(ecc));
  }

  /** @type {number[]} */
  const result = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) {
        result.push(block[i]);
      }
    });
  }
  return result;
}

/** @type {(degree: number) => number[]} */
function reedSolomonComputeDivisor(degree) {
  /** @type {number[]} */
  const result = new Array(degree - 1).fill(0);
  result.push(1);
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = reedSolomonMultiply(result[j], root);
      if (j + 1 < result.length) {
        result[j] ^= result[j + 1];
      }
    }
    root = reedSolomonMultiply(root, 0x02);
  }
  return result;
}

/** @type {(data: number[], divisor: number[]) => number[]} */
function reedSolomonComputeRemainder(data, divisor) {
  const result = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ /** @type {number} */ (result.shift());
    result.push(0);
    divisor.forEach((coef, i) => {
      result[i] ^= reedSolomonMultiply(coef, factor);
    });
  }
  return result;
}

/** @type {(x: number, y: number) => number} */
function reedSolomonMultiply(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

/** @type {(x: number, i: number) => boolean} */
function getBit(x, i) {
  return ((x >>> i) & 1) !== 0;
}

class QrMatrix {
  /** @param {number} version */
  constructor(version) {
    this.version = version;
    this.size = version * 4 + 17;
    /** @type {boolean[][]} */
    this.modules = [];
    /** @type {boolean[][]} */
    this.isFunction = [];
    for (let i = 0; i < this.size; i++) {
      this.modules.push(new Array(this.size).fill(false));
      this.isFunction.push(new Array(this.size).fill(false));
    }
  }

  /** @type {(x: number, y: number, dark: boolean) => void} */
  setFunctionModule(x, y, dark) {
    this.modules[y][x] = dark;
    this.isFunction[y][x] = true;
  }

  /** @param {number} formatBits */
  drawFunctionPatterns(formatBits) {
    const size = this.size;
    // Timing patterns
    for (let i = 0; i < size; i++) {
      this.setFunctionModule(6, i, i % 2 === 0);
      this.setFunctionModule(i, 6, i % 2 === 0);
    }
    // Finder patterns
    this.drawFinderPattern(3, 3);
    this.drawFinderPattern(size - 4, 3);
    this.drawFinderPattern(3, size - 4);
    // Alignment patterns
    const alignPositions = this.getAlignmentPatternPositions();
    const numAlign = alignPositions.length;
    for (let i = 0; i < numAlign; i++) {
      for (let j = 0; j < numAlign; j++) {
        if (
          !(
            (i === 0 && j === 0) ||
            (i === 0 && j === numAlign - 1) ||
            (i === numAlign - 1 && j === 0)
          )
        ) {
          this.drawAlignmentPattern(alignPositions[i], alignPositions[j]);
        }
      }
    }
    // Reserve format area with a dummy mask, real one drawn later
    this.drawFormatBits(formatBits, 0);
    this.drawVersion();
  }

  /** @type {(x: number, y: number) => void} */
  drawFinderPattern(x, y) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
          this.setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
        }
      }
    }
  }

  /** @type {(x: number, y: number) => void} */
  drawAlignmentPattern(x, y) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunctionModule(
          x + dx,
          y + dy,
          Math.max(Math.abs(dx), Math.abs(dy)) !== 1,
        );
      }
    }
  }

  /** @type {() => number[]} */
  getAlignmentPatternPositions() {
    if (this.version === 1) {
      return [];
    }
    const numAlign = Math.floor(this.version / 7) + 2;
    const step =
      Math.floor((this.version * 8 + numAlign * 3 + 5) / (numAlign * 4 - 4)) *
      2;
    const result = [6];
    for (let pos = this.size - 7; result.length < numAlign; pos -= step) {
      result.splice(1, 0, pos);
    }
    return result;
  }

  /** @type {(formatBits: number, mask: number) => void} */
  drawFormatBits(formatBits, mask) {
    const data = (formatBits << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) {
      rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    }
    const bits = ((data << 10) | rem) ^ 0x5412;
    const size = this.size;

    // First copy
    for (let i = 0; i <= 5; i++) {
      this.setFunctionModule(8, i, getBit(bits, i));
    }
    this.setFunctionModule(8, 7, getBit(bits, 6));
    this.setFunctionModule(8, 8, getBit(bits, 7));
    this.setFunctionModule(7, 8, getBit(bits, 8));
    for (let i = 9; i < 15; i++) {
      this.setFunctionModule(14 - i, 8, getBit(bits, i));
    }
    // Second copy
    for (let i = 0; i < 8; i++) {
      this.setFunctionModule(size - 1 - i, 8, getBit(bits, i));
    }
    for (let i = 8; i < 15; i++) {
      this.setFunctionModule(8, size - 15 + i, getBit(bits, i));
    }
    this.setFunctionModule(8, size - 8, true); // Always dark
  }

  drawVersion() {
    if (this.version < 7) {
      return;
    }
    let rem = this.version;
    for (let i = 0; i < 12; i++) {
      rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    }
    const bits = (this.version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = getBit(bits, i);
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFunctionModule(a, b, bit);
      this.setFunctionModule(b, a, bit);
    }
  }

  /** @param {number[]} data */
  drawCodewords(data) {
    const size = this.size;
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) {
        right = 5;
      }
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vert : vert;
          if (!this.isFunction[y][x] && i < data.length * 8) {
            this.modules[y][x] = getBit(data[i >>> 3], 7 - (i & 7));
            i++;
          }
        }
      }
    }
  }

  /** @param {number} mask */
  applyMask(mask) {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.isFunction[y][x]) {
          continue;
        }
        let invert;
        switch (mask) {
          case 0:
            invert = (x + y) % 2 === 0;
            break;
          case 1:
            invert = y % 2 === 0;
            break;
          case 2:
            invert = x % 3 === 0;
            break;
          case 3:
            invert = (x + y) % 3 === 0;
            break;
          case 4:
            invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
            break;
          case 5:
            invert = ((x * y) % 2) + ((x * y) % 3) === 0;
            break;
          case 6:
            invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
            break;
          default:
            invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
            break;
        }
        if (invert) {
          this.modules[y][x] = !this.modules[y][x];
        }
      }
    }
  }

  /** @type {() => number} */
  getPenaltyScore() {
    const size = this.size;
    const m = this.modules;
    let result = 0;

    // Runs of same colored modules in rows and columns
    for (let a = 0; a < size; a++) {
      let rowRun = 1;
      let colRun = 1;
      for (let b = 1; b < size; b++) {
        if (m[a][b] === m[a][b - 1]) {
          rowRun++;
        } else {
          if (rowRun >= 5) result += rowRun - 2;
          rowRun = 1;
        }
        if (m[b][a] === m[b - 1][a]) {
          colRun++;
        } else {
          if (colRun >= 5) result += colRun - 2;
          colRun = 1;
        }
      }
      if (rowRun >= 5) result += rowRun - 2;
      if (colRun >= 5) result += colRun - 2;
    }

    // 2x2 blocks of same color
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = m[y][x];
        if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) {
          result += 3;
        }
      }
    }

    // Finder-like patterns
    const patterns = ["00001011101", "10111010000"];
    for (let a = 0; a < size; a++) {
      let row = "";
      let col = "";
      for (let b = 0; b < size; b++) {
        row += m[a][b] ? "1" : "0";
        col += m[b][a] ? "1" : "0";
      }
      for (const line of [row, col]) {
        for (const pattern of patterns) {
          let idx = line.indexOf(pattern);
          while (idx !== -1) {
            result += 40;
            idx = line.indexOf(pattern, idx + 1);
          }
        }
      }
    }

    // Balance of dark and light modules
    let dark = 0;
    m.forEach((row) => row.forEach((c) => (dark += c ? 1 : 0)));
    const percent = (dark * 100) / (size * size);
    result += Math.floor(Math.abs(percent - 50) / 5) * 10;
    return result;
  }
}

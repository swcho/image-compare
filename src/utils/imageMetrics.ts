import type { ImageMetrics } from '../types';

const TARGET_SIZE = 256;
const PHASH_INPUT_SIZE = 32;

// ---------------------------------------------------------------------------
// Image loading helpers
// ---------------------------------------------------------------------------

async function fetchToBlob(url: string): Promise<Blob> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch image: ${url}`);
  return resp.blob();
}

async function blobToImageData(blob: Blob, width: number, height: number): Promise<ImageData> {
  const blobUrl = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(ctx.getImageData(0, 0, width, height));
      URL.revokeObjectURL(blobUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Image decode failed'));
    };
    img.src = blobUrl;
  });
}

// ---------------------------------------------------------------------------
// MSE
// ---------------------------------------------------------------------------

function computeMSE(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let sum = 0;
  const pixels = a.length / 4;
  for (let i = 0; i < a.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const d = a[i + c] - b[i + c];
      sum += d * d;
    }
  }
  return sum / (pixels * 3);
}

// ---------------------------------------------------------------------------
// PSNR
// ---------------------------------------------------------------------------

function computePSNR(mse: number): number {
  if (mse === 0) return Infinity;
  return 10 * Math.log10((255 * 255) / mse);
}

// ---------------------------------------------------------------------------
// SSIM (windowed, non-overlapping 8×8 blocks)
// ---------------------------------------------------------------------------

function computeSSIM(
  a: Uint8ClampedArray,
  b: Uint8ClampedArray,
  width: number,
  height: number,
): number {
  const K1 = 0.01;
  const K2 = 0.03;
  const L = 255;
  const C1 = (K1 * L) ** 2;
  const C2 = (K2 * L) ** 2;
  const W = 8;

  let ssimSum = 0;
  let count = 0;

  for (let y = 0; y <= height - W; y += W) {
    for (let x = 0; x <= width - W; x += W) {
      const p1: number[] = [];
      const p2: number[] = [];
      let mu1 = 0;
      let mu2 = 0;

      for (let wy = 0; wy < W; wy++) {
        for (let wx = 0; wx < W; wx++) {
          const idx = ((y + wy) * width + (x + wx)) * 4;
          const l1 = 0.299 * a[idx] + 0.587 * a[idx + 1] + 0.114 * a[idx + 2];
          const l2 = 0.299 * b[idx] + 0.587 * b[idx + 1] + 0.114 * b[idx + 2];
          p1.push(l1);
          p2.push(l2);
          mu1 += l1;
          mu2 += l2;
        }
      }

      const n = W * W;
      mu1 /= n;
      mu2 /= n;

      let s1 = 0;
      let s2 = 0;
      let s12 = 0;
      for (let i = 0; i < n; i++) {
        const d1 = p1[i] - mu1;
        const d2 = p2[i] - mu2;
        s1 += d1 * d1;
        s2 += d2 * d2;
        s12 += d1 * d2;
      }
      s1 /= n - 1;
      s2 /= n - 1;
      s12 /= n - 1;

      const num = (2 * mu1 * mu2 + C1) * (2 * s12 + C2);
      const den = (mu1 ** 2 + mu2 ** 2 + C1) * (s1 + s2 + C2);
      ssimSum += num / den;
      count++;
    }
  }

  return count > 0 ? ssimSum / count : 0;
}

// ---------------------------------------------------------------------------
// pHash (DCT-based perceptual hash)
// ---------------------------------------------------------------------------

function toLumaMatrix(data: Uint8ClampedArray, size: number): number[][] {
  const m: number[][] = [];
  for (let y = 0; y < size; y++) {
    m[y] = [];
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      m[y][x] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
  }
  return m;
}

function dct1d(row: number[]): number[] {
  const N = row.length;
  const out = new Array<number>(N);
  for (let k = 0; k < N; k++) {
    let s = 0;
    for (let n = 0; n < N; n++) {
      s += row[n] * Math.cos((Math.PI / N) * (n + 0.5) * k);
    }
    out[k] = s;
  }
  return out;
}

function dct2d(matrix: number[][]): number[][] {
  const N = matrix.length;
  // DCT over rows
  const rowDct = matrix.map((row) => dct1d(row));
  // DCT over columns
  const result: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(0));
  for (let col = 0; col < N; col++) {
    const column = rowDct.map((row) => row[col]);
    const colDct = dct1d(column);
    colDct.forEach((val, row) => {
      result[row][col] = val;
    });
  }
  return result;
}

function computePHash(data: Uint8ClampedArray): bigint {
  const matrix = toLumaMatrix(data, PHASH_INPUT_SIZE);
  const dct = dct2d(matrix);

  // Extract top-left 8×8 values (skip DC at [0][0] for mean calculation)
  const values: number[] = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (x === 0 && y === 0) continue;
      values.push(dct[y][x]);
    }
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length;

  let hash = 0n;
  let bit = 0;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (dct[y][x] > mean) hash |= 1n << BigInt(bit);
      bit++;
    }
  }
  return hash;
}

function hammingDistance(a: bigint, b: bigint): number {
  let xor = a ^ b;
  let count = 0;
  while (xor > 0n) {
    count += Number(xor & 1n);
    xor >>= 1n;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Histogram correlation (Pearson, per-channel average)
// ---------------------------------------------------------------------------

function computeHistogramCorrelation(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  const BINS = 256;
  const CHANNELS = 3;
  const h1 = Array.from({ length: CHANNELS }, () => new Float64Array(BINS));
  const h2 = Array.from({ length: CHANNELS }, () => new Float64Array(BINS));

  for (let i = 0; i < a.length; i += 4) {
    for (let c = 0; c < CHANNELS; c++) {
      h1[c][a[i + c]]++;
      h2[c][b[i + c]]++;
    }
  }

  let total = 0;
  for (let c = 0; c < CHANNELS; c++) {
    let s1 = 0;
    let s2 = 0;
    let s1sq = 0;
    let s2sq = 0;
    let sp = 0;
    for (let i = 0; i < BINS; i++) {
      s1 += h1[c][i];
      s2 += h2[c][i];
      s1sq += h1[c][i] * h1[c][i];
      s2sq += h2[c][i] * h2[c][i];
      sp += h1[c][i] * h2[c][i];
    }
    const num = sp - (s1 * s2) / BINS;
    const den = Math.sqrt((s1sq - (s1 * s1) / BINS) * (s2sq - (s2 * s2) / BINS));
    total += den > 0 ? num / den : 1;
  }

  return total / CHANNELS;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function computeMetrics(url1: string, url2: string): Promise<ImageMetrics> {
  const [blob1, blob2] = await Promise.all([fetchToBlob(url1), fetchToBlob(url2)]);

  const [imgData1, imgData2, phashData1, phashData2] = await Promise.all([
    blobToImageData(blob1, TARGET_SIZE, TARGET_SIZE),
    blobToImageData(blob2, TARGET_SIZE, TARGET_SIZE),
    blobToImageData(blob1, PHASH_INPUT_SIZE, PHASH_INPUT_SIZE),
    blobToImageData(blob2, PHASH_INPUT_SIZE, PHASH_INPUT_SIZE),
  ]);

  const mse = computeMSE(imgData1.data, imgData2.data);
  const psnr = computePSNR(mse);
  const ssim = computeSSIM(imgData1.data, imgData2.data, TARGET_SIZE, TARGET_SIZE);
  const hash1 = computePHash(phashData1.data);
  const hash2 = computePHash(phashData2.data);
  const phashSimilarity = 1 - hammingDistance(hash1, hash2) / 64;
  const histogramCorrelation = computeHistogramCorrelation(imgData1.data, imgData2.data);

  return { mse, psnr, ssim, phashSimilarity, histogramCorrelation };
}

export async function computeDiffHeatmap(url1: string, url2: string): Promise<string> {
  const [blob1, blob2] = await Promise.all([fetchToBlob(url1), fetchToBlob(url2)]);
  const [d1, d2] = await Promise.all([
    blobToImageData(blob1, TARGET_SIZE, TARGET_SIZE),
    blobToImageData(blob2, TARGET_SIZE, TARGET_SIZE),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext('2d')!;
  const out = ctx.createImageData(TARGET_SIZE, TARGET_SIZE);

  for (let i = 0; i < d1.data.length; i += 4) {
    const diff =
      (Math.abs(d1.data[i] - d2.data[i]) +
        Math.abs(d1.data[i + 1] - d2.data[i + 1]) +
        Math.abs(d1.data[i + 2] - d2.data[i + 2])) /
      3;
    const t = diff / 255;
    // blue → green → red heatmap
    out.data[i] = Math.round(255 * Math.min(1, t * 2));
    out.data[i + 1] = Math.round(255 * Math.max(0, 1 - Math.abs(t - 0.5) * 2));
    out.data[i + 2] = Math.round(255 * Math.max(0, 1 - t * 2));
    out.data[i + 3] = 255;
  }

  ctx.putImageData(out, 0, 0);
  return canvas.toDataURL('image/png');
}

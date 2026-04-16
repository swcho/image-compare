/**
 * Generates minimal placeholder PNG icons without any external dependencies.
 * Usage: node scripts/gen-icons.mjs
 */

import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const zlib = require('zlib');

const SIZES = [16, 48, 128];
const COLOR = [0x3b, 0x82, 0xf6, 0xff]; // #3b82f6 blue

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) {
    c ^= byte;
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcData = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

function makePNG(size) {
  const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw image data: each row = filter byte (0) + R G B per pixel
  const rowSize = 1 + size * 3;
  const raw = Buffer.alloc(size * rowSize);
  for (let y = 0; y < size; y++) {
    const offset = y * rowSize;
    raw[offset] = 0; // filter type: None
    for (let x = 0; x < size; x++) {
      raw[offset + 1 + x * 3] = COLOR[0];
      raw[offset + 2 + x * 3] = COLOR[1];
      raw[offset + 3 + x * 3] = COLOR[2];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });

for (const size of SIZES) {
  const png = makePNG(size);
  writeFileSync(`public/icons/icon${size}.png`, png);
  console.log(`Generated public/icons/icon${size}.png (${size}x${size})`);
}

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let i = 0; i < 8; i += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const name = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}

function inCircle(x, y, cx, cy, r) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const s = size;
  for (let y = 0; y < s; y += 1) {
    const row = y * (s * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < s; x += 1) {
      const nx = (x + 0.5) / s;
      const ny = (y + 0.5) / s;
      const bg = inCircle(nx, ny, 0.5, 0.5, 0.48);
      const linkA = inCircle(nx, ny, 0.38, 0.62, 0.2) && !inCircle(nx, ny, 0.38, 0.62, 0.1);
      const linkB = inCircle(nx, ny, 0.62, 0.38, 0.2) && !inCircle(nx, ny, 0.62, 0.38, 0.1);
      const bar = nx > 0.34 && nx < 0.66 && ny > 0.34 && ny < 0.66 && Math.abs(nx - ny) < 0.12;
      const glyph = linkA || linkB || bar;
      const i = row + 1 + x * 4;
      if (!bg) {
        raw[i + 3] = 0;
      } else if (glyph) {
        raw[i] = 255;
        raw[i + 1] = 255;
        raw[i + 2] = 255;
        raw[i + 3] = 255;
      } else {
        raw[i] = 37;
        raw[i + 1] = 99;
        raw[i + 2] = 235;
        raw[i + 3] = 255;
      }
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const dir = path.join(__dirname, "..", "icons");
fs.mkdirSync(dir, { recursive: true });
for (const size of [16, 48, 128]) {
  fs.writeFileSync(path.join(dir, `icon${size}.png`), png(size));
}

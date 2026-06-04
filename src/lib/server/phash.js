/**
 * Perceptual hash using dHash (difference hash) at 16x16.
 * dHash compares adjacent pixel brightness (gradient direction).
 * Much more robust than aHash for images with similar color backgrounds.
 */
const sharp = require('sharp');

const HASH_SIZE = 16; // 16x16 → 16*15 = 240 gradient bits

/**
 * Compute dHash for an image URL.
 * Returns a hex string.
 */
async function computePHash(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return computePHashFromBuffer(buffer);
  } catch {
    return null;
  }
}

/**
 * Compute dHash from a buffer.
 * Resize to (HASH_SIZE+1) x HASH_SIZE grayscale.
 * For each row, compare pixel[x] > pixel[x+1].
 * Produces HASH_SIZE * HASH_SIZE = 256 bits (for 16x16).
 */
async function computePHashFromBuffer(buffer) {
  try {
    const width = HASH_SIZE + 1; // 17
    const height = HASH_SIZE;    // 16
    const pixels = await sharp(buffer)
      .resize(width, height, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    // dHash: compare adjacent horizontal pixels
    const bits = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width - 1; x++) {
        const idx = y * width + x;
        bits.push(pixels[idx] > pixels[idx + 1] ? 1 : 0);
      }
    }

    // Convert bits to hex string (256 bits → 64 hex chars)
    let hex = '';
    for (let i = 0; i < bits.length; i += 4) {
      const nibble = (bits[i] << 3) | (bits[i+1] << 2) | (bits[i+2] << 1) | bits[i+3];
      hex += nibble.toString(16);
    }
    return hex;
  } catch {
    return null;
  }
}

module.exports = { computePHash, computePHashFromBuffer };

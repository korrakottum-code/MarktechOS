/**
 * Perceptual hash (aHash) computation for thumbnail images.
 * Downloads the image, resizes to 8x8 grayscale, computes average hash.
 * Two visually identical images will produce the same hash.
 */
const sharp = require('sharp');

const HASH_SIZE = 8; // 8x8 = 64-bit hash

/**
 * Compute average-hash (aHash) for an image URL.
 * Returns a hex string (16 chars = 64 bits).
 */
async function computePHash(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());

    // Resize to 8x8 grayscale
    const pixels = await sharp(buffer)
      .resize(HASH_SIZE, HASH_SIZE, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    // Compute average brightness
    let sum = 0;
    for (let i = 0; i < pixels.length; i++) sum += pixels[i];
    const avg = sum / pixels.length;

    // Build hash: each pixel > avg = 1, else 0
    let hash = 0n;
    for (let i = 0; i < pixels.length; i++) {
      if (pixels[i] > avg) hash |= 1n << BigInt(pixels.length - 1 - i);
    }

    return hash.toString(16).padStart(16, '0');
  } catch {
    return null;
  }
}

module.exports = { computePHash };

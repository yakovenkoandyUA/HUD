/**
 * remove-white-bg.mjs
 * --------------------
 * Removes white background from a PNG using min-channel luma keying.
 * Preserves anti-aliasing edges with a smooth alpha fade.
 *
 * Usage:
 *   node scripts/remove-white-bg.mjs <input.png> [output.png] [maxWidth]
 *
 * Examples:
 *   node scripts/remove-white-bg.mjs public/car/car-f1.png
 *   node scripts/remove-white-bg.mjs public/car/car-f1.png public/car/car-f1-out.png 800
 */

import sharp from 'sharp'
import { writeFile } from 'fs/promises'
import { resolve } from 'path'

const [,, inputArg, outputArg, widthArg] = process.argv

if (!inputArg) {
  console.error('Usage: node scripts/remove-white-bg.mjs <input.png> [output.png] [maxWidth]')
  process.exit(1)
}

const src      = resolve(inputArg)
const dest     = resolve(outputArg ?? inputArg)
const maxWidth = widthArg ? parseInt(widthArg) : 960

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const { width, height } = info

for (let i = 0; i < data.length; i += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2]
  const whiteness = Math.min(r, g, b) / 255
  const alpha = whiteness > 0.98
    ? 0
    : whiteness > 0.92
      ? Math.round(255 * (1 - (whiteness - 0.92) / 0.06))
      : 255
  data[i + 3] = Math.min(255, Math.max(0, alpha))
}

const outBuf = await sharp(Buffer.from(data), { raw: { width, height, channels: 4 } })
  .resize({ width: maxWidth, withoutEnlargement: true })
  .png({ compressionLevel: 9 })
  .toBuffer()

await writeFile(dest, outBuf)
console.log(`✓  ${dest}  (${(outBuf.length / 1024).toFixed(0)} KB)`)

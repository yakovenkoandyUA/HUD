/**
 * generate-icons.mjs
 * Renders all PWA icon PNGs from public/mimir-logo.svg via sharp.
 * Also generates badge-96.png (monochrome white M on transparent).
 *
 * Usage: node scripts/generate-icons.mjs
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root      = path.join(__dirname, '..')
const srcSvg    = path.join(root, 'public/mimir-logo.svg')

if (!fs.existsSync(srcSvg)) {
  console.error('❌  public/mimir-logo.svg not found')
  process.exit(1)
}

// sharp + SVG: density controls render resolution. 300dpi → crisp at all sizes.
const sharpSrc = () => sharp(srcSvg, { density: 300 })

// ── 1. PWA icons ─────────────────────────────────────────────────────────────

const iconsDir = path.join(root, 'public/icons')
fs.mkdirSync(iconsDir, { recursive: true })

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

await Promise.all(sizes.map(async (size) => {
  const outPath = path.join(iconsDir, `icon-${size}.png`)
  await sharpSrc().resize(size, size).png().toFile(outPath)
  console.log(`✅  icon-${size}.png`)
}))

// ── 1b. Maskable icons ───────────────────────────────────────────────────────
// Android crops adaptive icons to its own shape (circle/squircle/square) and only
// guarantees the inner ~66% "safe zone" survives. Our artwork goes edge-to-edge
// (horns, braid tip), so a dedicated maskable variant scales the face down onto
// a full-bleed background swatch instead of relying on the regular icon.

const bgColor = '#0F0F10'
const maskableSizes = [192, 512]

await Promise.all(maskableSizes.map(async (size) => {
  const contentSize = Math.round(size * 0.66)
  const content = await sharpSrc().resize(contentSize, contentSize).png().toBuffer()
  const outPath = path.join(iconsDir, `icon-${size}-maskable.png`)
  await sharp({
    create: { width: size, height: size, channels: 4, background: bgColor },
  })
    .composite([{ input: content, gravity: 'center' }])
    .png()
    .toFile(outPath)
  console.log(`✅  icon-${size}-maskable.png`)
}))

// ── 2. favicon.png (32×32) ────────────────────────────────────────────────────

await sharpSrc().resize(32, 32).png().toFile(path.join(root, 'public/favicon.png'))
console.log('✅  favicon.png')

// ── 3. badge-96.png (monochrome white M on transparent) ──────────────────────
// Android uses only the alpha channel for the status-bar badge icon.

const svgBadge = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <path fill="white" d="M12 76 L12 20 L48 52 L84 20 L84 76 L72 76 L72 40 L48 62 L24 40 L24 76 Z"/>
</svg>`

await sharp(Buffer.from(svgBadge)).png().toFile(path.join(root, 'public/badge-96.png'))
console.log('✅  badge-96.png')

console.log('\nDone! All icons generated from public/mimir-logo.svg 🏺')

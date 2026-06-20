/**
 * generate-icons.mjs
 * Renders all PWA icon PNGs from public/logo-icon.png via sharp.
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
const srcPng    = path.join(root, 'public/logo-icon.png')

if (!fs.existsSync(srcPng)) {
  console.error('❌  public/logo-icon.png not found')
  process.exit(1)
}

// ── 1. PWA icons ─────────────────────────────────────────────────────────────

const iconsDir = path.join(root, 'public/icons')
fs.mkdirSync(iconsDir, { recursive: true })

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

await Promise.all(sizes.map(async (size) => {
  const outPath = path.join(iconsDir, `icon-${size}.png`)
  await sharp(srcPng).resize(size, size).png().toFile(outPath)
  console.log(`✅  icon-${size}.png`)
}))

// ── 2. favicon.png (32×32) ────────────────────────────────────────────────────

await sharp(srcPng).resize(32, 32).png().toFile(path.join(root, 'public/favicon.png'))
console.log('✅  favicon.png')

// ── 3. badge-96.png (monochrome white M on transparent) ──────────────────────
// Android uses only the alpha channel for the status-bar badge icon.

const svgBadge = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <path fill="white" d="M12 76 L12 20 L48 52 L84 20 L84 76 L72 76 L72 40 L48 62 L24 40 L24 76 Z"/>
</svg>`

await sharp(Buffer.from(svgBadge)).png().toFile(path.join(root, 'public/badge-96.png'))
console.log('✅  badge-96.png')

console.log('\nDone! All icons generated from public/logo-icon.png 🏺')

/**
 * generate-icons.mjs
 * Builds mimir-logo.svg (square, face-cropped) and renders all PWA icon PNGs via sharp.
 *
 * Usage: node scripts/generate-icons.mjs
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root      = path.join(__dirname, '..')

// ── 1. Read mimir-face.svg and extract inner content ──────────────────────────

const facePath = path.join(root, 'src/assets/mimir-face.svg')
const faceSvg  = fs.readFileSync(facePath, 'utf-8')

// Strip the outer <svg> wrapper — we only need its children
const innerMatch = faceSvg.match(/<svg[^>]*>([\s\S]*?)<\/svg>\s*$/)
if (!innerMatch) { console.error('Cannot parse mimir-face.svg'); process.exit(1) }
const innerContent = innerMatch[1].trim()

// ── 2. Build a 512×512 logo SVG ───────────────────────────────────────────────
//
// Original face viewBox: 0 0 640 930 (portrait).
// Strategy:
//   scale(0.8)  →  640×0.8=512 (perfect width), 930×0.8=744 (height)
//   The 512×512 viewBox clips the bottom — we see original y 0..640,
//   which covers the full head + the main braided-beard knot.
//   The ink-drip fringe (original y≈800-930) is cut off cleanly.

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0F0F12"/>
  <g transform="scale(0.8)">
    ${innerContent}
  </g>
</svg>`

const logoPath = path.join(root, 'public/mimir-logo.svg')
fs.writeFileSync(logoPath, logoSvg, 'utf-8')
console.log('✅  mimir-logo.svg written')

// ── 3. Render PNG icons ───────────────────────────────────────────────────────

const iconsDir = path.join(root, 'public/icons')
fs.mkdirSync(iconsDir, { recursive: true })

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

const svgBuffer = Buffer.from(logoSvg)

await Promise.all(sizes.map(async (size) => {
  const outPath = path.join(iconsDir, `icon-${size}.png`)
  await sharp(svgBuffer, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(outPath)
  console.log(`✅  icon-${size}.png`)
}))

// Also write favicon.svg (same content, small)
fs.copyFileSync(logoPath, path.join(root, 'public/favicon.svg'))
console.log('✅  favicon.svg')

console.log('\nDone! All icons generated from mimir-face.svg 🏺')

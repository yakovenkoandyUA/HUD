import sharp from 'sharp'
import { readdir, unlink } from 'fs/promises'
import { join, extname, basename } from 'path'

const DIR = new URL('../public/theme/', import.meta.url).pathname
const MAX_WIDTH = 900
const QUALITY = 82

const files = await readdir(DIR)
const images = files.filter(f => /\.(png|jpg|jpeg)$/i.test(f))

console.log(`Optimizing ${images.length} images → WebP ${MAX_WIDTH}px wide, q${QUALITY}`)

for (const file of images) {
  const src  = join(DIR, file)
  const name = basename(file, extname(file))
  const dest = join(DIR, `${name}.webp`)

  const meta = await sharp(src).metadata()
  const { size: before } = await import('fs').then(m => m.promises.stat(src))

  await sharp(src)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(dest)

  const { size: after } = await import('fs').then(m => m.promises.stat(dest))
  const pct = Math.round((1 - after / before) * 100)

  console.log(`  ${file} (${meta.width}×${meta.height}) ${(before/1024/1024).toFixed(1)}MB → ${(after/1024).toFixed(0)}KB  −${pct}%`)
}

console.log('\nDone. Update GreetingBlock/index.tsx to use .webp paths.')

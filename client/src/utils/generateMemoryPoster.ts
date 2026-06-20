import type { Memory } from '../types/memory'

/**
 * generateMemoryPosterBlob
 * ------------------------
 * Малює постер спогаду на canvas (обкладинка + назва + дата/місце + теги)
 * і повертає готовий PNG як Blob. Без зовнішніх AI-сервісів.
 *
 * @param {Memory} memory          — спогад (cover/photos/title/tags)
 * @param {string}  formattedDate  — вже відформатована дата (напр. "12 Лип 2025")
 * @returns {Promise<Blob>}        — PNG blob
 */
export async function generateMemoryPosterBlob(memory: Memory, formattedDate: string): Promise<Blob> {
  const W = 900
  const H = 1200
  const canvas = document.createElement('canvas')
  canvas.width  = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // background
  ctx.fillStyle = '#0e0e0e'
  ctx.fillRect(0, 0, W, H)

  // cover image (if any)
  const coverSrc = memory.coverUrl || (memory.photos[0]?.url ?? '')
  let coverLoaded = false
  if (coverSrc) {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve) => {
        img.onload = () => { coverLoaded = true; resolve() }
        img.onerror = () => resolve()
        img.src = coverSrc
      })
      if (coverLoaded) {
        const imgRatio = img.naturalWidth / img.naturalHeight
        const slotH = Math.round(H * 0.84)
        const slotW = W
        let drawW = slotW
        let drawH = drawW / imgRatio
        if (drawH < slotH) { drawH = slotH; drawW = drawH * imgRatio }
        const ox = (slotW - drawW) / 2
        const oy = (slotH - drawH) / 2
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, slotW, slotH)
        ctx.clip()
        ctx.drawImage(img, ox, oy, drawW, drawH)
        ctx.restore()

        // gradient overlay at bottom of image — text sits on top of the photo, not below it
        const gradH = 360
        const grad = ctx.createLinearGradient(0, slotH - gradH, 0, slotH)
        grad.addColorStop(0, 'rgba(14,14,14,0)')
        grad.addColorStop(1, 'rgba(14,14,14,0.95)')
        ctx.fillStyle = grad
        ctx.fillRect(0, slotH - gradH, W, gradH)
      }
    } catch { /* skip image */ }
  }

  const slotBottom = Math.round(H * 0.84)
  const textTop = coverLoaded ? slotBottom - 170 : 80

  // title
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold 64px "Arial", sans-serif`
  ctx.letterSpacing = '2px'
  const title = memory.title.toUpperCase()
  // wrap title if needed
  const maxTitleW = W - 80
  const words = title.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxTitleW && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  lines.push(line)
  lines.forEach((l, i) => {
    ctx.fillText(l, 40, textTop + i * 72)
  })

  // date + location
  const metaY = textTop + lines.length * 72 + 20
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = `400 32px "Arial", sans-serif`
  let meta = formattedDate
  if (memory.location) meta += ` · ${memory.location}`
  ctx.fillText(meta, 40, metaY)

  // tags
  if (memory.tags && memory.tags.length > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font = `400 26px "Arial", sans-serif`
    ctx.fillText(memory.tags.map(t => `#${t}`).join('  '), 40, metaY + 48)
  }

  // MIMIR watermark
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.font = `700 20px "Arial", sans-serif`
  ctx.letterSpacing = '6px'
  ctx.fillText('MIMIR', 40, H - 36)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('canvas.toBlob returned null'))
    }, 'image/png')
  })
}

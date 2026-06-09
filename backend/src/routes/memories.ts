import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import * as ctrl from '../controllers/memoryController'

const router = Router()
router.use(requireAuth)

router.get('/', ctrl.getAll)
router.post('/', ctrl.create)

// ── AI poster: fetch Pollinations server-side → upload to Cloudinary ──────────
router.post('/generate-poster-image', async (req: Request, res: Response): Promise<void> => {
  const { prompt } = req.body as { prompt?: string }
  if (!prompt) { res.status(400).json({ error: 'prompt required' }); return }

  try {
    const seed = Math.floor(Math.random() * 999999)
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=768&seed=${seed}&nologo=true`
    console.log('[poster-image] Fetching from Pollinations:', pollinationsUrl.slice(0, 140))

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    const imageResponse = await fetch(pollinationsUrl, { signal: controller.signal })
    clearTimeout(timeout)

    if (!imageResponse.ok) throw new Error(`Pollinations error: ${imageResponse.status}`)
    const contentType = imageResponse.headers.get('content-type') ?? 'image/jpeg'
    console.log('[poster-image] Pollinations OK, content-type:', contentType)

    const buffer = await imageResponse.arrayBuffer()
    const base64  = Buffer.from(buffer).toString('base64')
    const dataUrl = `data:${contentType};base64,${base64}`

    // Upload via Cloudinary unsigned preset (no SDK needed)
    const cloudName   = process.env.CLOUDINARY_CLOUD_NAME   ?? 'mimir-hud'
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET ?? 'mimirorg'
    const form = new FormData()
    form.append('file', dataUrl)
    form.append('upload_preset', uploadPreset)
    form.append('folder', 'mimir/posters')

    console.log('[poster-image] Uploading to Cloudinary, cloud:', cloudName)
    const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    })

    if (!cloudRes.ok) {
      const errText = await cloudRes.text()
      console.error('[poster-image] Cloudinary error:', cloudRes.status, errText)
      throw new Error(`Cloudinary error: ${cloudRes.status}`)
    }

    const { secure_url } = await cloudRes.json() as { secure_url: string }
    console.log('[poster-image] Uploaded to Cloudinary:', secure_url)
    res.json({ imageUrl: secure_url })
  } catch (err) {
    console.error('[poster-image] Failed:', err)
    res.status(500).json({ error: String(err) })
  }
})

router.patch('/:id', ctrl.update)
router.delete('/:id', ctrl.remove)
router.post('/:id/photos', ctrl.addPhoto)
router.patch('/:id/photos/:photoId', ctrl.updatePhoto)
router.delete('/:id/photos/:photoId', ctrl.deletePhoto)

export default router

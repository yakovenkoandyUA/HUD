import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import * as ctrl from '../controllers/memoryController'

const router = Router()
router.use(requireAuth)

router.get('/', ctrl.getAll)
router.post('/', ctrl.create)

// AI poster prompt generation
router.post('/generate-poster-prompt', async (req: Request, res: Response): Promise<void> => {
  const { title, location, date } = req.body as { title?: string; location?: string; date?: string }

  if (!title) {
    res.status(400).json({ error: 'title required' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
    return
  }

  const system = `You are a creative director for a cinematic photography studio. Generate a concise image prompt (max 50 words) for an AI image generator. The result should look like a beautiful atmospheric movie poster or travel photograph: dramatic lighting, rich colors, cinematic mood. No text or people in the image. Output ONLY the prompt, nothing else.`

  const userMsg = `Memory: "${title}"${location ? ` at ${location}` : ''}${date ? `, ${date}` : ''}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        system,
        messages: [{ role: 'user', content: userMsg }],
      }),
    })

    if (!response.ok) {
      console.error('Anthropic API error:', response.status)
      res.status(502).json({ error: 'Anthropic API error' })
      return
    }

    const data = await response.json() as { content: { type: string; text: string }[] }
    const prompt = data.content?.[0]?.text?.trim() ?? ''

    if (!prompt) {
      res.status(422).json({ error: 'Empty prompt from Anthropic' })
      return
    }

    res.json({ prompt })
  } catch (err) {
    console.error('Poster prompt error:', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

router.patch('/:id', ctrl.update)
router.delete('/:id', ctrl.remove)
router.post('/:id/photos', ctrl.addPhoto)
router.patch('/:id/photos/:photoId', ctrl.updatePhoto)
router.delete('/:id/photos/:photoId', ctrl.deletePhoto)

export default router

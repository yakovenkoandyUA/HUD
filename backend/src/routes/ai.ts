import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

// POST /api/ai/poster-prompt
router.post('/poster-prompt', async (req: Request, res: Response): Promise<void> => {
  const { title, notes, date } = req.body as { title?: string; notes?: string; date?: string }
  console.log('[ai/poster-prompt] Request received:', { title, notesLen: notes?.length ?? 0, date })

  if (!title) {
    res.status(400).json({ error: 'title required' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  console.log('[ai/poster-prompt] ANTHROPIC_API_KEY present:', !!apiKey, '| key prefix:', apiKey?.slice(0, 10) ?? 'MISSING')
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
    return
  }

  try {
    console.log('[ai/poster-prompt] Calling Anthropic API...')
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Create a short cinematic image generation prompt (max 50 words)
for a memory poster based on:
Title: "${title}"
Notes: "${notes ?? 'no notes'}"
Date: "${date ?? ''}"

Requirements:
- Artistic, painterly or cinematic style
- Warm emotional atmosphere
- No text or letters in the image
- Focus on mood and feeling
- End with: "dramatic lighting, high quality, artistic poster"

Return ONLY the prompt, nothing else.`,
        }],
      }),
    })

    console.log('[ai/poster-prompt] Anthropic response status:', response.status)

    if (!response.ok) {
      const errBody = await response.text()
      console.error('[ai/poster-prompt] Anthropic API error:', response.status, errBody)
      res.status(502).json({ error: 'Anthropic API error', detail: errBody })
      return
    }

    const data = await response.json() as { content: { type: string; text: string }[] }
    console.log('[ai/poster-prompt] Anthropic response data:', JSON.stringify(data).slice(0, 300))
    const prompt = data.content?.[0]?.text?.trim() ?? ''

    if (!prompt) {
      console.error('[ai/poster-prompt] Empty prompt in response:', JSON.stringify(data))
      res.status(422).json({ error: 'Empty prompt from Anthropic' })
      return
    }

    console.log('[ai/poster-prompt] Prompt generated OK:', prompt.slice(0, 80))
    res.json({ prompt })
  } catch (err) {
    console.error('[ai/poster-prompt] Unexpected error:', err)
    res.status(500).json({ error: 'Internal error', detail: String(err) })
  }
})

export default router

import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()

const PROMPT = `Це фото касового чеку. Розпізнай і поверни ТІЛЬКИ JSON без зайвого тексту:
{
  "store": "назва магазину",
  "total": число,
  "date": "YYYY-MM-DD або null",
  "items": [
    { "name": "назва товару", "price": число, "category": "Продукти|Побутова хімія|Алкоголь|Інше" }
  ]
}
Категорії визначай самостійно по назві товару.`

interface AnthropicResponse {
  content: { type: string; text: string }[]
}

router.post('/scan', requireAuth, async (req: Request, res: Response): Promise<void> => {
  console.log('Receipt scan request received')
  const { imageBase64, mimeType } = req.body as { imageBase64?: string; mimeType?: string }
  console.log('Image size (base64 length):', imageBase64?.length)
  console.log('Mime type:', mimeType)

  if (!imageBase64 || !mimeType) {
    res.status(400).json({ error: 'imageBase64 and mimeType required' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set')
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
    return
  }

  try {
    console.log('Sending to Anthropic...')
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    })

    console.log('Anthropic response status:', response.status)

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic API error:', errText)
      res.status(502).json({ error: 'Anthropic API error' })
      return
    }

    const data = await response.json() as AnthropicResponse
    console.log('Anthropic response body:', JSON.stringify(data))

    const text = data.content?.[0]?.text ?? ''
    console.log('Raw text from Claude:', text)

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      res.status(422).json({ error: 'Could not parse receipt JSON' })
      return
    }

    const json = JSON.parse(jsonMatch[0])
    res.json(json)
  } catch (err) {
    console.error('Receipt scan error:', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

export default router

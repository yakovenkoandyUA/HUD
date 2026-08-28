interface AnthropicMessage {
  role:    'user' | 'assistant'
  content: string
}

interface CallAnthropicTextOptions {
  system?:    string
  maxTokens?: number
  model?:     string
}

/**
 * Non-streaming Anthropic Messages call, returns the plain text response.
 * Shared helper for one-shot AI features (checklist breakdown, weekly digest)
 * — avoids duplicating the raw fetch() setup already used elsewhere.
 */
export async function callAnthropicText(
  messages: AnthropicMessage[],
  opts: CallAnthropicTextOptions = {},
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: opts.model ?? 'claude-haiku-4-5-20251001',
      max_tokens: opts.maxTokens ?? 1024,
      ...(opts.system ? { system: opts.system } : {}),
      messages,
    }),
  })

  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`)

  const data = await res.json() as { content: Array<{ type: string; text: string }> }
  return data.content[0]?.type === 'text' ? data.content[0].text : ''
}

import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'
import { assertAndTrackMonthlyUsage } from '../utils/entitlements'
import { callAnthropicText } from '../utils/anthropic'

function buildBreakdownPrompt(title: string, description?: string): string {
  return `Розбий цю задачу на 3-7 конкретних, дій-орієнтованих кроків.
Задача: "${title}"${description ? `\nОпис: ${description}` : ''}

Відповідай ЛИШЕ JSON-масивом рядків, без пояснень і markdown-обгортки. Приклад формату:
["Крок один", "Крок два", "Крок три"]`
}

function parseSteps(raw: string): string[] {
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    const parsed = JSON.parse(match[0])
    if (!Array.isArray(parsed)) return []
    return parsed.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).slice(0, 7)
  } catch {
    return []
  }
}

export async function breakdownTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await assertAndTrackMonthlyUsage(req.user!, 'sprintAiBreakdown', 'maxChecklistBreakdownsPerMonth')
  } catch (err) {
    next(err)
    return
  }

  const { title, description } = req.body as { title: string; description?: string }

  try {
    const raw = await callAnthropicText(
      [{ role: 'user', content: buildBreakdownPrompt(title, description) }],
      { maxTokens: 500 },
    )
    const steps = parseSteps(raw)
    res.json({ checklist: steps.map(text => ({ id: randomUUID(), title: text, done: false })) })
  } catch {
    res.status(500).json({ error: 'Помилка розбивки задачі' })
  }
}

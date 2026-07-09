import { Request, Response } from 'express'
import SprintTask from '../models/SprintTask'
import MoodLog from '../models/MoodLog'
import Transaction from '../models/Transaction'
import MimirCache from '../models/MimirCache'

type MimirMode = 'wise' | 'witty' | 'dark'
type TimeSlot = 'morning' | 'afternoon' | 'evening'

function getTimeSlot(): TimeSlot {
  const h = new Date().getUTCHours() + 3 // Kyiv offset (UTC+3)
  if (h >= 6  && h < 12) return 'morning'
  if (h >= 12 && h < 18) return 'afternoon'
  return 'evening'
}

function getTodayStr(): string {
  const d = new Date()
  d.setHours(d.getHours() + 3) // Kyiv
  return d.toISOString().slice(0, 10)
}

// ── Pose per slot × mode ──────────────────────────────────────────────────────

const SLOT_POSE: Record<TimeSlot, Record<MimirMode, string>> = {
  morning:   { wise: 'idle',     witty: 'writing',   dark: 'idle'      },
  afternoon: { wise: 'pointing', witty: 'writing',   dark: 'skeptical' },
  evening:   { wise: 'idle',     witty: 'skeptical', dark: 'idle'      },
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(mode: MimirMode): string {
  const base = `Ти Мімір — охоронець криниці мудрості з нордичної міфології. Ти знаєш все що відбувається в житті юзера через його дані в застосунку MIMIR.
Твоя відповідь: ОДНЕ речення (максимум 15 слів). Без пояснень, без вступу, без дужок. Тільки суть.
Мова: українська. Стиль:`

  if (mode === 'wise')  return `${base} спокійний, глибокий. Говориш як стародавній мудрець — рідко, але влучно. Не банальна мотивація.`
  if (mode === 'witty') return `${base} іронічний, але не злий. Norse dry wit. Помічаєш очевидне з легким сарказмом.`
  return `${base} похмурий фаталіст. Час минає, Рагнарок неминучий — але ти не панікуєш, просто констатуєш.`
}

// ── Context builder ───────────────────────────────────────────────────────────

async function buildContext(userId: string, slot: TimeSlot): Promise<string> {
  const today = getTodayStr()

  const [tasks, mood, recentTx] = await Promise.all([
    SprintTask.find({ userId, deletedAt: null }).select('title done dueDate').lean(),
    MoodLog.find({ userId }).sort({ date: -1 }).limit(3).select('date score').lean(),
    Transaction.find({ userId }).sort({ createdAt: -1 }).limit(5).select('type amount desc').lean(),
  ])

  const todayTasks   = tasks.filter(t => t.dueDate === today)
  const overdue      = tasks.filter(t => t.dueDate && t.dueDate < today && !t.done)
  const doneToday    = tasks.filter(t => t.done && t.dueDate === today)
  const openToday    = todayTasks.filter(t => !t.done)
  const avgMood      = mood.length ? (mood.reduce((s, m) => s + m.score, 0) / mood.length).toFixed(1) : null

  const lines: string[] = [
    `Час доби: ${slot === 'morning' ? 'ранок' : slot === 'afternoon' ? 'день' : 'вечір'}`,
    `Задачі на сьогодні: ${openToday.length} відкритих, ${doneToday.length} виконаних`,
    overdue.length > 0 ? `Прострочено: ${overdue.length} задач` : 'Прострочених задач немає',
    avgMood ? `Настрій за останні дні: ${avgMood}/5` : 'Настрій не відстежується',
  ]

  if (overdue.length > 0 && overdue.length <= 3) {
    lines.push(`Прострочені: ${overdue.map(t => `"${t.title}"`).join(', ')}`)
  }

  if (recentTx.length > 0) {
    const expenses = recentTx.filter(t => t.type === 'expense')
    if (expenses.length > 0) lines.push(`Останні витрати: ${expenses.length} транзакцій`)
  }

  return lines.join('\n')
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function getMimirHint(req: Request, res: Response): Promise<void> {
  const userId = req.userId!
  const mode   = (req.query.mode as MimirMode) ?? 'wise'
  const slot   = getTimeSlot()
  const today  = getTodayStr()
  const pose   = SLOT_POSE[slot][mode]

  // Return cached if exists
  const cached = await MimirCache.findOne({ userId, date: today, timeSlot: slot })
  if (cached) {
    res.json({ text: cached.text, pose: cached.pose, slot, cached: true })
    return
  }

  // Build context and call Claude
  const context = await buildContext(userId, slot)
  const systemPrompt = buildSystemPrompt(mode)
  const userPrompt = `Контекст юзера:\n${context}\n\nСкажи щось одне речення.`

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 80,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!aiRes.ok) {
      res.status(500).json({ error: 'Мімір мовчить' })
      return
    }

    const data = await aiRes.json() as { content: Array<{ type: string; text: string }> }
    const text = data.content[0]?.type === 'text' ? data.content[0].text.trim() : null

    if (!text) {
      res.status(500).json({ error: 'Мімір мовчить' })
      return
    }

    // Cache it — ignore duplicate key error (race condition)
    try {
      await MimirCache.create({ userId, date: today, timeSlot: slot, mode, text, pose })
    } catch { /* duplicate — fine */ }

    res.json({ text, pose, slot, cached: false })
  } catch {
    res.status(500).json({ error: 'Мімір мовчить' })
  }
}

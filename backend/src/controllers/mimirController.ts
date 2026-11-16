import { Request, Response } from 'express'
import SprintTask from '../models/SprintTask'
import MoodLog from '../models/MoodLog'
import Transaction from '../models/Transaction'
import MimirCache, { MimirOpenAiCache } from '../models/MimirCache'

type MimirMode = 'wise' | 'witty' | 'dark'
type TimeSlot = 'morning' | 'afternoon' | 'evening'

export function getKyivWindow(now: Date): { date: string; timeSlot: TimeSlot } {
  const date = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Kyiv', hour: '2-digit', hourCycle: 'h23',
  }).format(now))
  return { date, timeSlot: hour >= 6 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'evening' }
}

// ── Pose per slot × mode ──────────────────────────────────────────────────────

const SLOT_POSE: Record<TimeSlot, Record<MimirMode, string>> = {
  morning:   { wise: 'idle',     witty: 'writing',   dark: 'idle'      },
  afternoon: { wise: 'pointing', witty: 'writing',   dark: 'skeptical' },
  evening:   { wise: 'idle',     witty: 'skeptical', dark: 'idle'      },
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(mode: MimirMode): string {
  const base = `Ти Мімір — охоронець криниці мудрості з нордичної міфології. Реагуй на один конкретний факт із контексту. Не вигадуй подій або причин; якщо нема задач, відреагуй на час доби.
Твоя відповідь: ОДНЕ речення (максимум 15 слів). Без пояснень, без вступу, без дужок. Тільки суть.
Мова: українська. Стиль:`

  if (mode === 'wise')  return `${base} спокійний, глибокий. Говориш як стародавній мудрець — рідко, але влучно. Не банальна мотивація.`
  if (mode === 'witty') return `${base} іронічний, але не злий. Norse dry wit. Помічаєш очевидне з легким сарказмом.`
  return `${base} похмурий фаталіст. Час минає, Рагнарок неминучий — але ти не панікуєш, просто констатуєш.`
}

// ── Context builder ───────────────────────────────────────────────────────────

async function buildContext(userId: string, slot: TimeSlot, today: string): Promise<string> {
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

interface OpenAiHint {
  text: string
  pose: string
  slot: TimeSlot
  cached: boolean
  canDiscussOverdue?: boolean
}

const pilotInFlight = new Map<string, Promise<OpenAiHint>>()

export function isMimirOpenAiPilot(userId?: string): boolean {
  return !!userId && userId === process.env.MIMIR_OPENAI_USER_ID?.trim() &&
    !!process.env.OPENAI_API_KEY?.trim()
}

async function generatePilotHint(
  userId: string, date: string, timeSlot: TimeSlot, mode: MimirMode,
): Promise<OpenAiHint> {
  const key = { userId, date, timeSlot }
  const cached = await MimirOpenAiCache.findOne(key).lean()
  if (cached) return { text: cached.text, pose: cached.pose, slot: timeSlot, cached: true, ...(cached.overdueOpenTasks ? { canDiscussOverdue: true } : {}) }

  const openTasks = { userId, deletedAt: null, done: false }
  const [openTasksDueToday, overdueOpenTasks, history] = await Promise.all([
    SprintTask.countDocuments({ ...openTasks, dueDate: date }),
    SprintTask.countDocuments({ ...openTasks, dueDate: { $lt: date, $gt: '' } }),
    MimirOpenAiCache.find({
      userId,
      createdAt: { $gte: new Date(Date.now() - 25 * 60 * 60 * 1000) },
      $nor: [{ date, timeSlot }],
    }).sort({ createdAt: -1 }).limit(3)
      .select('date timeSlot text openTasksDueToday overdueOpenTasks -_id').lean(),
  ])
  const counts = { openTasksDueToday, overdueOpenTasks }
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY?.trim()}`,
    },
    signal: AbortSignal.timeout(6000),
    body: JSON.stringify({
      model: 'gpt-5-mini',
      instructions: `${buildSystemPrompt(mode)}
Якщо є прострочені задачі, згадай їх у репліці.
history — твої попередні репліки та тодішні лічильники, від новішого до старішого. Якщо зміна помітна, природно продовж думку; інакше скажи щось свіже або відреагуй на час доби. Не повторюй реплік. Факти бери з current. Менше прострочених задач саме по собі не означає, що їх виконали.`,
      input: JSON.stringify({ current: { date, timeSlot, ...counts }, history }),
      reasoning: { effort: 'minimal' },
      max_output_tokens: 120,
      store: false,
    }),
  })
  if (!response.ok) throw new Error('OpenAI request failed')

  const data = await response.json() as {
    status: string
    output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>
  }
  const text = data.output?.filter(item => item.type === 'message')
    .flatMap(item => item.content ?? [])
    .find(part => part.type === 'output_text')?.text?.trim()
  if (data.status !== 'completed' || !text || text.length > 180 || /[\r\n]/.test(text)) {
    throw new Error('Invalid Mimir reply')
  }

  const saved = await MimirOpenAiCache.findOneAndUpdate(
    key, { $setOnInsert: { mode, text, pose: SLOT_POSE[timeSlot][mode], ...counts } },
    { upsert: true, new: true },
  ).lean()
  return { text: saved.text, pose: saved.pose, slot: timeSlot, cached: false, ...(saved.overdueOpenTasks ? { canDiscussOverdue: true } : {}) }
}

export async function getMimirHint(req: Request, res: Response): Promise<void> {
  const userId = req.userId!
  const mode = req.query.mode ?? 'wise'
  res.set('Cache-Control', 'private, no-store')
  if (mode !== 'wise' && mode !== 'witty' && mode !== 'dark') {
    res.status(400).json({ error: 'Invalid Mimir mode' })
    return
  }
  const { date: today, timeSlot: slot } = getKyivWindow(new Date())

  if (isMimirOpenAiPilot(userId)) {
    const key = `${userId}:${today}:${slot}`
    try {
      const pending = pilotInFlight.get(key) ?? generatePilotHint(userId, today, slot, mode)
        .finally(() => pilotInFlight.delete(key))
      pilotInFlight.set(key, pending)
      res.json(await pending)
    } catch {
      res.status(503).json({ error: 'Мімір мовчить' })
    }
    return
  }

  const pose   = SLOT_POSE[slot][mode]

  // Return cached if exists
  const cached = await MimirCache.findOne({ userId, date: today, timeSlot: slot })
  if (cached) {
    res.json({ text: cached.text, pose: cached.pose, slot, cached: true })
    return
  }

  // Build context and call Claude
  const context = await buildContext(userId, slot, today)
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

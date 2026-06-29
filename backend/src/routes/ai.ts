import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { requireVerified } from '../middleware/requireVerified'
import Transaction from '../models/Transaction'
import SprintTask from '../models/SprintTask'
import TodoItem from '../models/TodoItem'
import Recipe from '../models/Recipe'
import WatchlistItem from '../models/WatchlistItem'
import { User } from '../models/User'

const router = Router()
router.use(requireAuth)
router.use(requireVerified)

// ── Domain detection ─────────────────────────────────────────────────────────

const DOMAINS: Record<string, string[]> = {
  finance:   ['витрат', 'баланс', 'гроші', 'грн', 'купив', 'платіж', 'транзакц', 'бюджет', 'заробив', 'поповн', 'фінанс', 'дохід', 'витрата', 'скільки'],
  sprint:    ['задач', 'квест', 'звичк', 'зробити', 'спринт', 'виконати', 'план', 'тиждень', 'сьогодні', 'todo', 'дедлайн', 'покупк'],
  recipes:   ['рецепт', 'приготув', 'страв', 'їжа', 'готував', 'інгредієнт', 'кухн', 'обід', 'вечер', 'сніданок'],
  watchlist: ['фільм', 'серіал', 'аніме', 'книг', 'дивив', 'читав', 'подивитись', 'подивився', 'вотчліст'],
  memories:  ['спогад', "пам'ят", 'пам\'ят', 'фото', 'спогади', 'минул'],
}

function detectDomains(message: string): string[] {
  const lower = message.toLowerCase()
  return Object.entries(DOMAINS)
    .filter(([, keywords]) => keywords.some(k => lower.includes(k)))
    .map(([domain]) => domain)
}

// ── Fetch context data ───────────────────────────────────────────────────────

async function buildContext(userId: string, domains: string[]): Promise<string> {
  const parts: string[] = []
  const today = new Date().toISOString().slice(0, 10)

  if (domains.includes('finance')) {
    const user = await User.findById(userId).select('salaryDay').lean()
    const txs = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(30).lean()
    const balance = txs.reduce((s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0)
    const thisMonth = txs.filter(t => t.date >= today.slice(0, 7))
    const spent = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const income = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const recent = txs.slice(0, 10).map(t => `${t.date} ${t.type === 'expense' ? '-' : '+'}${t.amount}₴ ${t.desc || t.category || ''}`).join('\n')
    parts.push(`ФІНАНСИ:
Баланс: ${Math.round(balance)}₴
Цього місяця витрачено: ${Math.round(spent)}₴, доходи: ${Math.round(income)}₴
День зарплати: ${(user as { salaryDay?: number })?.salaryDay ?? 1}
Останні транзакції:
${recent}`)
  }

  if (domains.includes('sprint')) {
    const tasks = await SprintTask.find({ userId, done: false }).sort({ createdAt: -1 }).limit(20).lean()
    const todos = await TodoItem.find({ userId, done: false }).sort({ createdAt: -1 }).limit(10).lean()
    const todayTasks = tasks.filter(t => !t.dueDate || t.dueDate === today)
    parts.push(`ЗАДАЧІ/КВЕСТИ:
Активних квестів: ${tasks.length}
Сьогодні: ${todayTasks.map(t => `• ${t.title}`).join('\n') || 'немає'}
Решта: ${tasks.slice(0, 10).map(t => `• ${t.title}${t.dueDate ? ` (до ${t.dueDate})` : ''}`).join('\n')}
Todo: ${todos.map(t => `• ${t.title}`).join('\n') || 'немає'}`)
  }

  if (domains.includes('recipes')) {
    const recipes = await Recipe.find({ $or: [{ userId }, { scope: 'all' }] }).select('title category cookTime').limit(30).lean()
    parts.push(`РЕЦЕПТИ (${recipes.length}):
${recipes.map(r => `• ${r.title} (${r.category ?? '—'}, ${r.cookTime ?? '?'} хв)`).join('\n')}`)
  }

  if (domains.includes('watchlist')) {
    const items = await WatchlistItem.find({ userId }).sort({ updatedAt: -1 }).limit(20).lean()
    const watching = items.filter(i => i.status === 'watching')
    const wantTo   = items.filter(i => i.status === 'want')
    parts.push(`WATCHLIST:
Зараз дивлюся/читаю: ${watching.map(i => `${i.title} (${i.category})`).join(', ') || 'нічого'}
Хочу: ${wantTo.slice(0, 8).map(i => i.title).join(', ') || 'нічого'}`)
  }

  if (domains.length === 0) {
    // Generic: brief overview
    const txCount = await Transaction.countDocuments({ userId })
    const taskCount = await SprintTask.countDocuments({ userId, done: false })
    parts.push(`Загальний контекст: ${taskCount} активних задач, ${txCount} транзакцій в базі.`)
  }

  return parts.join('\n\n')
}

// ── POST /api/ai/chat (SSE streaming) ────────────────────────────────────────

router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  const { message } = req.body as { message?: string }
  if (!message?.trim()) { res.status(400).json({ error: 'message required' }); return }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) { res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' }); return }

  const userId   = req.userId as string
  const domains  = detectDomains(message)
  const context  = await buildContext(userId, domains)
  const userName = (await User.findById(userId).select('name').lean() as { name?: string } | null)?.name ?? 'Користувач'
  const today    = new Date().toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const systemPrompt = `Ти MIMIR — особистий AI-асистент органайзеру. Відповідаєш лаконічно, по-людськи, українською.
Користувач: ${userName}. Сьогодні: ${today}.

${context ? `Дані користувача:\n${context}` : 'Даних не знайдено — відповідай загально.'}`

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        stream: true,
        system: systemPrompt,
        messages: [{ role: 'user', content: message.trim() }],
      }),
    })

    if (!anthropicRes.ok || !anthropicRes.body) {
      res.write(`data: [ERROR] Anthropic error ${anthropicRes.status}\n\n`)
      res.end(); return
    }

    const reader  = anthropicRes.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const raw = decoder.decode(value, { stream: true })
      for (const line of raw.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          const parsed = JSON.parse(payload) as { type: string; delta?: { type: string; text?: string } }
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            res.write(`data: ${JSON.stringify(parsed.delta.text)}\n\n`)
          }
        } catch { /* skip malformed */ }
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    res.write(`data: [ERROR] ${String(err)}\n\n`)
    res.end()
  }
})

// ── POST /api/ai/chef-chat (SSE streaming, контекст конкретного рецепту) ─────

interface ChefRecipe {
  title: string
  ingredients?: (string | { name: string; amount?: string; unit?: string })[]
  instructions?: string[]
  steps?: string
  servings?: number
  difficulty?: string
  cookTime?: number
  calories?: number
}

function ingredientLine(ing: string | { name: string; amount?: string; unit?: string }): string {
  if (typeof ing === 'string') return `• ${ing}`
  return `• ${[ing.amount, ing.unit, ing.name].filter(Boolean).join(' ')}`
}

function buildRecipeContext(recipe: ChefRecipe): string {
  const ingredients = (recipe.ingredients ?? []).map(ingredientLine).join('\n') || '—'
  const steps = recipe.instructions?.length
    ? recipe.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n')
    : (recipe.steps?.trim() || '—')

  return `Рецепт: ${recipe.title}
Порції: ${recipe.servings ?? '?'}
Складність: ${recipe.difficulty ?? '?'}
Час приготування: ${recipe.cookTime ?? '?'} хв
${recipe.calories ? `Калорійність: ${recipe.calories} ккал\n` : ''}
Інгредієнти:
${ingredients}

Кроки приготування:
${steps}`
}

router.post('/chef-chat', async (req: Request, res: Response): Promise<void> => {
  const { message, recipe } = req.body as { message?: string; recipe?: ChefRecipe }
  if (!message?.trim()) { res.status(400).json({ error: 'message required' }); return }
  if (!recipe?.title) { res.status(400).json({ error: 'recipe required' }); return }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) { res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' }); return }

  const systemPrompt = `Ти MIMIR — кулінарний AI-асистент, допомагаєш користувачу з конкретним рецептом, який він зараз готує або переглядає.
Відповідай лаконічно, по-людськи, українською. Допомагай із заміною інгредієнтів, адаптацією порцій або дієтичних обмежень, калорійністю, підказками під час готування — предметно для цього рецепту, не загальними радами.

${buildRecipeContext(recipe)}`

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        stream: true,
        system: systemPrompt,
        messages: [{ role: 'user', content: message.trim() }],
      }),
    })

    if (!anthropicRes.ok || !anthropicRes.body) {
      res.write(`data: [ERROR] Anthropic error ${anthropicRes.status}\n\n`)
      res.end(); return
    }

    const reader  = anthropicRes.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const raw = decoder.decode(value, { stream: true })
      for (const line of raw.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          const parsed = JSON.parse(payload) as { type: string; delta?: { type: string; text?: string } }
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            res.write(`data: ${JSON.stringify(parsed.delta.text)}\n\n`)
          }
        } catch { /* skip malformed */ }
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    res.write(`data: [ERROR] ${String(err)}\n\n`)
    res.end()
  }
})

export default router

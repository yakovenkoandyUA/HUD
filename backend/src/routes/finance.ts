import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import Transaction from '../models/Transaction'
import FinancialReport from '../models/FinancialReport'

const router = Router()
router.use(requireAuth)

// ── Helpers ──────────────────────────────────────────────────────────────────

interface ReceiptData {
  store: string
  items: { name: string; price: number; category?: string }[]
}

function parseReceiptDesc(desc: string): ReceiptData | null {
  if (!desc?.startsWith('{')) return null
  try {
    const d = JSON.parse(desc) as ReceiptData
    if (!d.store || !Array.isArray(d.items)) return null
    return d
  } catch {
    return null
  }
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  if (m === 1) return `${y - 1}-12`
  return `${y}-${String(m - 1).padStart(2, '0')}`
}

function buildPrompt(
  month: string,
  categoryTotals: Record<string, { cur: number; prev: number }>,
  receiptData: { store: string; items: { name: string; price: number }[] }[],
  dayOfWeekTotals: number[],
): string {
  const monthLabel = new Date(`${month}-15`).toLocaleString('uk-UA', { month: 'long', year: 'numeric' })

  const categoriesText = Object.entries(categoryTotals)
    .sort((a, b) => b[1].cur - a[1].cur)
    .slice(0, 10)
    .map(([cat, { cur, prev }]) => {
      const delta = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null
      const deltaStr = delta !== null ? ` (${delta > 0 ? '+' : ''}${delta}% vs попереднього місяця)` : ''
      return `  - ${cat}: ${cur}₴${deltaStr}`
    }).join('\n')

  // Build store → item → prices map
  const storeItems: Record<string, Record<string, number[]>> = {}
  for (const r of receiptData) {
    const s = r.store.trim()
    if (!storeItems[s]) storeItems[s] = {}
    for (const item of r.items) {
      const n = item.name.trim()
      if (!storeItems[s][n]) storeItems[s][n] = []
      storeItems[s][n].push(item.price)
    }
  }

  const receiptsText = Object.entries(storeItems).map(([store, items]) => {
    const itemLines = Object.entries(items)
      .map(([name, prices]) => {
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length
        return `    • ${name}: ${prices.map(p => `${p}₴`).join(', ')}${prices.length > 1 ? ` (сер. ${avg.toFixed(1)}₴)` : ''}`
      }).join('\n')
    return `  ${store} (${receiptData.filter(r => r.store.trim() === store).length} чеків):\n${itemLines}`
  }).join('\n') || '  Немає даних з чеків за цей місяць'

  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
  const dowText = dayOfWeekTotals.map((v, i) => `${days[i]}: ${v}₴`).join(', ')

  return `Ти фінансовий аналітик. Проаналізуй витрати за ${monthLabel} і дай практичні поради українською.

ВИТРАТИ ПО КАТЕГОРІЯХ:
${categoriesText}

ДАНІ З ВІДСКАНОВАНИХ ЧЕКІВ (магазини і позиції):
${receiptsText}

ВИТРАТИ ПО ДНЯХ ТИЖНЯ (загальна сума):
${dowText}

Надай аналіз у форматі markdown з такими розділами (використовуй ## для заголовків):

## 🏪 Рейтинг магазинів
На основі відсканованих чеків — який магазин вигідніший для яких категорій товарів. Якщо один і той самий товар є в кількох магазинах — порівняй ціни.

## ⚠️ Цінові аномалії
Незвичайно висока ціна на якийсь товар порівняно з іншими чеками (якщо є дані). Або різкий стрибок витрат у якійсь категорії.

## 📈 Інфляція у твоєму кошику
Порівняй ціни на конкретні товари між чеками різних дат цього місяця (або з попереднім місяцем якщо є дані по категоріях). Обчисли приблизний % подорожчання.

## 🛒 Оптимізація покупок
Якби ти купував певні товари в дешевшому магазині — скільки міг би заощадити? Конкретні рекомендації з цифрами.

## 🕐 Патерни витрат
Який день тижня найдорожчий і чому (можливо, великі покупки у вихідні?). Які категорії можна оптимізувати виходячи з патернів.

Якщо даних з чеків немає або мало — пиши про це чесно і давай поради на основі категорій. Будь конкретним, з цифрами. Не більше 400 слів загалом.`
}

// ── Routes ────────────────────────────────────────────────────────────────────

/** GET /api/finance/report/:month — cached report or 404 */
router.get('/report/:month', async (req: Request, res: Response): Promise<void> => {
  const { month } = req.params
  if (!/^\d{4}-\d{2}$/.test(month)) { res.status(400).json({ error: 'Invalid month format' }); return }

  const report = await FinancialReport.findOne({ userId: req.userId, month })
  if (!report) { res.status(404).json({ error: 'No report yet' }); return }
  res.json({ content: report.content, generatedAt: report.generatedAt })
})

/** POST /api/finance/report/:month — generate (or regenerate) report */
router.post('/report/:month', async (req: Request, res: Response): Promise<void> => {
  const { month } = req.params
  if (!/^\d{4}-\d{2}$/.test(month)) { res.status(400).json({ error: 'Invalid month format' }); return }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) { res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' }); return }

  const prev = prevMonth(month)
  const [curTxs, prevTxs] = await Promise.all([
    Transaction.find({ userId: req.userId, type: 'expense', date: { $regex: `^${month}` } }),
    Transaction.find({ userId: req.userId, type: 'expense', date: { $regex: `^${prev}` } }),
  ])

  // Category totals
  const categoryTotals: Record<string, { cur: number; prev: number }> = {}
  const SKIP = ['накопичення']
  for (const t of curTxs) {
    const cat = (t.category || 'Інше').toLowerCase()
    if (SKIP.some(s => cat.includes(s))) continue
    if (!categoryTotals[t.category]) categoryTotals[t.category] = { cur: 0, prev: 0 }
    categoryTotals[t.category].cur += t.amount
  }
  for (const t of prevTxs) {
    const cat = (t.category || 'Інше').toLowerCase()
    if (SKIP.some(s => cat.includes(s))) continue
    if (!categoryTotals[t.category]) categoryTotals[t.category] = { cur: 0, prev: 0 }
    categoryTotals[t.category].prev += t.amount
  }

  // Receipt data
  const receiptData: { store: string; items: { name: string; price: number }[]; date: string }[] = []
  for (const t of curTxs) {
    const r = parseReceiptDesc(t.desc)
    if (r) receiptData.push({ ...r, date: t.date })
  }

  // Day of week totals (Mon=0 … Sun=6)
  const dowTotals = [0, 0, 0, 0, 0, 0, 0]
  for (const t of curTxs) {
    const d = new Date(t.date)
    const dow = (d.getDay() + 6) % 7
    dowTotals[dow] += t.amount
  }

  const prompt = buildPrompt(month, categoryTotals, receiptData, dowTotals)

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!aiRes.ok) { res.status(502).json({ error: 'AI error' }); return }

    const aiData = await aiRes.json() as { content: Array<{ type: string; text: string }> }
    const content = aiData.content[0]?.type === 'text' ? aiData.content[0].text : ''

    await FinancialReport.findOneAndUpdate(
      { userId: req.userId, month },
      { content, generatedAt: new Date() },
      { upsert: true, new: true }
    )

    res.json({ content, generatedAt: new Date() })
  } catch {
    res.status(500).json({ error: 'Помилка генерації аналізу' })
  }
})

export default router

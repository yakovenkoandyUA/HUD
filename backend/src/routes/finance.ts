import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { requireVerified } from '../middleware/requireVerified'
import Transaction from '../models/Transaction'
import FinancialReport from '../models/FinancialReport'
import { User } from '../models/User'

const STYLE_PERSONAS: Record<string, string> = {
  standard: '',
  coach: `Ти суворий особистий фінансовий тренер. Говориш прямо і жорстко, без м'яких слів. Якщо бачиш дурні витрати — кажеш це в лоб. Можеш матюкнутись для акценту (не більше 1-2 разів, цензурно: "чорт", "біс", "та ну нафіг"). Мотивуєш через тиск і реальні факти.`,
  yoda: `Ти Майстер Йода і аналізуєш фінанси. ОБОВ'ЯЗКОВО говориш інвертованими реченнями у стилі Йоди — підмет завжди в кінці: "Великі витрати маєш ти", "Продукти дорого коштують, хм?", "Мудріше витрачати треба, молодий падаван". Мудрий, спокійний, з гумором.`,
  kozak: `Ти старий козак-характерник з Запорізької Січі що аналізує сучасні фінанси. Звертаєшся "браче", "козаче", "товаришу". Порівнюєш сучасні витрати з козацьким побутом. Прямий і чесний як козацька шабля.`,
  motivator: `Ти надміру позитивний мотиватор у стилі американського Ted Talk. КОЖНА проблема — це можливість для зростання. Вживаєш "Ти МОЛОДЕЦЬ!", "НЕЙМОВІРНО!", "ЦЕ КРОКИ ДО УСПІХУ!" навіть якщо витрати жахливі. Пишеш важливе КАПСЛОКОМ.`,
  accountant: `Ти педантичний бухгалтер з 30-річним стажем. Тільки цифри, відсотки, коефіцієнти. Жодних емоцій. Жодних метафор. Якщо щось неможливо виразити числом — про це не пишеш. Дуже сухо і точно.`,
}

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
  reportStyle = 'standard',
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

  const persona = STYLE_PERSONAS[reportStyle] || ''
  const personaLine = persona ? `${persona}\n\n` : ''

  return `${personaLine}Проаналізуй витрати за ${monthLabel} і дай чіткі практичні поради українською.

ВИТРАТИ ПО КАТЕГОРІЯХ:
${categoriesText}

ДАНІ З ВІДСКАНОВАНИХ ЧЕКІВ (магазини і позиції):
${receiptsText}

ВИТРАТИ ПО ДНЯХ ТИЖНЯ (загальна сума):
${dowText}

Надай аналіз у форматі markdown. Правила форматування:
- Заголовки: ## з емодзі
- Списки: тільки через "- " (без таблиць — вони погано читаються на мобільному)
- Числа: конкретні суми в гривнях, відсотки де доречно
- Якщо даних мало — скажи про це і дай поради на основі того що є

## 🏪 Магазини
Порівняй магазини де є дані з чеків. Вкажи конкретні ціни на однакові товари якщо купував в кількох місцях. Що де вигідніше брати.

## ⚠️ На що витрачаєш забагато
Конкретні позиції або категорії з явно зависокою ціною або аномальним ростом. Назви суму і чому це багато.

## 📊 Патерн тижня
Короткий аналіз днів тижня — коли найбільші витрати і що це означає. Чи є проблема з вихідними/імпульсивними покупками.

## 💡 Три конкретні дії
Рівно три пункти — що зробити вже зараз щоб витрачати менше. Кожен пункт: дія + очікувана економія в гривнях за місяць.

Максимум 320 слів. Будь прямим, без вступу та підсумків — тільки суть.`
}

// ── Routes ────────────────────────────────────────────────────────────────────

/** GET /api/finance/report/:month — cached report or 404 */
router.get('/report/:month', async (req: Request, res: Response): Promise<void> => {
  const { month } = req.params
  if (!/^\d{4}-\d{2}$/.test(month)) { res.status(400).json({ error: 'Invalid month format' }); return }

  const report = await FinancialReport.findOne({ userId: req.userId, month })
  if (!report) { res.json({ content: null }); return }
  res.json({ content: report.content, generatedAt: report.generatedAt })
})

/** POST /api/finance/report/:month — generate (or regenerate) report */
router.post('/report/:month', requireVerified, async (req: Request, res: Response): Promise<void> => {
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

  const userDoc = await User.findById(req.userId, { reportStyle: 1 })
  const reportStyle = userDoc?.reportStyle ?? 'standard'
  const prompt = buildPrompt(month, categoryTotals, receiptData, dowTotals, reportStyle)

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
        max_tokens: 1600,
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

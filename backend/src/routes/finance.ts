import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { requireVerified } from '../middleware/requireVerified'
import { loadUser } from '../middleware/loadUser'
import { requireFeature } from '../utils/entitlements'
import Transaction from '../models/Transaction'
import FinancialReport from '../models/FinancialReport'
import { User } from '../models/User'

// flash — ультракороткий: 4-5 речень, один інсайт, одна дія
// standard — повний аналіз від Міміра
// audit — детальний: всі категорії, глибокі порівняння

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

const STYLE_PERSONAS: Record<string, string> = {
  flash:    'Ти Мімір. Коротко: 4-5 речень, один головний інсайт, одна дія.',
  audit:    'Ти Мімір — дотошний аудитор. Розбери кожну категорію детально, порівняй з попереднім місяцем, знайди аномалії.',
  standard: '',
}

function buildPrompt(
  month: string,
  categoryTotals: Record<string, { cur: number; prev: number }>,
  receiptData: { store: string; items: { name: string; price: number }[] }[],
  dayOfWeekTotals: number[],
  reportStyle = 'standard',
  transactions: { desc: string; category: string; amount: number }[] = [],
  userContext: { category?: string; note: string }[] = [],
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

  // Individual transactions — skip JSON receipts (already in receiptsText), skip очевидні описи
  const txLines = transactions
    .filter(t => t.desc && !t.desc.startsWith('{'))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 60)
    .map(t => `  - "${t.desc}" [${t.category}] ${t.amount}₴`)
    .join('\n') || '  Немає'

  const intro = `Ти Мімір — особистий фінансовий провідник. Говориш від першої особи, тепло але чесно, як старший друг який добре розбирається в цифрах. Не читаєш мораль, але помічаєш те, що людина сама не бачить. Іноді дозволяєш собі легкий іронічний коментар.`

  const dataBlock = `ВИТРАТИ ПО КАТЕГОРІЯХ (поточний vs попередній місяць):
${categoriesText}

ОКРЕМІ ТРАНЗАКЦІЇ (назва → категорія → сума; до 60 найбільших):
${txLines}
Зверни увагу: назва транзакції може розкривати суть краще ніж категорія — наприклад "KFC" в категорії "Кава" означає каву в KFC, "Травичка" в "Улюбленець" — корм/трава для тварини тощо.

ДАНІ З ВІДСКАНОВАНИХ ЧЕКІВ:
${receiptsText}

ВИТРАТИ ПО ДНЯХ ТИЖНЯ:
${dowText}`

  const userContextBlock = userContext.length > 0
    ? `\nКОНТЕКСТ ВІД КОРИСТУВАЧА:\n${userContext.map(c => `  - ${c.category ? `[${c.category}] ` : ''}${c.note}`).join('\n')}\n`
    : ''

  if (reportStyle === 'flash') {
    return `${intro}

Проаналізуй витрати за ${monthLabel} українською мовою.
${userContextBlock}
${dataBlock}

Дай ДУЖЕ короткий аналіз: рівно 4-5 речень без жодних заголовків і списків. Одне речення — що одразу кинулося в очі. Одне-два речення — головний патерн або аномалія. Одне речення — єдина конкретна дія з очікуваною економією ₴. Більше нічого. Жодного markdown.`
  }

  if (reportStyle === 'audit') {
    return `${intro}

Проаналізуй витрати за ${monthLabel} українською мовою. Це детальний аудит — розбери все ретельно, не скорочуй.
${userContextBlock}
${dataBlock}

Формат відповіді — markdown без таблиць (мобільний екран). Заголовки ## з одним коротким емодзі. Списки через "- ".

Структура:
1. Одне відкриваюче речення — головний висновок місяця одразу, без вступу.
2. ## Повна картина витрат — всі категорії від найбільшої до найменшої: суми, відсотки від загального, динаміка vs попередній місяць. Якщо є нові або зниклі категорії — відміть окремо.
3. ## Де гроші вислизають — конкретні аномалії і надлишки. Якщо є дані чеків — порівняй ціни по магазинах і конкретних позиціях.
4. ## Патерни і зв'язки — дні тижня (коли витрачаєш найбільше і чому), сезонні фактори, повторювані транзакції, неочевидні зв'язки між категоріями.
5. ## Несподіваний інсайт — одне спостереження яке людина точно сама б не помітила: прихований патерн, дивна кореляція, або цікавий факт з цифр.
6. ## П'ять конкретних дій — детальні кроки з очікуваною економією ₴ кожен. Конкретні місця, суми, альтернативи.

Максимум 420 слів. Тільки конкретика з цих даних.`
  }

  // standard (default)
  return `${intro}

Проаналізуй витрати за ${monthLabel} українською мовою.
${userContextBlock}
${dataBlock}

Формат відповіді — markdown без таблиць (мобільний екран). Заголовки ## з одним коротким емодзі. Списки через "- ".

Структура:
1. Одне відкриваюче речення від мене — що впало в очі одразу, без вступу і "отже".
2. ## Де гроші йдуть охоче — 2-3 спостереження по категоріях. Говори конкретно: суми, динаміка, що це означає насправді. Якщо є аномальний ріст — скажи прямо і запитай себе вголос "що сталось?"
3. ## Де можна зекономити — якщо є дані чеків, порівняй магазини і конкретні позиції. Якщо ні — на основі категорій.
4. ## Несподіваний інсайт — одне нестандартне спостереження яке людина сама б не помітила: патерн по днях тижня, прихований зв'язок між категоріями, або цікавий факт з цифр.
5. ## Три дії на цей тиждень — конкретні, маленькі, реалістичні. Не "скорочуй витрати", а "перестань купувати X там-то і ось скільки залишиться". Кожна дія — одне речення + очікувана економія ₴.

Максимум 280 слів. Жодних загальних фраз типу "важливо контролювати витрати". Тільки конкретика з цих даних.`
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
router.post('/report/:month', requireVerified, loadUser, requireFeature('advancedFinance'), async (req: Request, res: Response): Promise<void> => {
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

  const userDoc = await User.findById(req.userId, { reportStyle: 1, financeContext: 1 })
  const reportStyle = userDoc?.reportStyle ?? 'standard'
  const userContext = (userDoc?.financeContext ?? []).map(c => ({ category: c.category, note: c.note }))
  const txForPrompt = curTxs
    .filter(t => t.desc)
    .map(t => ({ desc: t.desc as string, category: t.category || 'Інше', amount: t.amount }))
  const prompt = buildPrompt(month, categoryTotals, receiptData, dowTotals, reportStyle, txForPrompt, userContext)

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

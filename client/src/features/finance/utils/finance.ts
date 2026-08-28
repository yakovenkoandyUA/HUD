export function fmt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function getDaysLeftInMonth(salaryDay = 1): number {
  const now = new Date()
  const today = now.getDate()
  // <= (not <): on salaryDay itself, treat today as the tail of the previous
  // cycle rather than day 1 of a fresh one — the new income likely isn't
  // logged as a transaction yet, so dividing the pre-payday balance across
  // a full new month would show a misleadingly tiny daily budget.
  const nextPayday = today <= salaryDay
    ? new Date(now.getFullYear(), now.getMonth(), salaryDay)
    : new Date(now.getFullYear(), now.getMonth() + 1, salaryDay)
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), today)
  return Math.round((nextPayday.getTime() - todayMidnight.getTime()) / 86_400_000)
}

export function getDaysElapsed(salaryDay = 1): number {
  const now = new Date()
  const today = now.getDate()
  if (today >= salaryDay) {
    return today - salaryDay
  }
  const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
  return prevMonthLastDay - salaryDay + today
}

export function calcDailyBudget(balance: number, salaryDay = 1): number {
  return Math.floor(balance / Math.max(1, getDaysLeftInMonth(salaryDay)))
}

/**
 * Rolling daily allowance based on a fixed monthly spend limit.
 * Formula: (limit - spentThisMonthExcludingToday) / daysLeftInCalendarMonthIncludingToday
 * Returns null when no limit is set.
 */
export function calcRollingDailyAllowance(
  monthlyLimit: number | null,
  monthlySpent: number,
  todaySpent: number,
): number | null {
  if (!monthlyLimit) return null
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1)
  const spentBeforeToday = Math.max(0, monthlySpent - todaySpent)
  const remaining = Math.max(0, monthlyLimit - spentBeforeToday)
  return Math.floor(remaining / daysLeft)
}

export interface RecurringCandidate {
  key:         string
  name:        string
  amount:      number
  dayOfMonth:  number
  category:    string
  occurrences: number
  lastDate:    string
}

interface RecurringDetectionTransaction {
  type:          'topup' | 'expense'
  amount:        number
  date:          string
  title?:        string
  description:   string
  category?:     string
  recurringId?:  string | null
}

interface RecurringDetectionActivePayment {
  name: string
}

function normalizeTxName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Групує витрати за назвою + приблизно тією ж сумою і шукає кандидатів на
 * регулярний платіж — 2+ входження з інтервалом ~місяць (26-33 дні), яких ще
 * немає серед активних RecurringPayment. Чиста евристика, без LLM.
 */
export function detectRecurringCandidates(
  transactions: RecurringDetectionTransaction[],
  activeRecurring: RecurringDetectionActivePayment[],
): RecurringCandidate[] {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 4)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const activeNames = new Set(activeRecurring.map(p => normalizeTxName(p.name)))

  const groups = new Map<string, RecurringDetectionTransaction[]>()
  for (const t of transactions) {
    if (t.type !== 'expense' || t.recurringId || t.date < cutoffStr) continue
    const rawName = (t.title || t.description || '').trim()
    if (!rawName) continue
    const normName = normalizeTxName(rawName)
    if (activeNames.has(normName)) continue
    // бакет суми — округлення до найближчих 10, щоб зловити невеликі коливання (fx, чайові)
    const amountBucket = Math.round(t.amount / 10) * 10
    const key = `${normName}|${amountBucket}`
    const list = groups.get(key) ?? []
    list.push(t)
    groups.set(key, list)
  }

  const candidates: RecurringCandidate[] = []
  for (const [key, list] of groups) {
    if (list.length < 2) continue
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date))
    const first = new Date(sorted[0].date)
    const last  = sorted[sorted.length - 1].date
    const lastDate = new Date(last)
    const avgGapDays = (lastDate.getTime() - first.getTime()) / 86_400_000 / (sorted.length - 1)
    if (avgGapDays < 26 || avgGapDays > 33) continue

    const lastTx = sorted[sorted.length - 1]
    candidates.push({
      key,
      name:        (lastTx.title || lastTx.description || '').trim(),
      amount:      Math.round(sorted.reduce((s, t) => s + t.amount, 0) / sorted.length),
      dayOfMonth:  lastDate.getDate(),
      category:    lastTx.category || '',
      occurrences: sorted.length,
      lastDate:    last,
    })
  }

  return candidates.sort((a, b) => b.lastDate.localeCompare(a.lastDate))
}

export interface SalaryForecastTransaction {
  type:         'topup' | 'expense'
  amount:       number
  date:         string
  recurringId?: string | null
}

export interface SalaryForecastRecurringPayment {
  amount:     number
  dayOfMonth: number
  isActive:   boolean
}

export interface SalaryForecast {
  /** Прогнозований баланс на день зарплати */
  projected:              number
  /** Сума активних підписок, що спишуться до зарплати */
  upcomingRecurringTotal: number
  /** Середні витрати на день, без урахування підписок (щоб не задвоювати) */
  avgPerDayExRecurring:   number
}

/**
 * Прогноз "чи вистачить до зарплати" — на відміну від наївного
 * balance - avgPerDay*daysLeft, окремо враховує ще не списані підписки
 * (RecurringPayment) і рахує середнє витрат без них, щоб великий одноразовий
 * платіж підписки не спотворював щоденне середнє.
 */
export function calcSalaryForecast(
  balance: number,
  transactions: SalaryForecastTransaction[],
  recurringPayments: SalaryForecastRecurringPayment[],
  salaryDay = 1,
): SalaryForecast {
  const daysLeft     = getDaysLeftInMonth(salaryDay)
  const daysElapsed  = getDaysElapsed(salaryDay)
  const periodStart  = getPeriodStart(salaryDay)

  const expenseExRecurring = transactions
    .filter(t => t.type === 'expense' && !t.recurringId && t.date >= periodStart)
    .reduce((s, t) => s + t.amount, 0)
  const avgPerDayExRecurring = daysElapsed > 0 ? Math.round(expenseExRecurring / daysElapsed) : 0

  // Той самий "наступна зарплата" розрахунок що й getDaysLeftInMonth
  const now      = new Date()
  const today    = now.getDate()
  const monthsAhead = today <= salaryDay ? 0 : 1
  const nextPayday   = new Date(now.getFullYear(), now.getMonth() + monthsAhead, salaryDay)
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), today)

  const upcomingRecurringTotal = recurringPayments
    .filter(p => p.isActive)
    .reduce((sum, p) => {
      const daysInTargetMonth = new Date(now.getFullYear(), now.getMonth() + monthsAhead + 1, 0).getDate()
      const chargeDay  = Math.min(p.dayOfMonth, daysInTargetMonth)
      const chargeDate = new Date(now.getFullYear(), now.getMonth() + monthsAhead, chargeDay)
      const isUpcoming = chargeDate.getTime() > todayMidnight.getTime() && chargeDate.getTime() <= nextPayday.getTime()
      return isUpcoming ? sum + p.amount : sum
    }, 0)

  const projected = balance - avgPerDayExRecurring * daysLeft - upcomingRecurringTotal
  return { projected, upcomingRecurringTotal, avgPerDayExRecurring }
}

export function getPeriodStart(salaryDay = 1): string {
  const now = new Date()
  const today = now.getDate()
  const day = String(salaryDay).padStart(2, '0')
  if (today >= salaryDay) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${day}`
  }
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${day}`
}

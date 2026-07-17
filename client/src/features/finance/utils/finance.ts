export function fmt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function getDaysLeftInMonth(salaryDay = 1): number {
  const now = new Date()
  const today = now.getDate()
  const nextPayday = today < salaryDay
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

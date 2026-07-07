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

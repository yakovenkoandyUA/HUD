export function fmt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// Salary arrives on the 10th every month — budget period is 10th → 9th.
const PAYDAY = 10

export function getDaysLeftInMonth(): number {
  const now = new Date()
  const today = now.getDate()
  const nextPayday = today < PAYDAY
    ? new Date(now.getFullYear(), now.getMonth(), PAYDAY)
    : new Date(now.getFullYear(), now.getMonth() + 1, PAYDAY)
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), today)
  return Math.round((nextPayday.getTime() - todayMidnight.getTime()) / 86_400_000)
}

export function getDaysElapsed(): number {
  const now = new Date()
  const today = now.getDate()
  if (today >= PAYDAY) {
    return today - PAYDAY
  }
  // days since 10th of previous month
  const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
  return prevMonthLastDay - PAYDAY + today
}

export function calcDailyBudget(balance: number): number {
  return Math.floor(balance / Math.max(1, getDaysLeftInMonth()))
}

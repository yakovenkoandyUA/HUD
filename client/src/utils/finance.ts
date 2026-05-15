export function fmt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function getDaysLeftInMonth(): number {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return lastDay - now.getDate() + 1
}

export function getDaysElapsed(): number {
  return new Date().getDate() - 1
}

export function calcDailyBudget(balance: number): number {
  return Math.floor(balance / Math.max(1, getDaysLeftInMonth()))
}

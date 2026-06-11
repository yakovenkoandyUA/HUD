import { getDaysLeftInMonth } from '../../utils/finance'

export function calcDailyBudget(balance: number, salaryDay = 1): number {
  return Math.floor(balance / Math.max(1, getDaysLeftInMonth(salaryDay)))
}

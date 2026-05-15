import { getDaysLeftInMonth } from '../../utils/finance'

export function calcDailyBudget(balance: number): number {
  return Math.floor(balance / Math.max(1, getDaysLeftInMonth()))
}

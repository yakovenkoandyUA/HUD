import { randomBytes } from 'crypto'
import type { BillingInterval } from '../config/pricing'

/**
 * Generates an opaque order reference safe for use in URLs, logs, and WayForPay dashboard.
 * Does NOT include userId, planId, or interval — all mapping is in BillingOrder document.
 * Format: mimir_{YYYYMMDD}_{16 hex chars}
 */
export function generateOrderReference(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = randomBytes(8).toString('hex')
  return `mimir_${date}_${rand}`
}

/**
 * Calculates subscription end date using calendar-aware arithmetic.
 * Monthly: same day next month (handles end-of-month clamping).
 * Yearly: same day next year (handles Feb 29 → Feb 28 on non-leap years).
 */
export function calculateCurrentPeriodEnd(startDate: Date, interval: BillingInterval): Date {
  const d = new Date(startDate)

  if (interval === 'month') {
    const targetMonth = d.getMonth() + 1
    // Set to first of next month, then set day — handles month-end clamping
    const year = d.getFullYear() + (targetMonth > 11 ? 1 : 0)
    const month = targetMonth % 12
    const day = d.getDate()
    // Use the last valid day if target month has fewer days
    const maxDay = new Date(year, month + 1, 0).getDate()
    d.setFullYear(year, month, Math.min(day, maxDay))
  } else {
    const targetYear = d.getFullYear() + 1
    const month = d.getMonth()
    const day = d.getDate()
    // Feb 29 on non-leap year → Feb 28
    const maxDay = new Date(targetYear, month + 1, 0).getDate()
    d.setFullYear(targetYear, month, Math.min(day, maxDay))
  }

  return d
}

/**
 * Returns the end of the grace period (3 days after subscription end).
 * During grace period, user retains access while we wait for renewal.
 */
export function getGracePeriodEnd(currentPeriodEnd: Date): Date {
  const d = new Date(currentPeriodEnd)
  d.setDate(d.getDate() + 3)
  return d
}

/**
 * Safely normalizes WayForPay callback amount (UAH) to kopecks.
 * Accepts number or numeric string (e.g. 149, "149", "149.00", "149.9").
 * Returns null for empty strings, NaN, negative values, and non-numeric input.
 * Uses string parsing to avoid float precision issues (149.99 → 14999, not 14998.999...).
 */
export function normalizeWayForPayAmountToKopecks(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null

  // Coerce to string for consistent parsing
  const raw = typeof value === 'number' ? value.toString() : String(value).trim()
  if (!raw) return null

  // Only allow digits with optional single decimal separator and up to 2 decimal digits
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null

  const parts = raw.split('.')
  const hryvnias = parseInt(parts[0], 10)
  // Pad single decimal digit to cents: "9" → "90" → 90 kopecks
  const kopecks  = parts[1] ? parseInt(parts[1].padEnd(2, '0'), 10) : 0

  const total = hryvnias * 100 + kopecks
  if (total <= 0) return null   // reject zero/negative

  return total
}

/**
 * Builds a deterministic idempotency key for a WayForPay callback event.
 * Includes orderReference + transactionStatus + amount + processingDate
 * to distinguish retries from genuine duplicate orders.
 */
export function buildWayForPayEventKey(
  orderReference: string,
  transactionStatus: string,
  amount: number,
  processingDate: number,
): string {
  return `wayforpay:${orderReference}:${transactionStatus}:${amount}:${processingDate}`
}

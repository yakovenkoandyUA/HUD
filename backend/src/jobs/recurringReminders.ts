import cron from 'node-cron'
import RecurringPayment from '../models/RecurringPayment'
import { isWebPushConfigured, sendScheduledPushToUser } from '../services/webpush'
import { kyivDate, kyivTime } from '../utils/questReminderTime'

const DAY = 86_400_000

function getPaymentDate(date: Date, dayOfMonth: number): string {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, month, Math.min(dayOfMonth, lastDay))).toISOString().slice(0, 10)
}

async function sendPaymentReminders(hour: '08:00' | '12:00'): Promise<void> {
  const today = kyivDate()
  const expiryHour = hour === '08:00' ? '09:00' : '13:00'
  const expiresAt = kyivTime(today, expiryHour)
  if (!isWebPushConfigured() || !expiresAt) return
  const midnight = Date.parse(today + 'T00:00:00Z')
  const payments = await RecurringPayment.find({ isActive: true }).lean()

  for (const payment of payments) {
    const offsets = hour === '08:00' ? [0] : (payment.reminderDays ?? []).filter(days => Number.isInteger(days) && days > 0)
    for (const days of new Set(offsets)) {
      const date = new Date(midnight + days * DAY)
      const dueDate = getPaymentDate(date, payment.dayOfMonth)
      if (date.toISOString().slice(0, 10) !== dueDate || payment.lastConfirmedMonth === dueDate.slice(0, 7)) continue
      const when = days === 0 ? 'сьогодні' : days === 1 ? 'завтра' : `через ${days} дн.`
      const amount = payment.currency !== 'UAH' && payment.amountForeign != null
        ? payment.amountForeign.toLocaleString('uk-UA', { style: 'currency', currency: payment.currency })
        : `${payment.amount.toLocaleString('uk-UA')} ₴`
      await sendScheduledPushToUser(payment.userId, {
        title: `💳 «${payment.name}» — ${when}`,
        body: `${amount} спишеться ${when}`,
        url: '/finance',
        tag: `recurring-${payment._id}-${today}`,
      }, { key: `recurring-${payment._id}-${today}-${dueDate}`, expiresAt })
    }
  }
}

const options = { timezone: 'Europe/Kyiv', noOverlap: true }
cron.schedule('*/5 8 * * *', () => sendPaymentReminders('08:00').catch(console.error), options)
cron.schedule('*/5 12 * * *', () => sendPaymentReminders('12:00').catch(console.error), options)

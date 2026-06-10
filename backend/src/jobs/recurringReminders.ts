import cron from 'node-cron'
import RecurringPayment from '../models/RecurringPayment'
import { sendPushToUser } from '../services/webpush'

// Runs daily at 09:00 UTC (12:00 Kyiv)
cron.schedule('0 9 * * *', async () => {
  const now = new Date()
  const today = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  try {
    const payments = await RecurringPayment.find({
      isActive: true,
      reminderDays: { $exists: true, $not: { $size: 0 } },
    })

    for (const p of payments) {
      if (!p.reminderDays?.length) continue

      for (const days of p.reminderDays) {
        // Account for month wrap (e.g. payment on 2nd, reminder 7 days before = 25th of prev month)
        let targetDay = p.dayOfMonth - days
        if (targetDay <= 0) targetDay += daysInMonth

        if (targetDay !== today) continue

        const label = days === 1 ? 'завтра' : `через ${days} ${days < 5 ? 'дні' : 'днів'}`
        await sendPushToUser(p.userId, {
          title: '💳 Регулярний платіж',
          body:  `«${p.name}» — ${p.amount.toLocaleString('uk-UA')} ₴ (${label})`,
          url:   '/finance',
        })
        break // one notification per payment per day
      }
    }

    console.log('[Push] Recurring payment reminders processed')
  } catch (err) {
    console.error('[Push] Recurring reminder error:', err)
  }
})

console.log('📅 Recurring payment reminders scheduled (09:00 UTC)')

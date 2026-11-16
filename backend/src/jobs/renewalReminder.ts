import cron from 'node-cron'
import { User } from '../models/User'
import { isWebPushConfigured, sendScheduledPushToUser } from '../services/webpush'

const MS_PER_DAY = 24 * 60 * 60 * 1000

function daysUntil(date: Date, now: Date): number {
  return (date.getTime() - now.getTime()) / MS_PER_DAY
}

function planLabel(plan: string): string {
  const labels: Record<string, string> = {
    personal: 'MIMIR Personal Memory',
    couple:   'MIMIR Shared Life',
    family:   'MIMIR Family Chronicle',
  }
  return labels[plan] ?? plan
}

/** Retries the current renewal notice until each registered device accepts it or the period ends. */
async function runRenewalReminder(): Promise<void> {
  if (!isWebPushConfigured()) return
  const now = new Date()
  const paidUsers = await User.find({
    plan: { $in: ['personal', 'couple', 'family'] },
    currentPeriodEnd: { $gt: now, $lte: new Date(now.getTime() + 7 * MS_PER_DAY) },
  }).lean()

  for (const user of paidUsers) {
    if (!user.currentPeriodEnd) continue
    const daysLeft = daysUntil(user.currentPeriodEnd, now)
    const oneDay = daysLeft <= 1
    const sentField = oneDay ? 'renewalReminder1dSentAt' : 'renewalReminder7dSentAt'
    if (user[sentField]) continue

    const daysRemaining = Math.ceil(daysLeft)
    const timing = oneDay ? 'менше ніж за добу' : `через ${daysRemaining} дн.`
    const { accepted, pending } = await sendScheduledPushToUser(String(user._id), {
      title: 'MIMIR — підписка закінчується',
      body: `Підписка «${planLabel(user.plan)}» закінчується ${timing}.`,
      url: '/profile?tab=plan',
      tag: 'subscription-renewal',
    }, {
      key: `renewal-${user.currentPeriodEnd.toISOString()}-${oneDay ? 1 : 7}`,
      // Stop the advance alert when the one-day alert takes over.
      expiresAt: user.currentPeriodEnd.getTime() - (oneDay ? 0 : MS_PER_DAY),
    })
    if (accepted > 0 && pending === 0) {
      await User.updateOne({
        _id: user._id, currentPeriodEnd: user.currentPeriodEnd, [sentField]: null,
      }, { $set: { [sentField]: now } })
    }
  }
}

cron.schedule('*/5 12 * * *', () => runRenewalReminder().catch(console.error), { timezone: 'Europe/Kyiv', noOverlap: true })

export { runRenewalReminder }

import cron from 'node-cron'
import { User } from '../models/User'
import { getGracePeriodEnd } from '../utils/billing'

/**
 * Finds paid users whose grace period has passed and downgrades them to free.
 * Grace period = currentPeriodEnd + 3 days.
 * Runs daily at 10:00 UTC. Does not auto-charge or delete data.
 */
async function runSubscriptionExpiry(): Promise<void> {
  const now = new Date()

  try {
    const paidUsers = await User.find({
      plan:             { $in: ['personal', 'couple', 'family'] },
      currentPeriodEnd: { $ne: null },
    })

    let downgraded = 0

    for (const user of paidUsers) {
      if (!user.currentPeriodEnd) continue

      const gracePeriodEnd = getGracePeriodEnd(user.currentPeriodEnd)

      if (now <= gracePeriodEnd) continue

      // Grace period expired — downgrade to free
      user.plan               = 'free'
      user.subscriptionStatus = 'canceled'
      user.billingInterval    = null
      user.cancelAtPeriodEnd  = false
      user.downgradedAt       = now
      // Keep billingProvider, billingOrderId, currentPeriodEnd for audit history

      await user.save()
      downgraded++

      console.error(
        `[subscriptionExpiry] Downgraded user ${String(user._id)} — period ended ${user.currentPeriodEnd.toISOString()}, grace ended ${gracePeriodEnd.toISOString()}`,
      )
    }

    if (downgraded > 0) {
      console.error(`[subscriptionExpiry] Downgraded ${downgraded} user(s) to free`)
    }
  } catch (err) {
    console.error('[subscriptionExpiry] Job error:', err)
  }
}

// Daily at 10:00 UTC (13:00 Kyiv)
cron.schedule('0 10 * * *', () => { void runSubscriptionExpiry() })

export { runSubscriptionExpiry }

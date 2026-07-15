import cron from 'node-cron'
import { User } from '../models/User'
import { getGracePeriodEnd } from '../utils/billing'
import { sendPushToUser } from '../services/webpush'

const MS_PER_DAY = 24 * 60 * 60 * 1000

function daysUntil(date: Date, now: Date): number {
  return (date.getTime() - now.getTime()) / MS_PER_DAY
}

function formatDateUk(date: Date): string {
  return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
}

/**
 * Finds paid users whose grace period has passed and downgrades them to free.
 * Grace period = currentPeriodEnd + 3 days.
 * Also handles manual planExpiresAt (Monobank flow) — no grace period.
 * Sends push to admin 3 days before planExpiresAt.
 * Runs daily at 10:00 UTC.
 */
async function runSubscriptionExpiry(): Promise<void> {
  const now = new Date()

  try {
    // ── WayForPay flow: grace-period expiry ──────────────────────────────────
    const wayForPayUsers = await User.find({
      plan:             { $in: ['personal', 'couple', 'family'] },
      currentPeriodEnd: { $ne: null },
      planExpiresAt:    null,  // only WFP-managed users (no manual expiry set)
    })

    let downgraded = 0

    for (const user of wayForPayUsers) {
      if (!user.currentPeriodEnd) continue

      const gracePeriodEnd = getGracePeriodEnd(user.currentPeriodEnd)

      if (now <= gracePeriodEnd) continue

      user.plan               = 'free'
      user.subscriptionStatus = 'canceled'
      user.billingInterval    = null
      user.cancelAtPeriodEnd  = false
      user.downgradedAt       = now

      await user.save()
      downgraded++

      console.error(
        `[subscriptionExpiry] Downgraded user ${String(user._id)} — period ended ${user.currentPeriodEnd.toISOString()}, grace ended ${gracePeriodEnd.toISOString()}`,
      )
    }

    if (downgraded > 0) {
      console.error(`[subscriptionExpiry] Downgraded ${downgraded} user(s) to free (WayForPay)`)
    }

    // ── Manual flow: planExpiresAt (Monobank) ────────────────────────────────
    const manualUsers = await User.find({
      plan:          { $in: ['personal', 'couple', 'family'] },
      planExpiresAt: { $ne: null },
    })

    let manualDowngraded = 0

    // Find admins once — we'll notify them about upcoming expirations
    const admins = await User.find({ role: 'admin' }, { _id: 1 })
    const adminIds = admins.map(a => String(a._id))

    for (const user of manualUsers) {
      if (!user.planExpiresAt) continue

      const daysLeft = daysUntil(user.planExpiresAt, now)

      // Expired — downgrade immediately (no grace period for manual billing)
      if (daysLeft <= 0) {
        const expiredAt = user.planExpiresAt?.toISOString() ?? 'null'
        user.plan               = 'free'
        user.subscriptionStatus = 'canceled'
        user.downgradedAt       = now
        user.planExpiresAt      = null
        user.planExpiryWarningSentAt = null

        await user.save()
        manualDowngraded++

        console.error(`[subscriptionExpiry] Downgraded user ${String(user._id)} — planExpiresAt ${expiredAt}`)
        continue
      }

      // D-3 admin warning — send once, skip if already sent this cycle
      if (daysLeft <= 3 && !user.planExpiryWarningSentAt) {
        const expiryStr = formatDateUk(user.planExpiresAt)
        const body = `план ${user.plan} у @${user.username} закінчується ${expiryStr}`

        for (const adminId of adminIds) {
          await sendPushToUser(adminId, {
            title: 'MIMIR — підписка закінчується',
            body,
            url:   '/profile?tab=admin',
          })
        }

        user.planExpiryWarningSentAt = now
        await user.save()

        console.error(
          `[subscriptionExpiry] Admin warning sent for user ${String(user._id)} (@${user.username}), daysLeft=${daysLeft.toFixed(1)}`,
        )
      }
    }

    if (manualDowngraded > 0) {
      console.error(`[subscriptionExpiry] Downgraded ${manualDowngraded} user(s) to free (manual)`)
    }
  } catch (err) {
    console.error('[subscriptionExpiry] Job error:', err)
  }
}

// Daily at 10:00 UTC (13:00 Kyiv)
cron.schedule('0 10 * * *', () => { void runSubscriptionExpiry() })

export { runSubscriptionExpiry }

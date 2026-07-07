import cron from 'node-cron'
import { User } from '../models/User'
import { sendPushToUser } from '../services/webpush'

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

/**
 * Sends push renewal reminders at D-7 and D-1 before currentPeriodEnd.
 * Flags prevent duplicate sends. Flags are reset on successful payment (WayForPay callback).
 * Falls back to console.error log if push subscription is absent for a user.
 * Email billing reminders are a TODO — Resend template not yet implemented.
 */
async function runRenewalReminder(): Promise<void> {
  const now = new Date()

  try {
    const paidUsers = await User.find({
      plan:             { $in: ['personal', 'couple', 'family'] },
      currentPeriodEnd: { $ne: null },
    })

    for (const user of paidUsers) {
      if (!user.currentPeriodEnd) continue

      const daysLeft = daysUntil(user.currentPeriodEnd, now)

      // Skip already-expired (handled by subscriptionExpiry job)
      if (daysLeft < 0) continue

      const label = planLabel(user.plan)

      // ── D-7 reminder ─────────────────────────────────────────────────────
      if (daysLeft <= 7 && !user.renewalReminder7dSentAt) {
        const daysRounded = Math.ceil(daysLeft)
        const body = `Ваша підписка «${label}» закінчується через ${daysRounded} ${daysRounded === 1 ? 'день' : 'днів'}. Поновіть щоб не переривати доступ.`

        await sendPushToUser(String(user._id), {
          title: 'MIMIR — підписка закінчується',
          body,
          url:   '/profile?tab=plan',
        })

        user.renewalReminder7dSentAt = now
        await user.save()

        console.error(
          `[renewalReminder] 7d reminder sent to user ${String(user._id)}, daysLeft=${daysLeft.toFixed(1)}`,
        )
      }

      // ── D-1 reminder ─────────────────────────────────────────────────────
      if (daysLeft <= 1 && !user.renewalReminder1dSentAt) {
        const body = `Ваша підписка «${label}» закінчується завтра. Поновіть сьогодні щоб зберегти доступ.`

        await sendPushToUser(String(user._id), {
          title: 'MIMIR — підписка закінчується завтра',
          body,
          url:   '/profile?tab=plan',
        })

        user.renewalReminder1dSentAt = now
        await user.save()

        console.error(
          `[renewalReminder] 1d reminder sent to user ${String(user._id)}, daysLeft=${daysLeft.toFixed(1)}`,
        )
      }

      // TODO: Email reminder via Resend as fallback for users without push subscription
      // Requires a billing-specific HTML email template (not yet implemented)
    }
  } catch (err) {
    console.error('[renewalReminder] Job error:', err)
  }
}

// Daily at 09:00 UTC (12:00 Kyiv) — before subscriptionExpiry (10:00)
cron.schedule('0 9 * * *', () => { void runRenewalReminder() })

export { runRenewalReminder }

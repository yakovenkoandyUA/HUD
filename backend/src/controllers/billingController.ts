import type { Request, Response } from 'express'
import BillingOrder from '../models/BillingOrder'
import ProcessedBillingEvent from '../models/ProcessedBillingEvent'
import { User } from '../models/User'
import { getPrice, validatePaidPlan, validateBillingInterval } from '../config/pricing'
import { generateOrderReference, calculateCurrentPeriodEnd, buildWayForPayEventKey } from '../utils/billing'
import { getWayForPayConfig } from '../config/wayforpay'
import {
  buildWayForPayCheckoutPayload,
  verifyWayForPayCallback,
  buildWayForPayAcceptResponse,
  type WayForPayCallbackPayload,
} from '../utils/wayforpay'

// ── POST /api/billing/checkout ────────────────────────────────────────────────

export async function createCheckout(req: Request, res: Response): Promise<void> {
  try {
    const { planId, interval } = req.body as { planId?: unknown; interval?: unknown }

    if (!validatePaidPlan(planId)) {
      res.status(400).json({ error: 'Invalid planId. Must be personal, couple, or family.' })
      return
    }

    if (!validateBillingInterval(interval)) {
      res.status(400).json({ error: 'Invalid interval. Must be month or year.' })
      return
    }

    let config
    try {
      config = getWayForPayConfig()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'WayForPay configuration error'
      res.status(500).json({ error: msg })
      return
    }

    const user = await User.findById(req.userId)
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const amount         = getPrice(planId, interval)
    const orderReference = generateOrderReference()
    const expiresAt      = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    const order = await BillingOrder.create({
      userId: user._id,
      provider: 'wayforpay',
      orderReference,
      planId,
      interval,
      amount,
      currency: 'UAH',
      status: 'pending',
      expiresAt,
    })

    const { actionUrl, fields } = buildWayForPayCheckoutPayload(order, user, config)

    res.json({
      orderReference: order.orderReference,
      provider: 'wayforpay',
      payment: {
        type: 'wayforpay_hosted_form',
        actionUrl,
        fields,
      },
    })
  } catch {
    res.status(500).json({ error: 'Checkout creation failed' })
  }
}

// ── GET /api/billing/order/:orderReference/status ─────────────────────────────

export async function getBillingOrderStatus(req: Request, res: Response): Promise<void> {
  try {
    const { orderReference } = req.params

    const order = await BillingOrder.findOne({
      orderReference,
      userId: req.userId,
    }).lean()

    // Prefer 404 over 403 to avoid leaking existence to other users
    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    res.json({
      orderReference: order.orderReference,
      status:         order.status,
      planId:         order.planId,
      interval:       order.interval,
      amount:         order.amount,
      currency:       order.currency,
      expiresAt:      order.expiresAt,
      paidAt:         order.paidAt,
    })
  } catch {
    res.status(500).json({ error: 'Failed to fetch order status' })
  }
}

// ── POST /api/billing/wayforpay/callback ──────────────────────────────────────
// Public route — security via signature verification, not requireAuth

const WFP_STATUS_MAP: Record<string, 'paid' | 'failed' | 'expired' | 'refunded' | null> = {
  Approved:              'paid',
  Declined:              'failed',
  Voided:                'failed',
  Expired:               'expired',
  Refunded:              'refunded',
  InProcessing:          null,   // keep pending
  WaitingAuthComplete:   null,   // keep pending
}

export async function handleWayForPayCallback(req: Request, res: Response): Promise<void> {
  const payload = req.body as Partial<WayForPayCallbackPayload>

  let config
  try {
    config = getWayForPayConfig()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'WayForPay configuration error'
    console.error('[billing/callback] Config error:', msg)
    res.status(500).json({ error: 'Payment gateway configuration error' })
    return
  }

  // ── 1. Validate required callback fields ──────────────────────────────────
  const { orderReference, transactionStatus, merchantSignature, amount, currency, processingDate } = payload

  if (
    typeof orderReference       !== 'string' ||
    typeof transactionStatus    !== 'string' ||
    typeof merchantSignature    !== 'string' ||
    typeof amount               !== 'number'  ||
    typeof currency             !== 'string'  ||
    typeof processingDate       !== 'number'
  ) {
    console.error('[billing/callback] Malformed payload — missing required fields')
    res.status(400).json({ error: 'Malformed callback payload' })
    return
  }

  // ── 2. Verify signature ───────────────────────────────────────────────────
  if (!verifyWayForPayCallback(payload as WayForPayCallbackPayload, config.merchantSecret)) {
    console.error('[billing/callback] Invalid signature for orderReference:', orderReference)
    res.status(400).json({ error: 'Invalid signature' })
    return
  }

  console.error('[billing/callback] Received:', orderReference, transactionStatus)

  // ── 3. Check idempotency ──────────────────────────────────────────────────
  const eventKey = buildWayForPayEventKey(orderReference, transactionStatus, amount, processingDate)
  const alreadyProcessed = await ProcessedBillingEvent.findOne({ provider: 'wayforpay', eventKey })

  if (alreadyProcessed) {
    console.error('[billing/callback] Duplicate event, returning accept:', eventKey)
    res.json(buildWayForPayAcceptResponse(orderReference, config.merchantAccount, config.merchantSecret))
    return
  }

  // ── 4. Find BillingOrder ──────────────────────────────────────────────────
  const order = await BillingOrder.findOne({ orderReference })

  if (!order) {
    console.error('[billing/callback] Unknown orderReference:', orderReference)
    // Still return 200 with accept to stop WayForPay retrying unknown orders
    res.json(buildWayForPayAcceptResponse(orderReference, config.merchantAccount, config.merchantSecret))
    return
  }

  // ── 5. Amount / currency integrity check ──────────────────────────────────
  // WayForPay sends amount in UAH decimal; our order.amount is kopecks
  const callbackKopecks = Math.round(amount * 100)
  if (callbackKopecks !== order.amount || currency !== order.currency) {
    console.error(
      '[billing/callback] Amount/currency mismatch:',
      { callbackKopecks, orderKopecks: order.amount, callbackCurrency: currency, orderCurrency: order.currency },
    )
    res.status(400).json({ error: 'Amount or currency mismatch' })
    return
  }

  // ── 6. Map transactionStatus → BillingOrder.status ───────────────────────
  const newStatus = WFP_STATUS_MAP[transactionStatus] ?? null

  try {
    if (transactionStatus === 'Approved') {
      // ── 6a. Activate subscription ─────────────────────────────────────────
      const now = new Date()

      order.status             = 'paid'
      order.paidAt             = now
      order.rawProviderPayload = payload as Record<string, unknown>
      await order.save()

      await User.findByIdAndUpdate(order.userId, {
        plan:                     order.planId,
        subscriptionStatus:       'active',
        billingProvider:          'wayforpay',
        billingInterval:          order.interval,
        billingOrderId:           order.orderReference,
        currentPeriodEnd:         calculateCurrentPeriodEnd(now, order.interval),
        lastBillingSyncAt:        now,
        // Reset reminder flags so next period can send fresh reminders
        renewalReminder7dSentAt:  null,
        renewalReminder1dSentAt:  null,
        downgradedAt:             null,
      })

      console.error('[billing/callback] Activated plan:', order.planId, 'for user:', String(order.userId))

    } else if (newStatus !== null) {
      // ── 6b. Mark order failed/expired/refunded — do NOT change User.plan ──
      order.status             = newStatus
      order.rawProviderPayload = payload as Record<string, unknown>
      await order.save()

      console.error('[billing/callback] Order marked:', newStatus, 'for:', orderReference)
    }
    // else: InProcessing/WaitingAuthComplete — leave order as pending, no action

    // ── 7. Record idempotency event ───────────────────────────────────────
    await ProcessedBillingEvent.create({
      provider:       'wayforpay',
      eventKey,
      orderReference,
      eventType:      transactionStatus,
      relatedUserId:  order.userId,
    })

  } catch (err) {
    console.error('[billing/callback] Processing error:', err)
    res.status(500).json({ error: 'Callback processing failed' })
    return
  }

  // ── 8. Return signed accept response ─────────────────────────────────────
  res.json(buildWayForPayAcceptResponse(orderReference, config.merchantAccount, config.merchantSecret))
}

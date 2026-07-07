import type { Request, Response } from 'express'
import BillingOrder from '../models/BillingOrder'
import { User } from '../models/User'
import { getPrice, validatePaidPlan, validateBillingInterval } from '../config/pricing'
import { generateOrderReference } from '../utils/billing'
import { getWayForPayConfig } from '../config/wayforpay'
import { buildWayForPayCheckoutPayload } from '../utils/wayforpay'

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

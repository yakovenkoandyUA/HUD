import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { createCheckout, getBillingOrderStatus, handleWayForPayCallback } from '../controllers/billingController'

const router = Router()

// Public — WayForPay server calls this; security via HMAC signature verification
router.post('/wayforpay/callback', handleWayForPayCallback)

// Authenticated routes
router.post('/checkout', requireAuth, createCheckout)
router.get('/order/:orderReference/status', requireAuth, getBillingOrderStatus)

export default router

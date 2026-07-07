import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { createCheckout, getBillingOrderStatus } from '../controllers/billingController'

const router = Router()

router.use(requireAuth)

router.post('/checkout', createCheckout)
router.get('/order/:orderReference/status', getBillingOrderStatus)

export default router

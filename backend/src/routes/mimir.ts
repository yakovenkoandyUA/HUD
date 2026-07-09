import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requireFeature } from '../utils/entitlements'
import { getMimirHint } from '../controllers/mimirController'

const router = Router()

router.use(requireAuth)

// GET /api/mimir/hint?mode=wise|witty|dark  (paid feature)
router.get('/hint', requireFeature('mimirAi'), getMimirHint)

export default router

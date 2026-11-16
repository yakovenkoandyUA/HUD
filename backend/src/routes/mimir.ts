import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { loadUser } from '../middleware/loadUser'
import { requireFeature } from '../utils/entitlements'
import { getMimirHint, isMimirOpenAiPilot } from '../controllers/mimirController'

const router = Router()

router.use(requireAuth)

const requireMimirAi = requireFeature('mimirAi')
router.get('/hint', loadUser, (req, res, next) => {
  if (isMimirOpenAiPilot(req.userId)) return next()
  requireMimirAi(req, res, next)
}, (req, res, next) => {
  void getMimirHint(req, res).catch(next)
})

export default router

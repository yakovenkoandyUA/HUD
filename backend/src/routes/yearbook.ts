import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { loadUser } from '../middleware/loadUser'
import { requireFeature } from '../utils/entitlements'
import { getYearbook, generateYearbook } from '../controllers/yearbookController'

const router = Router()
router.use(requireAuth)
router.get('/:year', getYearbook)
router.post('/:year/generate', loadUser, requireFeature('yearbookGenerate'), generateYearbook)

export default router

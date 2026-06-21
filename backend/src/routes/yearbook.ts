import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { getYearbook, generateYearbook } from '../controllers/yearbookController'

const router = Router()
router.use(requireAuth)
router.get('/:year', getYearbook)
router.post('/:year/generate', generateYearbook)

export default router

import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { getTimeline } from '../controllers/timelineController'

const router = Router()
router.use(requireAuth)
router.get('/', getTimeline)

export default router

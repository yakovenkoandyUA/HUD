import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { loadUser } from '../middleware/loadUser'
import { getTimeline } from '../controllers/timelineController'

const router = Router()
router.use(requireAuth)
router.get('/', loadUser, getTimeline)

export default router

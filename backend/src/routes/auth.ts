import { Router } from 'express'
import { login, verify, me } from '../controllers/authController'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.post('/login', login)
router.post('/verify', verify)
router.get('/me', requireAuth, me)

export default router

import { Router } from 'express'
import { login, verify, me, getProfiles, selectProfile, updateMe } from '../controllers/authController'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.post('/login', login)
router.post('/verify', verify)
router.get('/me', requireAuth, me)
router.patch('/me', requireAuth, updateMe)

// Multi-profile (no password)
router.get('/profiles', getProfiles)
router.post('/select', selectProfile)

export default router

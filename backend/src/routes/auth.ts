import { Router } from 'express'
import {
  register, loginEmail, googleAuth,
  verify, me, getProfiles, selectProfile, updateMe, changePassword,
  setPin, removePin, verifyPin,
  verifyEmail, resendVerification,
  getAllUsers,
} from '../controllers/authController'
import { requireAuth } from '../middleware/auth'
import { requireAdmin } from '../middleware/requireAdmin'

const router = Router()

// Email auth
router.post('/register', register)
router.post('/login', loginEmail)
router.post('/google', googleAuth)

// PIN
router.patch('/pin', requireAuth, setPin)
router.delete('/pin', requireAuth, removePin)
router.post('/pin/verify', requireAuth, verifyPin)

// Email verification
router.post('/verify-email', verifyEmail)
router.post('/resend-verification', requireAuth, resendVerification)

// Session
router.post('/verify', verify)
router.get('/me', requireAuth, me)
router.patch('/me', requireAuth, updateMe)
router.post('/change-password', requireAuth, changePassword)

// Admin
router.get('/admin/users', requireAuth, requireAdmin, getAllUsers)

// Multi-profile legacy
router.get('/profiles', getProfiles)
router.post('/select', selectProfile)

export default router

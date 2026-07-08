import { Router } from 'express'
import {
  register, loginEmail, googleAuth,
  verify, me, getProfiles, selectProfile, updateMe, changePassword,
  setPin, removePin, verifyPin,
  verifyEmail, resendVerification,
  getAllUsers, adminSetPlan, adminDeleteUser, refresh, logout,
} from '../controllers/authController'
import { requireAuth } from '../middleware/auth'
import { requireAdmin } from '../middleware/requireAdmin'
import { validate } from '../middleware/validate'
import { registerSchema, loginSchema, googleAuthSchema, pinSchema, changePasswordSchema, updateMeSchema } from '../validation/schemas'

const router = Router()

// Email auth
router.post('/register', validate(registerSchema), register)
router.post('/login',    validate(loginSchema),    loginEmail)
router.post('/google',   validate(googleAuthSchema), googleAuth)

// PIN
router.patch('/pin',       requireAuth, validate(pinSchema), setPin)
router.delete('/pin',      requireAuth, removePin)
router.post('/pin/verify', requireAuth, validate(pinSchema), verifyPin)

// Email verification
router.post('/verify-email', verifyEmail)
router.post('/resend-verification', requireAuth, resendVerification)

// Token refresh + logout (no requireAuth — refresh token in cookie)
router.post('/refresh', refresh)
router.post('/logout',  logout)

// Session
router.post('/verify', verify)
router.get('/me', requireAuth, me)
router.patch('/me', requireAuth, validate(updateMeSchema), updateMe)
router.post('/change-password', requireAuth, validate(changePasswordSchema), changePassword)

// Admin
router.get('/admin/users',              requireAuth, requireAdmin, getAllUsers)
router.patch('/admin/users/:id/plan',  requireAuth, requireAdmin, adminSetPlan)
router.delete('/admin/users/:id',      requireAuth, requireAdmin, adminDeleteUser)

// Multi-profile legacy
router.get('/profiles', getProfiles)
router.post('/select', selectProfile)

export default router

import { Router, type Request, type Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { User } from '../models/User'
import { RefreshToken } from '../models/RefreshToken'
import Memory from '../models/Memory'
import Plan from '../models/Plan'
import Transaction from '../models/Transaction'
import Category from '../models/Category'
import SavingsGoal from '../models/SavingsGoal'
import RecurringPayment from '../models/RecurringPayment'
import SprintTask from '../models/SprintTask'
import TodoItem from '../models/TodoItem'
import Recipe from '../models/Recipe'
import WatchlistItem from '../models/WatchlistItem'
import MoodLog from '../models/MoodLog'
import Note from '../models/Note'
import FinancialReport from '../models/FinancialReport'
import { Space } from '../models/Space'
import { VehicleEvent } from '../models/VehicleEvent'
import { HomeEvent } from '../models/HomeEvent'
import { PetEvent } from '../models/PetEvent'

const router = Router()

router.use(requireAuth)

// ── GET /api/user/export ─────────────────────────────────────────────────────

router.get('/export', async (req: Request, res: Response) => {
  try {
    const uid = req.userId

    const [
      user,
      memories,
      plans,
      transactions,
      categories,
      goals,
      recurring,
      tasks,
      todos,
      recipes,
      watchlist,
      moods,
      notes,
      reports,
      spaces,
      vehicleEvents,
      homeEvents,
      petEvents,
    ] = await Promise.all([
      User.findById(uid).lean(),
      Memory.find({ userId: uid }).lean(),
      Plan.find({ userId: uid }).lean(),
      Transaction.find({ userId: uid }).lean(),
      Category.find({ userId: uid }).lean(),
      SavingsGoal.find({ userId: uid }).lean(),
      RecurringPayment.find({ userId: uid }).lean(),
      SprintTask.find({ userId: uid }).lean(),
      TodoItem.find({ userId: uid }).lean(),
      Recipe.find({ userId: uid }).lean(),
      WatchlistItem.find({ userId: uid }).lean(),
      MoodLog.find({ userId: uid }).lean(),
      Note.find({ userId: uid }).lean(),
      FinancialReport.find({ userId: uid }).lean(),
      Space.find({ $or: [{ ownerId: uid }, { 'members.userId': uid }] }).lean(),
      VehicleEvent.find({ userId: uid }).lean(),
      HomeEvent.find({ userId: uid }).lean(),
      PetEvent.find({ userId: uid }).lean(),
    ])

    if (!user) { res.status(404).json({ error: 'User not found' }); return }

    // Strip sensitive fields from user profile
    const {
      passwordHash: _pw,
      pinHash: _pin,
      verificationToken: _vt,
      paddleCustomerId: _pci,
      paddleSubscriptionId: _psi,
      billingProvider: _bp,
      ...safeUser
    } = user as Record<string, unknown>
    void _pw; void _pin; void _vt; void _pci; void _psi; void _bp

    const payload = {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      profile: safeUser,
      memories,
      plans,
      transactions,
      categories,
      savingsGoals: goals,
      recurringPayments: recurring,
      sprintTasks: tasks,
      todos,
      recipes,
      watchlist,
      moodLogs: moods,
      notes,
      financialReports: reports,
      spaces,
      vehicleEvents,
      homeEvents,
      petEvents,
    }

    const filename = `mimir-export-${new Date().toISOString().slice(0, 10)}.json`
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.json(payload)
  } catch {
    res.status(500).json({ error: 'Export failed' })
  }
})

// ── DELETE /api/user/me ──────────────────────────────────────────────────────

router.delete('/me', async (req: Request, res: Response) => {
  try {
    const { confirmation } = req.body as { confirmation?: string }

    if (confirmation !== 'DELETE') {
      res.status(400).json({ error: 'Потрібне підтвердження. Введіть DELETE для підтвердження.' })
      return
    }

    const uid = req.userId

    // Soft-delete: mark account, preserve data for 30 days
    await User.findByIdAndUpdate(uid, {
      accountStatus: 'deletion_requested',
      deletedAt: new Date(),
    })

    // Invalidate all sessions
    await RefreshToken.deleteMany({ userId: uid })

    // Clear refresh token cookie
    res.clearCookie('rt', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      path: '/',
    })

    res.json({ message: 'Запит на видалення прийнято. Акаунт буде видалено протягом 30 днів.' })
  } catch {
    res.status(500).json({ error: 'Помилка видалення акаунту' })
  }
})

export default router

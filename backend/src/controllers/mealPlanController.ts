import { Request, Response } from 'express'
import MealPlan from '../models/MealPlan'

// GET /api/meal-plan — returns { plan: { [dayKey]: string[] } }
export const getMealPlan = async (req: Request, res: Response) => {
  try {
    const doc = await MealPlan.findOne({ userId: req.userId })
    const plan: Record<string, string[]> = {}
    if (doc) {
      doc.plan.forEach((ids, day) => { plan[day] = ids })
    }
    res.json({ plan })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

// PUT /api/meal-plan — body: { plan: { [dayKey]: string[] } }
export const saveMealPlan = async (req: Request, res: Response) => {
  try {
    const incoming: Record<string, string[]> = req.body.plan ?? {}
    await MealPlan.findOneAndUpdate(
      { userId: req.userId },
      { $set: { plan: incoming } },
      { upsert: true, new: true }
    )
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

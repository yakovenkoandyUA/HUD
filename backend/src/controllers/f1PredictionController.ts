import { Request, Response } from 'express'
import F1Prediction from '../models/F1Prediction'

export async function getPredictions(req: Request, res: Response): Promise<void> {
  const items = await F1Prediction.find({ userId: req.userId }).sort({ raceRound: 1 })
  res.json(items)
}

export async function savePrediction(req: Request, res: Response): Promise<void> {
  const {
    raceId, raceName, raceRound, p1, p2, p3, savedAt,
    constructorPick = null, driverOfTheDay = null, safetyCarPick = null,
  } = req.body as {
    raceId: string; raceName: string; raceRound: number
    p1: string; p2: string; p3: string; savedAt: string
    constructorPick?: string | null
    driverOfTheDay?: string | null
    safetyCarPick?: boolean | null
  }
  const item = await F1Prediction.findOneAndUpdate(
    { raceId, userId: req.userId },
    { raceName, raceRound, p1, p2, p3, constructorPick, driverOfTheDay, safetyCarPick, savedAt, result: null },
    { upsert: true, new: true }
  )
  res.json(item)
}

export async function setPredictionResult(req: Request, res: Response): Promise<void> {
  const { raceId } = req.params
  const { result } = req.body as { result: unknown }
  const item = await F1Prediction.findOneAndUpdate(
    { raceId, userId: req.userId },
    { result },
    { new: true }
  )
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(item)
}

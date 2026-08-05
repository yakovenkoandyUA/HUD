import { Request, Response } from 'express'
import F1SessionReminder from '../models/F1SessionReminder'

const REMIND_BEFORE_MIN = 30

export async function getReminders(req: Request, res: Response): Promise<void> {
  const round = Number(req.query.round)
  const items = await F1SessionReminder.find({ userId: req.userId, round }).lean()
  res.json(items.map(i => i.sessionKey))
}

export async function setReminder(req: Request, res: Response): Promise<void> {
  const { round, sessionKey, sessionLabel, sessionAt } = req.body as {
    round: number; sessionKey: string; sessionLabel: string; sessionAt: string
  }
  const remindAt = new Date(new Date(sessionAt).getTime() - REMIND_BEFORE_MIN * 60000)
  if (remindAt.getTime() <= Date.now()) {
    res.status(400).json({ error: 'Session too soon for a reminder' })
    return
  }

  const item = await F1SessionReminder.findOneAndUpdate(
    { userId: req.userId, round, sessionKey },
    { sessionLabel, sessionAt, remindAt, sent: false },
    { upsert: true, new: true }
  )
  res.json(item)
}

export async function deleteReminder(req: Request, res: Response): Promise<void> {
  const round = Number(req.params.round)
  const { sessionKey } = req.params
  await F1SessionReminder.deleteOne({ userId: req.userId, round, sessionKey })
  res.json({ ok: true })
}

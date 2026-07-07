import { ErrorRequestHandler } from 'express'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = (err as { status?: number }).status ?? 500
  const message = (err as { message?: string }).message ?? 'Internal Server Error'
  const code = (err as { code?: string }).code

  if (code === 'PLAN_GATE') {
    const feature = (err as { feature?: string }).feature
    res.status(403).json({ error: message, code: 'PLAN_GATE', feature })
    return
  }

  if (code === 'PLAN_LIMIT') {
    const limitKey = (err as { limitKey?: string }).limitKey
    const limit = (err as { limit?: number }).limit
    res.status(403).json({ error: message, code: 'PLAN_LIMIT', limitKey, limit })
    return
  }

  res.status(status).json({ error: message })
}

import { ErrorRequestHandler } from 'express'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = err.status ?? 500
  const message = err.message ?? 'Internal Server Error'
  res.status(status).json({ error: message })
}

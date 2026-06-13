import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'

/**
 * Express middleware that validates req.body against a Zod schema.
 * Returns 400 with the first validation error message on failure.
 * Replaces req.body with the parsed (coerced/stripped) data on success.
 */
export function validate<T>(schema: z.ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const err = result.error as { errors?: Array<{ message: string }> }
      res.status(400).json({ error: err.errors?.[0]?.message ?? 'Invalid input' })
      return
    }
    req.body = result.data
    next()
  }
}

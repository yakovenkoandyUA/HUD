import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { searchBooks } from '../controllers/booksController'

const router = Router()

router.get('/search', requireAuth, searchBooks)

export default router

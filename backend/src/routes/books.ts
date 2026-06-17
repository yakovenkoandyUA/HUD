import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { searchBooks, getBookDescription } from '../controllers/booksController'

const router = Router()

router.get('/search', requireAuth, searchBooks)
router.get('/description', requireAuth, getBookDescription)

export default router

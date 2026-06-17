import { Router } from 'express'
import { search, getAll, create, update, remove } from '../controllers/gamesController'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)
router.get('/search', search)
router.get('/', getAll)
router.post('/', create)
router.patch('/:id', update)
router.delete('/:id', remove)

export default router

import { Router } from 'express'
import { getAll, create, update, deposit, remove } from '../controllers/goalController'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)
router.get('/', getAll)
router.post('/', create)
router.patch('/:id/deposit', deposit)
router.patch('/:id', update)
router.delete('/:id', remove)

export default router

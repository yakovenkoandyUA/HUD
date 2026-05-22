import { Router } from 'express'
import { getAll, getStats, create, update, remove } from '../controllers/transactionController'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)
router.get('/stats', getStats)
router.get('/', getAll)
router.post('/', create)
router.put('/:id', update)
router.delete('/:id', remove)

export default router

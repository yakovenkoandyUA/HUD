import { Router } from 'express'
import { getAll, getStats, create, update, remove, countByCategory, migrateCategory } from '../controllers/transactionController'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)
router.get('/stats', getStats)
router.get('/count', countByCategory)
router.patch('/migrate-category', migrateCategory)
router.get('/', getAll)
router.post('/', create)
router.put('/:id', update)
router.patch('/:id', update)
router.delete('/:id', remove)

export default router

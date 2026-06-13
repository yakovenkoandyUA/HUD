import { Router } from 'express'
import { getAll, getStats, create, update, remove, countByCategory, migrateCategory } from '../controllers/transactionController'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { createTransactionSchema } from '../validation/schemas'

const router = Router()

router.use(requireAuth)
router.get('/stats', getStats)
router.get('/count', countByCategory)
router.patch('/migrate-category', migrateCategory)
router.get('/', getAll)
router.post('/', validate(createTransactionSchema), create)
router.put('/:id', update)
router.patch('/:id', update)
router.delete('/:id', remove)

export default router

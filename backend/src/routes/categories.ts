import { Router } from 'express'
import { getAll, create, remove } from '../controllers/categoryController'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)
router.get('/', getAll)
router.post('/', create)
router.delete('/:id', remove)

export default router

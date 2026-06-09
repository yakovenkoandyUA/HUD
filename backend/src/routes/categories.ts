import { Router } from 'express'
import { getAll, create, update, remove } from '../controllers/categoryController'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)
router.get('/',     getAll)
router.post('/',    create)
router.patch('/:id', update)
router.delete('/:id', remove)

export default router

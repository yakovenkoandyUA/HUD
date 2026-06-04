import { Router } from 'express'
import { getItems, createItem, updateItem, removeItem, clearItems } from '../controllers/shoppingController'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.get('/', getItems)
router.post('/', createItem)
router.delete('/', clearItems)
router.patch('/:id', updateItem)
router.delete('/:id', removeItem)

export default router

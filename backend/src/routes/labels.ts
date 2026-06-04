import { Router } from 'express'
import { getLabels, createLabel, updateLabel, removeLabel } from '../controllers/labelController'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.get('/', getLabels)
router.post('/', createLabel)
router.patch('/:id', updateLabel)
router.delete('/:id', removeLabel)

export default router

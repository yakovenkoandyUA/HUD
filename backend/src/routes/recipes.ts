import { Router } from 'express'
import { getAll, create, update, remove, generateRecipe } from '../controllers/recipeController'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)
router.post('/generate', generateRecipe)
router.get('/', getAll)
router.post('/', create)
router.put('/:id', update)
router.delete('/:id', remove)

export default router

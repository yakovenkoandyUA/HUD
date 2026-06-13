import { Router } from 'express'
import { getAll, create, update, remove, generateRecipe, logCook, getCookStats } from '../controllers/recipeController'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)
router.post('/generate', generateRecipe)
router.get('/cook-stats', getCookStats)
router.get('/', getAll)
router.post('/', create)
router.put('/:id', update)
router.delete('/:id', remove)
router.post('/:id/cook', logCook)

export default router

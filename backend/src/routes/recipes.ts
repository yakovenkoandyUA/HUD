import { Router } from 'express'
import { getAll, create, update, remove, generateRecipe, logCook, getCookStats, rateRecipe } from '../controllers/recipeController'
import { requireAuth } from '../middleware/auth'
import { requireVerified } from '../middleware/requireVerified'

const router = Router()

router.use(requireAuth)
router.post('/generate', requireVerified, generateRecipe)
router.get('/cook-stats', getCookStats)
router.get('/', getAll)
router.post('/', create)
router.put('/:id', update)
router.delete('/:id', remove)
router.patch('/:id/rating', rateRecipe)
router.post('/:id/cook', logCook)

export default router

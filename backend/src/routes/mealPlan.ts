import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { getMealPlan, saveMealPlan } from '../controllers/mealPlanController'

const router = Router()
router.use(requireAuth)

router.get('/', getMealPlan)
router.put('/', saveMealPlan)

export default router

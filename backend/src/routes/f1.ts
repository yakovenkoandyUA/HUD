import { Router } from 'express'
import { getF1Standings } from '../controllers/f1Controller'

const router = Router()

router.get('/standings', getF1Standings)

export default router

import { Router } from 'express'
import { getF1Standings } from '../controllers/f1Controller'
import { getPredictions, savePrediction, setPredictionResult } from '../controllers/f1PredictionController'
import { proxyOpenF1 } from '../controllers/f1LiveController'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/standings', getF1Standings)

router.get('/predictions', requireAuth, getPredictions)
router.post('/predictions', requireAuth, savePrediction)
router.patch('/predictions/:raceId/result', requireAuth, setPredictionResult)

// OpenF1 proxy — admin only
router.get('/live/:endpoint', requireAuth, proxyOpenF1)

export default router

import { Router } from 'express'
import { getFootballStandings, getFootballMatches } from '../controllers/footballController'

const router = Router()

router.get('/standings', getFootballStandings)
router.get('/matches', getFootballMatches)

export default router

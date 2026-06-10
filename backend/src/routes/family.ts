import { Router } from 'express'
import { getFamily, searchUsers, sendRequest, acceptRequest, removeLink } from '../controllers/familyController'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

router.get('/',           getFamily)
router.get('/search',     searchUsers)
router.post('/request',   sendRequest)
router.post('/accept/:linkId', acceptRequest)
router.delete('/:linkId', removeLink)

export default router

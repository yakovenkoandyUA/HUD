import { Router } from 'express'
import { getFamily, searchUsers, sendRequest, acceptRequest, removeLink } from '../controllers/familyController'
import { requireAuth } from '../middleware/auth'
import { loadUser } from '../middleware/loadUser'
import { requireFeature } from '../utils/entitlements'

const router = Router()

router.use(requireAuth)

router.get('/',           getFamily)
router.get('/search',     searchUsers)
router.post('/request',   loadUser, requireFeature('familyLink'), sendRequest)
router.post('/accept/:linkId', acceptRequest)
router.delete('/:linkId', removeLink)

export default router

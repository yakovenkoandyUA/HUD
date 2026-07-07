import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { loadUser } from '../middleware/loadUser'
import {
  getSpaces, createSpace, getSpace,
  updateSpace, deleteSpace, addMember, removeMember,
} from '../controllers/spaceController'

const router = Router()
router.use(requireAuth)

router.get('/',                        getSpaces)
router.post('/',                       loadUser, createSpace)
router.get('/:id',                     getSpace)
router.patch('/:id',                   updateSpace)
router.delete('/:id',                  deleteSpace)
router.post('/:id/members',            loadUser, addMember)
router.delete('/:id/members/:userId',  removeMember)

export default router

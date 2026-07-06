import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import {
  getSpaces, createSpace, getSpace,
  updateSpace, deleteSpace, addMember, removeMember,
} from '../controllers/spaceController'

const router = Router()
router.use(requireAuth)

router.get('/',                        getSpaces)
router.post('/',                       createSpace)
router.get('/:id',                     getSpace)
router.patch('/:id',                   updateSpace)
router.delete('/:id',                  deleteSpace)
router.post('/:id/members',            addMember)
router.delete('/:id/members/:userId',  removeMember)

export default router

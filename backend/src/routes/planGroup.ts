import { Router } from 'express'
import {
  getPlanGroup,
  inviteToGroup,
  acceptGroupInvite,
  declineGroupInvite,
  cancelGroupInvite,
  removeGroupMember,
  leaveGroup,
} from '../controllers/planGroupController'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

router.get('/',                       getPlanGroup)
router.post('/invite',                inviteToGroup)
router.post('/invite/:id/accept',     acceptGroupInvite)
router.post('/invite/:id/decline',    declineGroupInvite)
router.delete('/invite/:id',          cancelGroupInvite)
router.delete('/member/:userId',      removeGroupMember)
router.post('/leave',                 leaveGroup)

export default router

import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import * as ctrl from '../controllers/memoryController'

const router = Router()
router.use(requireAuth)

router.get('/', ctrl.getAll)
router.post('/', ctrl.create)

router.get('/:id/related', ctrl.getRelated)
router.patch('/:id', ctrl.update)
router.delete('/:id', ctrl.remove)
router.post('/:id/photos', ctrl.addPhoto)
router.patch('/:id/photos/:photoId', ctrl.updatePhoto)
router.delete('/:id/photos/:photoId', ctrl.deletePhoto)

export default router

import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { loadUser } from '../middleware/loadUser'
import {
  getSpaces, createSpace, getSpace,
  updateSpace, deleteSpace, addMember, removeMember,
} from '../controllers/spaceController'
import {
  getVehicleProfile, updateVehicleProfile,
  getVehicleEvents, createVehicleEvent, updateVehicleEvent, deleteVehicleEvent,
  getVehicleStats,
} from '../controllers/vehicleController'

const router = Router()
router.use(requireAuth)

router.get('/',                                        getSpaces)
router.post('/',                                       loadUser, createSpace)
router.get('/:id',                                     getSpace)
router.patch('/:id',                                   updateSpace)
router.delete('/:id',                                  deleteSpace)
router.post('/:id/members',                            loadUser, addMember)
router.delete('/:id/members/:userId',                  removeMember)

// vehicle
router.get('/:id/vehicle/profile',                     getVehicleProfile)
router.patch('/:id/vehicle/profile',                   updateVehicleProfile)
router.get('/:id/vehicle/events',                      getVehicleEvents)
router.post('/:id/vehicle/events',                     createVehicleEvent)
router.patch('/:id/vehicle/events/:eventId',           updateVehicleEvent)
router.delete('/:id/vehicle/events/:eventId',          deleteVehicleEvent)
router.get('/:id/vehicle/stats',                       getVehicleStats)

export default router

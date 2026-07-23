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
import {
  getHomeProfile, updateHomeProfile,
  getHomeEvents, createHomeEvent, updateHomeEvent, deleteHomeEvent,
} from '../controllers/homeController'
import {
  getPetProfile, updatePetProfile,
  getPetEvents, createPetEvent, updatePetEvent, deletePetEvent,
} from '../controllers/petController'
import { getTripProfile, updateTripProfile } from '../controllers/tripController'
import { getTickets, createTicket, updateTicket, deleteTicket } from '../controllers/ticketController'
import { getAccommodations, createAccommodation, updateAccommodation, deleteAccommodation } from '../controllers/accommodationController'
import { getTripPlaces, createTripPlace, updateTripPlace, deleteTripPlace } from '../controllers/tripPlaceController'

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

// home
router.get('/:id/home/profile',                        getHomeProfile)
router.patch('/:id/home/profile',                      updateHomeProfile)
router.get('/:id/home/events',                         getHomeEvents)
router.post('/:id/home/events',                        createHomeEvent)
router.patch('/:id/home/events/:eventId',              updateHomeEvent)
router.delete('/:id/home/events/:eventId',             deleteHomeEvent)

// pet
router.get('/:id/pet/profile',                         getPetProfile)
router.patch('/:id/pet/profile',                       updatePetProfile)
router.get('/:id/pet/events',                          getPetEvents)
router.post('/:id/pet/events',                         createPetEvent)
router.patch('/:id/pet/events/:eventId',               updatePetEvent)
router.delete('/:id/pet/events/:eventId',              deletePetEvent)

// trip
router.get('/:id/trip/profile',                        getTripProfile)
router.patch('/:id/trip/profile',                      updateTripProfile)
router.get('/:id/tickets',                             getTickets)
router.post('/:id/tickets',                            createTicket)
router.patch('/:id/tickets/:ticketId',                 updateTicket)
router.delete('/:id/tickets/:ticketId',                deleteTicket)
router.get('/:id/accommodations',                      getAccommodations)
router.post('/:id/accommodations',                     createAccommodation)
router.patch('/:id/accommodations/:itemId',            updateAccommodation)
router.delete('/:id/accommodations/:itemId',           deleteAccommodation)
router.get('/:id/places',                              getTripPlaces)
router.post('/:id/places',                             createTripPlace)
router.patch('/:id/places/:placeId',                   updateTripPlace)
router.delete('/:id/places/:placeId',                  deleteTripPlace)

export default router

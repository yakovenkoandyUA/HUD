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
import {
  getPlantProfile, updatePlantProfile,
  getPlantEvents, createPlantEvent, updatePlantEvent, deletePlantEvent,
} from '../controllers/plantController'
import {
  getSportProfile, updateSportProfile,
  getSportEvents, createSportEvent, updateSportEvent, deleteSportEvent,
  getWorkoutPrograms, createWorkoutProgram, updateWorkoutProgram, deleteWorkoutProgram,
  getWorkoutSessions, createWorkoutSession, deleteWorkoutSession,
} from '../controllers/sportController'
import { getTickets, createTicket, updateTicket, deleteTicket } from '../controllers/ticketController'
import { getAccommodations, createAccommodation, updateAccommodation, deleteAccommodation } from '../controllers/accommodationController'
import { getTripPlaces, createTripPlace, updateTripPlace, deleteTripPlace } from '../controllers/tripPlaceController'
import { getInfoCards, createInfoCard, updateInfoCard, deleteInfoCard } from '../controllers/spaceInfoCardController'

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

// plant
router.get('/:id/plant/profile',                       getPlantProfile)
router.patch('/:id/plant/profile',                     updatePlantProfile)
router.get('/:id/plant/events',                        getPlantEvents)
router.post('/:id/plant/events',                       createPlantEvent)
router.patch('/:id/plant/events/:eventId',             updatePlantEvent)
router.delete('/:id/plant/events/:eventId',            deletePlantEvent)

// sport
router.get('/:id/sport/profile',                           getSportProfile)
router.patch('/:id/sport/profile',                         updateSportProfile)
router.get('/:id/sport/events',                            getSportEvents)
router.post('/:id/sport/events',                           createSportEvent)
router.patch('/:id/sport/events/:eventId',                 updateSportEvent)
router.delete('/:id/sport/events/:eventId',                deleteSportEvent)
router.get('/:id/sport/programs',                          getWorkoutPrograms)
router.post('/:id/sport/programs',                         createWorkoutProgram)
router.patch('/:id/sport/programs/:programId',             updateWorkoutProgram)
router.delete('/:id/sport/programs/:programId',            deleteWorkoutProgram)
router.get('/:id/sport/sessions',                          getWorkoutSessions)
router.post('/:id/sport/sessions',                         createWorkoutSession)
router.delete('/:id/sport/sessions/:sessionId',            deleteWorkoutSession)

// info cards (blank/shared spaces)
router.get('/:id/info-cards',                          getInfoCards)
router.post('/:id/info-cards',                         createInfoCard)
router.patch('/:id/info-cards/:cardId',                updateInfoCard)
router.delete('/:id/info-cards/:cardId',               deleteInfoCard)

export default router

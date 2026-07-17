import { Schema, model, Document } from 'mongoose'

export type SpaceType = 'personal' | 'shared' | 'trip' | 'family' | 'friends' | 'hobby' | 'sports' | 'project' | 'vehicle' | 'home' | 'pet'

export interface ISpaceMember {
  userId: string
  role:   'owner' | 'member'
}

export interface IVehicleProfile {
  make:               string
  model:              string
  year:               number | null
  plateNumber:        string
  vin:                string
  frameNumber:        string
  currentMileage:     number | null
  fuelType:           string
  purchaseDate:       string | null
  photoUrl:           string
  nextServiceMileage: number | null
}

export interface IHomeProfile {
  addressLabel:  string
  ownershipType: 'rent' | 'own' | 'mortgage'
  area:          number | null
  floor:         number | null
  moveInDate:    string | null
  photoUrl:      string
}

export interface IPetFoodItem {
  id:        string
  name:      string
  brand:     string
  reaction:  'yes' | 'maybe' | 'no'
  notes:     string
  imageUrl:  string
}

export interface IPetProfile {
  name:           string
  species:        string
  breed:          string
  birthDate:      string | null
  weight:         number | null
  photoUrl:       string
  chipNumber:     string
  passportNumber: string
  foodLog:        IPetFoodItem[]
}

export interface ITripProfile {
  destination: string
  startDate:   string | null
  endDate:     string | null
  travelers:   number | null
  status:      'planning' | 'ongoing' | 'completed'
}

export interface ISpace extends Document {
  name:           string
  type:           SpaceType
  color:          string
  emoji:          string
  coverUrl:       string
  coverPosition:  string
  budget:         number | null
  budgetCurrency: string
  ownerId:        string
  members:        ISpaceMember[]
  modules:        string[]
  vehicleProfile: IVehicleProfile | null
  homeProfile:    IHomeProfile | null
  petProfile:     IPetProfile | null
  tripProfile:    ITripProfile | null
  archived:       boolean
  createdAt:      Date
}

const memberSchema = new Schema<ISpaceMember>({
  userId: { type: String, required: true },
  role:   { type: String, enum: ['owner', 'member'], default: 'member' },
}, { _id: false })

const vehicleProfileSchema = new Schema<IVehicleProfile>({
  make:           { type: String, default: '' },
  model:          { type: String, default: '' },
  year:           { type: Number, default: null },
  plateNumber:    { type: String, default: '' },
  vin:            { type: String, default: '' },
  frameNumber:    { type: String, default: '' },
  currentMileage: { type: Number, default: null },
  fuelType:       { type: String, default: '' },
  purchaseDate:       { type: String, default: null },
  photoUrl:           { type: String, default: '' },
  nextServiceMileage: { type: Number, default: null },
}, { _id: false })

const homeProfileSchema = new Schema<IHomeProfile>({
  addressLabel:  { type: String, default: '' },
  ownershipType: { type: String, enum: ['rent', 'own', 'mortgage'], default: 'rent' },
  area:          { type: Number, default: null },
  floor:         { type: Number, default: null },
  moveInDate:    { type: String, default: null },
  photoUrl:      { type: String, default: '' },
}, { _id: false })

const petFoodItemSchema = new Schema<IPetFoodItem>({
  id:       { type: String, default: () => new (require('mongoose').Types.ObjectId)().toHexString() },
  name:     { type: String, default: '' },
  brand:    { type: String, default: '' },
  reaction: { type: String, enum: ['yes', 'maybe', 'no'], default: 'yes' },
  notes:    { type: String, default: '' },
  imageUrl: { type: String, default: '' },
}, { _id: false })

const petProfileSchema = new Schema<IPetProfile>({
  name:           { type: String, default: '' },
  species:        { type: String, default: '' },
  breed:          { type: String, default: '' },
  birthDate:      { type: String, default: null },
  weight:         { type: Number, default: null },
  photoUrl:       { type: String, default: '' },
  chipNumber:     { type: String, default: '' },
  passportNumber: { type: String, default: '' },
  foodLog:        { type: [petFoodItemSchema], default: [] },
}, { _id: false })

const tripProfileSchema = new Schema<ITripProfile>({
  destination: { type: String, default: '' },
  startDate:   { type: String, default: null },
  endDate:     { type: String, default: null },
  travelers:   { type: Number, default: null },
  status:      { type: String, enum: ['planning', 'ongoing', 'completed'], default: 'planning' },
}, { _id: false })

const schema = new Schema<ISpace>({
  name:           { type: String, required: true, trim: true, maxlength: 60 },
  type:           { type: String, enum: ['personal','shared','trip','family','friends','hobby','sports','project','vehicle','home','pet'], default: 'shared' },
  color:          { type: String, default: '#9b59b6' },
  emoji:          { type: String, default: '' },
  coverUrl:       { type: String, default: '' },
  coverPosition:  { type: String, default: 'center' },
  budget:         { type: Number, default: null },
  budgetCurrency: { type: String, default: 'UAH' },
  ownerId:        { type: String, required: true, index: true },
  members:        { type: [memberSchema], default: [] },
  modules:        { type: [String], default: [] },
  vehicleProfile: { type: vehicleProfileSchema, default: null },
  homeProfile:    { type: homeProfileSchema,    default: null },
  petProfile:     { type: petProfileSchema,     default: null },
  tripProfile:    { type: tripProfileSchema,    default: null },
  archived:       { type: Boolean, default: false },
}, { timestamps: true })

schema.index({ 'members.userId': 1 })

export const Space = model<ISpace>('Space', schema)

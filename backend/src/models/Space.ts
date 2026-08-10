import { Schema, model, Document, Types } from 'mongoose'

export type SpaceType = 'personal' | 'shared' | 'trip' | 'family' | 'friends' | 'hobby' | 'sports' | 'project' | 'vehicle' | 'home' | 'pet' | 'plant' | 'blank' | 'cellar'

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
  drivetrain:         string
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

export interface IPlantProfile {
  commonName:           string
  species:              string
  location:             string
  acquiredDate:         string | null
  wateringIntervalDays: number | null
  lastWateredAt:        string | null
  lastFertilizedAt:     string | null
  sunlight:             'low' | 'medium' | 'high' | null
  photoUrl:             string
  toxicToPets:          boolean | null
  careNotes:            string
}

export interface ITripProfile {
  destination: string
  origin:      string
  startDate:   string | null
  endDate:     string | null
  travelers:   number | null
  status:      'planning' | 'booked' | 'ongoing' | 'completed'
}

export interface ISportPR {
  id:    string
  name:  string
  value: string
  unit:  string
  date:  string | null
}

export interface ISportProfile {
  sport:        string
  level:        'beginner' | 'intermediate' | 'advanced' | null
  goal:         string
  photoUrl:     string
  prs:          ISportPR[]
  measurements: ISportPR[]
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
  plantProfile:   IPlantProfile | null
  sportProfile:   ISportProfile | null
  notes:          string
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
  drivetrain:     { type: String, default: '' },
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

const plantProfileSchema = new Schema<IPlantProfile>({
  commonName:           { type: String, default: '' },
  species:              { type: String, default: '' },
  location:             { type: String, default: '' },
  acquiredDate:         { type: String, default: null },
  wateringIntervalDays: { type: Number, default: null },
  lastWateredAt:        { type: String, default: null },
  lastFertilizedAt:     { type: String, default: null },
  sunlight:             { type: String, enum: ['low', 'medium', 'high', null], default: null },
  photoUrl:             { type: String, default: '' },
  toxicToPets:          { type: Boolean, default: null },
  careNotes:            { type: String, default: '' },
}, { _id: false })

const sportPRSchema = new Schema<ISportPR>({
  id:    { type: String, default: () => new Types.ObjectId().toHexString() },
  name:  { type: String, default: '' },
  value: { type: String, default: '' },
  unit:  { type: String, default: '' },
  date:  { type: String, default: null },
}, { _id: false })

const sportProfileSchema = new Schema<ISportProfile>({
  sport:        { type: String, default: '' },
  level:        { type: String, enum: ['beginner', 'intermediate', 'advanced', null], default: null },
  goal:         { type: String, default: '' },
  photoUrl:     { type: String, default: '' },
  prs:          { type: [sportPRSchema], default: [] },
  measurements: { type: [sportPRSchema], default: [] },
}, { _id: false })

const tripProfileSchema = new Schema<ITripProfile>({
  destination: { type: String, default: '' },
  origin:      { type: String, default: '' },
  startDate:   { type: String, default: null },
  endDate:     { type: String, default: null },
  travelers:   { type: Number, default: null },
  status:      { type: String, enum: ['planning', 'booked', 'ongoing', 'completed'], default: 'planning' },
}, { _id: false })

const schema = new Schema<ISpace>({
  name:           { type: String, required: true, trim: true, maxlength: 60 },
  type:           { type: String, enum: ['personal','shared','trip','family','friends','hobby','sports','project','vehicle','home','pet','plant','blank','cellar'], default: 'shared' },
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
  plantProfile:   { type: plantProfileSchema,   default: null },
  sportProfile:   { type: sportProfileSchema,   default: null },
  archived:       { type: Boolean, default: false },
}, { timestamps: true })

schema.index({ 'members.userId': 1 })

export const Space = model<ISpace>('Space', schema)

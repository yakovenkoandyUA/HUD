import { Schema, model, Document } from 'mongoose'

export type SpaceType = 'personal' | 'shared' | 'trip' | 'family' | 'friends' | 'hobby' | 'sports' | 'project' | 'vehicle'

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
  currentMileage:     number | null
  fuelType:           string
  purchaseDate:       string | null
  photoUrl:           string
  nextServiceMileage: number | null
}

export interface ISpace extends Document {
  name:           string
  type:           SpaceType
  color:          string
  emoji:          string
  coverUrl:       string
  ownerId:        string
  members:        ISpaceMember[]
  vehicleProfile: IVehicleProfile | null
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
  currentMileage: { type: Number, default: null },
  fuelType:       { type: String, default: '' },
  purchaseDate:       { type: String, default: null },
  photoUrl:           { type: String, default: '' },
  nextServiceMileage: { type: Number, default: null },
}, { _id: false })

const schema = new Schema<ISpace>({
  name:           { type: String, required: true, trim: true, maxlength: 60 },
  type:           { type: String, enum: ['personal','shared','trip','family','friends','hobby','sports','project','vehicle'], default: 'shared' },
  color:          { type: String, default: '#9b59b6' },
  emoji:          { type: String, default: '' },
  coverUrl:       { type: String, default: '' },
  ownerId:        { type: String, required: true, index: true },
  members:        { type: [memberSchema], default: [] },
  vehicleProfile: { type: vehicleProfileSchema, default: null },
  archived:       { type: Boolean, default: false },
}, { timestamps: true })

schema.index({ 'members.userId': 1 })

export const Space = model<ISpace>('Space', schema)

import { Schema, model, Document } from 'mongoose'

export type TripPlaceCategory = 'museum' | 'restaurant' | 'cafe' | 'park' | 'shop' | 'viewpoint' | 'hotel' | 'other'

export interface ITripPlace extends Document {
  spaceId:   string
  userId:    string
  name:      string
  category:  TripPlaceCategory
  address:   string
  notes:     string
  visitDate: string
  createdAt: Date
}

const schema = new Schema<ITripPlace>({
  spaceId:   { type: String, required: true, index: true },
  userId:    { type: String, required: true, index: true },
  name:      { type: String, required: true },
  category:  { type: String, enum: ['museum','restaurant','cafe','park','shop','viewpoint','hotel','other'], default: 'other' },
  address:   { type: String, default: '' },
  notes:     { type: String, default: '' },
  visitDate: { type: String, default: '' },
}, { timestamps: true })

export const TripPlace = model<ITripPlace>('TripPlace', schema)

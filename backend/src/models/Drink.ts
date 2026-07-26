import { Schema, model, Document } from 'mongoose'

export type DrinkType = 'whisky' | 'wine' | 'beer' | 'gin' | 'rum' | 'cognac' | 'vodka' | 'liqueur' | 'other'
export type DrinkStatus = 'wishlist' | 'have' | 'finished'

export interface ITasting {
  _id?: string
  date: string
  userId: string
  rating: number
  notes: string
  occasion: string
}

export interface IDrink extends Document {
  name: string
  brand: string
  type: DrinkType
  country: string
  distillery: string
  abv: number | null
  photo: string
  status: DrinkStatus
  price: number | null
  rating: number | null
  notes: string
  flavor: {
    sweet: number
    smoky: number
    fruity: number
    spicy: number
    woody: number
    floral: number
  }
  tastings: ITasting[]
  userId: string
  sharedWith: string[]
  createdAt: Date
  updatedAt: Date
}

const tastingSchema = new Schema<ITasting>({
  date:     { type: String, required: true },
  userId:   { type: String, required: true },
  rating:   { type: Number, min: 1, max: 10, required: true },
  notes:    { type: String, default: '' },
  occasion: { type: String, default: '' },
}, { _id: true })

const schema = new Schema<IDrink>({
  name:       { type: String, required: true },
  brand:      { type: String, default: '' },
  type:       { type: String, enum: ['whisky', 'wine', 'beer', 'gin', 'rum', 'cognac', 'vodka', 'liqueur', 'other'], default: 'other' },
  country:    { type: String, default: '' },
  distillery: { type: String, default: '' },
  abv:        { type: Number, default: null },
  photo:      { type: String, default: '' },
  status:     { type: String, enum: ['wishlist', 'have', 'finished'], default: 'wishlist' },
  price:      { type: Number, default: null },
  rating:     { type: Number, default: null, min: 1, max: 10 },
  notes:      { type: String, default: '' },
  flavor: {
    sweet:  { type: Number, default: 0, min: 0, max: 5 },
    smoky:  { type: Number, default: 0, min: 0, max: 5 },
    fruity: { type: Number, default: 0, min: 0, max: 5 },
    spicy:  { type: Number, default: 0, min: 0, max: 5 },
    woody:  { type: Number, default: 0, min: 0, max: 5 },
    floral: { type: Number, default: 0, min: 0, max: 5 },
  },
  tastings:   { type: [tastingSchema], default: [] },
  userId:     { type: String, required: true, index: true },
  sharedWith: { type: [String], default: [] },
}, { timestamps: true })

schema.index({ userId: 1, status: 1 })

export default model<IDrink>('Drink', schema)

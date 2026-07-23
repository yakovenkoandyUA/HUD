import { Schema, model, Document } from 'mongoose'

export interface IAccommodation extends Document {
  spaceId:     string
  userId:      string
  name:        string
  address:     string
  checkIn:     string
  checkOut:    string
  bookingCode: string
  contactInfo: string
  link:        string
  price:       number | null
  currency:    'UAH' | 'USD' | 'EUR'
  notes:       string
  createdAt:   Date
}

const schema = new Schema<IAccommodation>({
  spaceId:     { type: String, required: true, index: true },
  userId:      { type: String, required: true, index: true },
  name:        { type: String, required: true },
  address:     { type: String, default: '' },
  checkIn:     { type: String, default: '' },
  checkOut:    { type: String, default: '' },
  bookingCode: { type: String, default: '' },
  contactInfo: { type: String, default: '' },
  link:        { type: String, default: '' },
  price:       { type: Number, default: null },
  currency:    { type: String, enum: ['UAH','USD','EUR'], default: 'UAH' },
  notes:       { type: String, default: '' },
}, { timestamps: true })

export const Accommodation = model<IAccommodation>('Accommodation', schema)

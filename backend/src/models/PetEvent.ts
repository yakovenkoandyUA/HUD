import { Schema, model, Document } from 'mongoose'

export type PetEventType =
  | 'vet_visit'
  | 'vaccination'
  | 'medication'
  | 'grooming'
  | 'weight'
  | 'note'

export interface IPetEvent extends Document {
  spaceId:        string
  userId:         string
  type:           PetEventType
  date:           string
  title:          string
  cost:           number | null
  currency:       'UAH' | 'USD' | 'EUR'
  clinic:         string
  notes:          string
  attachments:    string[]
  nextDue:        string | null
  weight:         number | null
  medicationName: string
  createdAt:      Date
}

const schema = new Schema<IPetEvent>({
  spaceId:        { type: String, required: true, index: true },
  userId:         { type: String, required: true, index: true },
  type:           { type: String, enum: ['vet_visit','vaccination','medication','grooming','weight','note'], required: true },
  date:           { type: String, required: true },
  title:          { type: String, default: '' },
  cost:           { type: Number, default: null },
  currency:       { type: String, enum: ['UAH','USD','EUR'], default: 'UAH' },
  clinic:         { type: String, default: '' },
  notes:          { type: String, default: '' },
  attachments:    { type: [String], default: [] },
  nextDue:        { type: String, default: null },
  weight:         { type: Number, default: null },
  medicationName: { type: String, default: '' },
}, { timestamps: true })

export const PetEvent = model<IPetEvent>('PetEvent', schema)

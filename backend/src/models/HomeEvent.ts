import { Schema, model, Document } from 'mongoose'

export type HomeEventType =
  | 'repair'
  | 'payment'
  | 'purchase'
  | 'document'
  | 'inspection'
  | 'note'
  | 'photo'

export interface IHomeEvent extends Document {
  spaceId:      string
  userId:       string
  type:         HomeEventType
  date:         string
  title:        string
  cost:         number | null
  currency:     'UAH' | 'USD' | 'EUR'
  vendor:       string
  notes:        string
  attachments:  string[]
  warrantyUntil: string | null
  docType:      string
  docExpiresAt: string | null
  createdAt:    Date
}

const schema = new Schema<IHomeEvent>({
  spaceId:      { type: String, required: true, index: true },
  userId:       { type: String, required: true, index: true },
  type:         { type: String, enum: ['repair','payment','purchase','document','inspection','note','photo'], required: true },
  date:         { type: String, required: true },
  title:        { type: String, default: '' },
  cost:         { type: Number, default: null },
  currency:     { type: String, enum: ['UAH','USD','EUR'], default: 'UAH' },
  vendor:       { type: String, default: '' },
  notes:        { type: String, default: '' },
  attachments:  { type: [String], default: [] },
  warrantyUntil: { type: String, default: null },
  docType:      { type: String, default: '' },
  docExpiresAt: { type: String, default: null },
}, { timestamps: true })

export const HomeEvent = model<IHomeEvent>('HomeEvent', schema)

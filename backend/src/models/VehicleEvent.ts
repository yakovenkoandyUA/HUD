import { Schema, model, Document } from 'mongoose'

export type VehicleEventType =
  | 'fuel'
  | 'maintenance'
  | 'repair'
  | 'inspection'
  | 'insurance'
  | 'tire_change'
  | 'document'
  | 'note'

export interface IVehicleEvent extends Document {
  spaceId:     string
  userId:      string
  type:        VehicleEventType
  date:        string
  mileage:     number | null
  cost:        number | null
  currency:    'UAH' | 'USD' | 'EUR'
  vendor:      string
  notes:       string
  attachments: string[]
  liters:      number | null
  fuelType:    string
  docType:     string
  docExpiresAt: string | null
  createdAt:   Date
}

const schema = new Schema<IVehicleEvent>({
  spaceId:      { type: String, required: true, index: true },
  userId:       { type: String, required: true, index: true },
  type:         { type: String, enum: ['fuel','maintenance','repair','inspection','insurance','tire_change','document','note'], required: true },
  date:         { type: String, required: true },
  mileage:      { type: Number, default: null },
  cost:         { type: Number, default: null },
  currency:     { type: String, enum: ['UAH','USD','EUR'], default: 'UAH' },
  vendor:       { type: String, default: '' },
  notes:        { type: String, default: '' },
  attachments:  { type: [String], default: [] },
  // fuel-specific
  liters:       { type: Number, default: null },
  fuelType:     { type: String, default: '' },
  // document-specific
  docType:      { type: String, default: '' },
  docExpiresAt: { type: String, default: null },
}, { timestamps: true })

export const VehicleEvent = model<IVehicleEvent>('VehicleEvent', schema)

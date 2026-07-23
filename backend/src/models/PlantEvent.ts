import { Schema, model, Document } from 'mongoose'

export type PlantEventType =
  | 'watering'
  | 'fertilizing'
  | 'repotting'
  | 'pruning'
  | 'treatment'
  | 'note'

export interface IPlantEvent extends Document {
  spaceId:   string
  userId:    string
  type:      PlantEventType
  date:      string
  notes:     string
  createdAt: Date
}

const schema = new Schema<IPlantEvent>({
  spaceId: { type: String, required: true, index: true },
  userId:  { type: String, required: true, index: true },
  type:    { type: String, enum: ['watering','fertilizing','repotting','pruning','treatment','note'], required: true },
  date:    { type: String, required: true },
  notes:   { type: String, default: '' },
}, { timestamps: true })

export const PlantEvent = model<IPlantEvent>('PlantEvent', schema)

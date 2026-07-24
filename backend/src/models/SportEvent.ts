import { Schema, model, Document } from 'mongoose'

export interface IWorkoutMetric {
  name:  string
  value: string
  unit:  string
}

export interface ISportEvent extends Document {
  spaceId:  string
  userId:   string
  date:     string
  title:    string
  duration: number | null
  metrics:  IWorkoutMetric[]
  notes:    string
  createdAt: Date
}

const metricSchema = new Schema<IWorkoutMetric>({
  name:  { type: String, default: '' },
  value: { type: String, default: '' },
  unit:  { type: String, default: '' },
}, { _id: false })

const schema = new Schema<ISportEvent>({
  spaceId:  { type: String, required: true, index: true },
  userId:   { type: String, required: true, index: true },
  date:     { type: String, required: true },
  title:    { type: String, default: '' },
  duration: { type: Number, default: null },
  metrics:  { type: [metricSchema], default: [] },
  notes:    { type: String, default: '' },
}, { timestamps: true })

export const SportEvent = model<ISportEvent>('SportEvent', schema)

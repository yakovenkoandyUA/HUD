import { Schema, model, Document } from 'mongoose'

export interface IWorkoutMetric {
  name:  string
  value: string
  unit:  string
}

export interface IRepeatConfig {
  interval:  number
  unit:      'day' | 'week' | 'month' | 'year'
  weekDays?: number[]
  endsType:  'never' | 'date' | 'after'
  endsDate?: string
  endsAfter?: number
}

export interface ISportEventReminder {
  amount: number
  unit:   'minutes' | 'hours' | 'days' | 'weeks'
}

export interface ISportEvent extends Document {
  spaceId:      string
  userId:       string
  date:         string
  time:         string | null
  title:        string
  duration:     number | null
  metrics:      IWorkoutMetric[]
  notes:        string
  repeat:       'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  repeatConfig: IRepeatConfig | null
  programIds:   string[]
  programNames: string[]
  reminder:     ISportEventReminder | null
  reminderSent: boolean
  createdAt: Date
}

const metricSchema = new Schema<IWorkoutMetric>({
  name:  { type: String, default: '' },
  value: { type: String, default: '' },
  unit:  { type: String, default: '' },
}, { _id: false })

const schema = new Schema<ISportEvent>({
  spaceId:      { type: String, required: true, index: true },
  userId:       { type: String, required: true, index: true },
  date:         { type: String, required: true },
  time:         { type: String, default: null },
  title:        { type: String, default: '' },
  duration:     { type: Number, default: null },
  metrics:      { type: [metricSchema], default: [] },
  notes:        { type: String, default: '' },
  repeat:       { type: String, default: 'none' },
  repeatConfig: { type: Schema.Types.Mixed, default: null },
  programIds:   { type: [String], default: [] },
  programNames: { type: [String], default: [] },
  reminder:     { type: Schema.Types.Mixed, default: null },
  reminderSent: { type: Boolean, default: false },
}, { timestamps: true })

export const SportEvent = model<ISportEvent>('SportEvent', schema)

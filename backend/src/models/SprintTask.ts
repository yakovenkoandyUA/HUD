import { Schema, model, Document } from 'mongoose'

export interface ISprintTask extends Document {
  title: string
  tag: string
  done: boolean
  weekNumber: number
  year: number
  weekStart?: string
  type: string
  repeat: string
  nextDue?: string
  repeatDay?: number
  repeatConfig?: Record<string, unknown>
  repeatStartDate?: string
  completionHistory?: string[]
  priority?: string
  reminder?: { amount: number; unit: string }
  checklist?: Array<{ id: string; title: string; done: boolean }>
  userId: string
}

const schema = new Schema<ISprintTask>({
  title:      { type: String, required: true },
  tag:        { type: String, default: '' },
  done:       { type: Boolean, default: false },
  weekNumber: { type: Number, required: true },
  year:       { type: Number, required: true },
  weekStart:  { type: String },
  type:       { type: String, default: 'sprint' },
  repeat:     { type: String, default: 'none' },
  nextDue:    { type: String },
  repeatDay:  { type: Number },
  repeatConfig: { type: Schema.Types.Mixed },
  repeatStartDate: { type: String },
  completionHistory: { type: [String], default: [] },
  priority:   { type: String, default: 'normal' },
  reminder:   { type: Schema.Types.Mixed, default: null },
  checklist:  { type: Schema.Types.Mixed, default: [] },
  userId:     { type: String, required: true, index: true },
}, { timestamps: true })

export default model<ISprintTask>('SprintTask', schema)

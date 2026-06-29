import { Schema, model, Document } from 'mongoose'

export interface ISprintTask extends Document {
  title: string
  tag: string
  done: boolean
  weekNumber: number
  year: number
  weekStart?: string
  type: string
  priority?: string
  category?: string | null
  labels?: string[]
  dueDate?: string | null
  dueTime?: string | null
  description?: string
  order?: number
  repeat: string
  nextDue?: string
  repeatDay?: number
  repeatConfig?: Record<string, unknown>
  repeatStartDate?: string
  completionHistory?: string[]
  reminder?: { amount: number; unit: string }
  reminderSent?: boolean
  checklist?: Array<{ id: string; title: string; done: boolean }>
  isPinned?: boolean
  deletedAt?: Date | null
  userId: string
  assignedTo?: string[]
}

const schema = new Schema<ISprintTask>({
  title:      { type: String, required: true },
  tag:        { type: String, default: '' },
  done:       { type: Boolean, default: false },
  weekNumber: { type: Number, default: 0 },
  year:       { type: Number, default: 0 },
  weekStart:  { type: String },
  type:       { type: String, default: 'sprint' },
  priority:   { type: String, default: 'normal' },
  category:   { type: String, default: null },
  labels:     { type: [String], default: [] },
  dueDate:    { type: String, default: null },
  dueTime:    { type: String, default: null },
  description:{ type: String, default: '' },
  order:      { type: Number, default: 0 },
  repeat:     { type: String, default: 'none' },
  nextDue:    { type: String },
  repeatDay:  { type: Number },
  repeatConfig: { type: Schema.Types.Mixed },
  repeatStartDate: { type: String },
  completionHistory: { type: [String], default: [] },
  reminder:   { type: Schema.Types.Mixed, default: null },
  reminderSent: { type: Boolean, default: false },
  checklist:  { type: Schema.Types.Mixed, default: [] },
  isPinned:   { type: Boolean, default: false },
  deletedAt:  { type: Date, default: null, index: { expireAfterSeconds: 86400 } },
  userId:     { type: String, required: true, index: true },
  assignedTo: { type: [String], default: [] },
}, { timestamps: true })

export default model<ISprintTask>('SprintTask', schema)

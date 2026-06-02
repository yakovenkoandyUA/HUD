import { Schema, model, Document } from 'mongoose'

export interface ITodoItem extends Document {
  title: string
  priority: 'urgent' | 'normal' | 'low'
  done: boolean
  dueDate: string
  type: string
  repeat: string
  nextDue?: string
  repeatDay?: number
  repeatConfig?: Record<string, unknown>
  repeatStartDate?: string
  completionHistory?: string[]
  reminder?: { amount: number; unit: string }
  userId: string
}

const schema = new Schema<ITodoItem>({
  title:    { type: String, required: true },
  priority: { type: String, enum: ['urgent', 'normal', 'low'], default: 'normal' },
  done:     { type: Boolean, default: false },
  dueDate:  { type: String, default: '' },
  type:     { type: String, default: 'todo' },
  repeat:   { type: String, default: 'none' },
  nextDue:  { type: String },
  repeatDay: { type: Number },
  repeatConfig: { type: Schema.Types.Mixed },
  repeatStartDate: { type: String },
  completionHistory: { type: [String], default: [] },
  reminder:  { type: Schema.Types.Mixed, default: null },
  userId:    { type: String, required: true, index: true },
}, { timestamps: true })

export default model<ITodoItem>('TodoItem', schema)

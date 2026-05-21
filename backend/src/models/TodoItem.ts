import { Schema, model, Document } from 'mongoose'

export interface ITodoItem extends Document {
  title: string
  priority: 'urgent' | 'normal' | 'low'
  done: boolean
  dueDate: string
  userId: string
}

const schema = new Schema<ITodoItem>({
  title:    { type: String, required: true },
  priority: { type: String, enum: ['urgent', 'normal', 'low'], default: 'normal' },
  done:     { type: Boolean, default: false },
  dueDate:  { type: String, default: '' },
  userId:   { type: String, required: true, index: true },
}, { timestamps: true })

export default model<ITodoItem>('TodoItem', schema)

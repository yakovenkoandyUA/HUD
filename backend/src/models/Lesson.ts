import { Schema, model, Document } from 'mongoose'

export interface ILesson extends Document {
  title: string
  desc: string
  status: 'planned' | 'done' | 'draft'
  sessionNotes: string
  homework: string
  date: string
  userId: string
}

const schema = new Schema<ILesson>({
  title:        { type: String, required: true },
  desc:         { type: String, default: '' },
  status:       { type: String, enum: ['planned', 'done', 'draft'], default: 'planned' },
  sessionNotes: { type: String, default: '' },
  homework:     { type: String, default: '' },
  date:         { type: String, default: '' },
  userId:       { type: String, required: true, index: true },
}, { timestamps: true })

export default model<ILesson>('Lesson', schema)

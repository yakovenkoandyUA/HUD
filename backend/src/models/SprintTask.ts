import { Schema, model, Document } from 'mongoose'

export interface ISprintTask extends Document {
  title: string
  tag: string
  done: boolean
  weekNumber: number
  year: number
  userId: string
}

const schema = new Schema<ISprintTask>({
  title:      { type: String, required: true },
  tag:        { type: String, default: '' },
  done:       { type: Boolean, default: false },
  weekNumber: { type: Number, required: true },
  year:       { type: Number, required: true },
  userId:     { type: String, required: true, index: true },
}, { timestamps: true })

export default model<ISprintTask>('SprintTask', schema)

import { Schema, model, Document } from 'mongoose'

export interface ICategory extends Document {
  userId: string
  name: string
  createdAt: Date
}

const schema = new Schema<ICategory>({
  userId: { type: String, required: true, index: true },
  name:   { type: String, required: true },
}, { timestamps: true })

export default model<ICategory>('Category', schema)

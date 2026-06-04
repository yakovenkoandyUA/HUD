import { Schema, model, Document } from 'mongoose'

export interface ILabel extends Document {
  title: string
  color: string
  userId: string
}

const schema = new Schema<ILabel>({
  title:  { type: String, default: '' },
  color:  { type: String, required: true },
  userId: { type: String, required: true, index: true },
}, { timestamps: true })

export default model<ILabel>('Label', schema)

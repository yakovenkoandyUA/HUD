import { Schema, model, Document } from 'mongoose'

export interface ICookLog extends Document {
  recipeId: string
  userId: string
  date: Date
}

const schema = new Schema<ICookLog>({
  recipeId: { type: String, required: true, index: true },
  userId:   { type: String, required: true, index: true },
  date:     { type: Date, default: Date.now },
})

export default model<ICookLog>('CookLog', schema)

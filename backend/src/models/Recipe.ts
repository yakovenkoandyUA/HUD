import { Schema, model, Document } from 'mongoose'

export interface IRecipe extends Document {
  title: string
  ingredients: string[]
  steps: string
  imageUrl: string
  isPersonal: boolean
  userId: string
}

const schema = new Schema<IRecipe>({
  title:       { type: String, required: true },
  ingredients: { type: [String], default: [] },
  steps:       { type: String, default: '' },
  imageUrl:    { type: String, default: '' },
  isPersonal:  { type: Boolean, default: true },
  userId:      { type: String, required: true, index: true },
}, { timestamps: true })

export default model<IRecipe>('Recipe', schema)

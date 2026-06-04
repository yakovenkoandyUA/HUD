import { Schema, model, Document } from 'mongoose'

export interface IRecipe extends Document {
  title: string
  ingredients: string[]
  steps: string
  imageUrl: string
  isPersonal: boolean
  userId: string
  category?: string
  calories?: number
  difficulty?: string
  cookTime?: number
  servings?: number
  equipment?: string[]
  tags?: string[]
}

const schema = new Schema<IRecipe>({
  title:       { type: String, required: true },
  ingredients: { type: [String], default: [] },
  steps:       { type: String, default: '' },
  imageUrl:    { type: String, default: '' },
  isPersonal:  { type: Boolean, default: true },
  userId:      { type: String, required: true, index: true },
  category:    { type: String, default: 'Інше' },
  calories:    { type: Number },
  difficulty:  { type: String },
  cookTime:    { type: Number },
  servings:    { type: Number },
  equipment:   { type: [String], default: [] },
  tags:        { type: [String], default: [] },
}, { timestamps: true })

export default model<IRecipe>('Recipe', schema)

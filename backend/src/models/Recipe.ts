import { Schema, model, Document } from 'mongoose'

export interface IRecipeRating {
  userId: string
  score: number
}

export interface IRecipe extends Document {
  title: string
  ingredients: (string | { name: string; amount: string; unit: string })[]
  steps: string
  instructions: string[]
  imageUrl: string
  isPersonal: boolean
  userId: string
  category?: string
  calories?: number
  difficulty?: string
  cookTime?: number
  servings?: number
  equipment?: string[]
  cookingMethod?: string[]
  tags?: string[]
  ratings: IRecipeRating[]
}

const schema = new Schema<IRecipe>({
  title:        { type: String, required: true },
  ingredients:  { type: [Schema.Types.Mixed], default: [] },
  steps:        { type: String, default: '' },
  instructions: { type: [String], default: [] },
  imageUrl:    { type: String, default: '' },
  isPersonal:  { type: Boolean, default: true },
  userId:      { type: String, required: true, index: true },
  category:    { type: String, default: 'Інше' },
  calories:    { type: Number },
  difficulty:  { type: String },
  cookTime:    { type: Number },
  servings:    { type: Number },
  equipment:      { type: [String], default: [] },
  cookingMethod:  { type: [String], default: [] },
  tags:           { type: [String], default: [] },
  ratings:        { type: [{ userId: String, score: Number }], default: [] },
}, { timestamps: true })

export default model<IRecipe>('Recipe', schema)

import mongoose, { Schema, Document } from 'mongoose'

export interface IMealPlan extends Document {
  userId: string
  // dayKey (YYYY-MM-DD) → recipeId[]
  plan: Map<string, string[]>
  updatedAt: Date
}

const MealPlanSchema = new Schema<IMealPlan>({
  userId: { type: String, required: true, unique: true },
  plan:   { type: Map, of: [String], default: {} },
}, { timestamps: true })

export default mongoose.model<IMealPlan>('MealPlan', MealPlanSchema)

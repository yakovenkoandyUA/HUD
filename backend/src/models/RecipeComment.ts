import { Schema, model, Document, Types } from 'mongoose'

export interface IRecipeComment extends Document {
  recipeId:  Types.ObjectId
  userId:    Types.ObjectId
  username:  string
  avatarUrl: string | null
  text:      string
  createdAt: Date
}

const RecipeCommentSchema = new Schema<IRecipeComment>({
  recipeId:  { type: Schema.Types.ObjectId, required: true, index: true },
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  username:  { type: String, required: true },
  avatarUrl: { type: String, default: null },
  text:      { type: String, required: true, maxlength: 1000 },
}, { timestamps: true })

export default model<IRecipeComment>('RecipeComment', RecipeCommentSchema)

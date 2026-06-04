import { Schema, model, Document } from 'mongoose'

export interface IShoppingItem extends Document {
  name: string
  amount: number
  unit: string
  recipeId: string
  recipeName: string
  checked: boolean
  userId: string
}

const schema = new Schema<IShoppingItem>({
  name:       { type: String, required: true },
  amount:     { type: Number, default: 1 },
  unit:       { type: String, default: 'шт' },
  recipeId:   { type: String, default: 'manual' },
  recipeName: { type: String, default: 'Вручну' },
  checked:    { type: Boolean, default: false },
  userId:     { type: String, required: true, index: true },
}, { timestamps: true })

export default model<IShoppingItem>('ShoppingItem', schema)

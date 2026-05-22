import { Schema, model, Document } from 'mongoose'

export interface ITransaction extends Document {
  type: 'income' | 'expense'
  amount: number
  desc: string
  category: string
  date: string
  userId: string
}

const schema = new Schema<ITransaction>({
  type:     { type: String, enum: ['income', 'expense'], required: true },
  amount:   { type: Number, required: true },
  desc:     { type: String, default: '' },
  category: { type: String, default: '' },
  date:     { type: String, required: true },
  userId:   { type: String, required: true, index: true },
}, { timestamps: true })

schema.index({ userId: 1, date: -1 })

export default model<ITransaction>('Transaction', schema)

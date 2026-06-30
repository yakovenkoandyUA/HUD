import { Schema, model, Document } from 'mongoose'

export interface ITransaction extends Document {
  type: 'income' | 'expense'
  amount: number
  desc: string
  title?: string
  category: string
  categoryId?: string | null
  recurringId?: string | null
  date: string
  userId: string
  monoId?: string | null
  source?: 'manual' | 'monobank' | 'csv'
  incomeCategory?: string | null
  mcc?: number | null
  tripMemoryId?: string | null
}

const schema = new Schema<ITransaction>({
  type:        { type: String, enum: ['income', 'expense'], required: true },
  amount:      { type: Number, required: true },
  desc:        { type: String, default: '' },
  title:       { type: String, default: '' },
  category:    { type: String, default: '' },
  categoryId:  { type: String, default: null },
  recurringId: { type: String, default: null },
  date:        { type: String, required: true },
  userId:      { type: String, required: true, index: true },
  monoId:         { type: String, default: null },
  source:         { type: String, enum: ['manual', 'monobank', 'csv'], default: 'manual' },
  incomeCategory: { type: String, default: null },
  mcc:            { type: Number, default: null },
  tripMemoryId:   { type: String, default: null },
}, { timestamps: true })

schema.index({ userId: 1, date: -1 })

export default model<ITransaction>('Transaction', schema)

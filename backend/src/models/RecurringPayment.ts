import { Schema, model, Document } from 'mongoose'

export interface IRecurringPayment extends Document {
  userId: string
  name: string
  amount: number
  dayOfMonth: number
  category: string
  isActive: boolean
  createdAt: Date
}

const schema = new Schema<IRecurringPayment>({
  userId:     { type: String, required: true, index: true },
  name:       { type: String, required: true },
  amount:     { type: Number, required: true },
  dayOfMonth: { type: Number, required: true, min: 1, max: 31 },
  category:   { type: String, default: 'Інше' },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true })

export default model<IRecurringPayment>('RecurringPayment', schema)

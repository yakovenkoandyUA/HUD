import { Schema, model, Document } from 'mongoose'

export interface IRecurringPayment extends Document {
  userId: string
  name: string
  amount: number
  amountForeign: number | null
  currency: 'UAH' | 'USD' | 'EUR'
  dayOfMonth: number
  category: string
  isActive: boolean
  reminderDays: number[]
  lastConfirmedMonth: string
  createdAt: Date
}

const schema = new Schema<IRecurringPayment>({
  userId:             { type: String, required: true, index: true },
  name:               { type: String, required: true },
  amount:             { type: Number, required: true },
  amountForeign:      { type: Number, default: null },
  currency:           { type: String, enum: ['UAH', 'USD', 'EUR'], default: 'UAH' },
  dayOfMonth:         { type: Number, required: true, min: 1, max: 31 },
  category:           { type: String, default: 'Інше' },
  isActive:           { type: Boolean, default: true },
  reminderDays:       { type: [Number], default: [] },
  lastConfirmedMonth: { type: String, default: '' },
}, { timestamps: true })

export default model<IRecurringPayment>('RecurringPayment', schema)

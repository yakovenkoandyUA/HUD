import { Schema, model, Document } from 'mongoose'

export interface IUsageCounter extends Document {
  userId: string
  key: string     // напр. 'receiptScanner', 'advancedFinance'
  month: string   // YYYY-MM
  count: number
}

const schema = new Schema<IUsageCounter>({
  userId: { type: String, required: true, index: true },
  key:    { type: String, required: true },
  month:  { type: String, required: true },
  count:  { type: Number, default: 0 },
})

schema.index({ userId: 1, key: 1, month: 1 }, { unique: true })

export default model<IUsageCounter>('UsageCounter', schema)

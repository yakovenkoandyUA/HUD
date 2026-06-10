import { Schema, model, Document } from 'mongoose'

export interface IFinancialReport extends Document {
  userId: string
  month: string       // YYYY-MM
  content: string     // markdown from Claude
  generatedAt: Date
}

const schema = new Schema<IFinancialReport>({
  userId:      { type: String, required: true, index: true },
  month:       { type: String, required: true },
  content:     { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
})

schema.index({ userId: 1, month: 1 }, { unique: true })

export default model<IFinancialReport>('FinancialReport', schema)

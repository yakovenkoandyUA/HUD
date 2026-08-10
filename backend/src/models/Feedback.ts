import { Schema, model, Document } from 'mongoose'

export interface IFeedback extends Document {
  userId: string
  message: string
  imageUrl: string | null
  imageUrls: string[]
  status: 'open' | 'resolved'
  adminReply: string | null
  repliedAt: Date | null
  createdAt: Date
}

const schema = new Schema<IFeedback>({
  userId:     { type: String, required: true },
  message:    { type: String, required: true },
  imageUrl:   { type: String, default: null }, // deprecated, лишається для старих записів
  imageUrls:  { type: [String], default: [] },
  status:     { type: String, enum: ['open', 'resolved'], default: 'open' },
  adminReply: { type: String, default: null },
  repliedAt:  { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } })

export const Feedback = model<IFeedback>('Feedback', schema)

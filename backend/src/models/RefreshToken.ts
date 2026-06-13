import { Schema, model, Document } from 'mongoose'

export interface IRefreshToken extends Document {
  userId: string
  tokenHash: string
  expiresAt: Date
  createdAt: Date
}

const schema = new Schema<IRefreshToken>({
  userId:    { type: String, required: true, index: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date,   required: true },
  createdAt: { type: Date,   default: Date.now },
})

// Auto-remove expired tokens via MongoDB TTL index
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const RefreshToken = model<IRefreshToken>('RefreshToken', schema)

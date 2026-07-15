import { Schema, model, Document } from 'mongoose'

export interface IFamilyLink extends Document {
  requester: string
  recipient: string
  status: 'pending' | 'accepted'
  relationshipType: string | null
  createdAt: Date
}

const schema = new Schema<IFamilyLink>({
  requester:        { type: String, required: true, index: true },
  recipient:        { type: String, required: true, index: true },
  status:           { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  relationshipType: { type: String, default: null },
  createdAt:        { type: Date, default: Date.now },
})

schema.index({ requester: 1, recipient: 1 }, { unique: true })

export const FamilyLink = model<IFamilyLink>('FamilyLink', schema)

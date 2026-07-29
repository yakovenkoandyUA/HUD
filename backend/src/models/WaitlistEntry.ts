import { Schema, model, Document } from 'mongoose'

export interface IWaitlistEntry extends Document {
  name: string
  email: string
  currentTools: string
  scenario: string
  consent: boolean
  createdAt: Date
}

const schema = new Schema<IWaitlistEntry>({
  name:         { type: String, required: true },
  email:        { type: String, required: true, lowercase: true, trim: true },
  currentTools: { type: String, default: '' },
  scenario:     { type: String, default: '' },
  consent:      { type: Boolean, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

export const WaitlistEntry = model<IWaitlistEntry>('WaitlistEntry', schema)

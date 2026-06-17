import { Schema, model, Document } from 'mongoose'

export interface IBankConnection extends Document {
  userId: string
  bank: 'monobank'
  encryptedToken: string
  accountId: string
  accountName: string
  lastSync: Date | null
  enabled: boolean
}

const schema = new Schema<IBankConnection>({
  userId:         { type: String, required: true, index: true },
  bank:           { type: String, enum: ['monobank'], required: true },
  encryptedToken: { type: String, required: true },
  accountId:      { type: String, required: true },
  accountName:    { type: String, default: '' },
  lastSync:       { type: Date, default: null },
  enabled:        { type: Boolean, default: true },
}, { timestamps: true })

schema.index({ userId: 1, bank: 1 }, { unique: true })

export default model<IBankConnection>('BankConnection', schema)

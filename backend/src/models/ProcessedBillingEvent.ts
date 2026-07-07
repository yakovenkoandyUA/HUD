import { Schema, model, Document, Types } from 'mongoose'

export interface IProcessedBillingEvent extends Document {
  provider: 'wayforpay'
  eventKey: string
  orderReference: string | null
  eventType: string | null
  relatedUserId: Types.ObjectId | null
  processedAt: Date
  rawProviderObjectId: string | null
}

const schema = new Schema<IProcessedBillingEvent>({
  provider:            { type: String, enum: ['wayforpay'], required: true },
  eventKey:            { type: String, required: true },
  orderReference:      { type: String, default: null },
  eventType:           { type: String, default: null },
  relatedUserId:       { type: Schema.Types.ObjectId, ref: 'User', default: null },
  processedAt:         { type: Date, default: Date.now },
  rawProviderObjectId: { type: String, default: null },
})

// Idempotency: reject duplicate events from same provider
schema.index({ provider: 1, eventKey: 1 }, { unique: true })
schema.index({ relatedUserId: 1, processedAt: -1 })

export default model<IProcessedBillingEvent>('ProcessedBillingEvent', schema)

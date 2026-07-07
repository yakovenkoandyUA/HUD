import { Schema, model, Document, Types } from 'mongoose'
import type { PaidPlanId, BillingInterval } from '../config/pricing'

export type BillingOrderStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'expired'

export interface IBillingOrder extends Document {
  userId: Types.ObjectId
  provider: 'wayforpay'
  orderReference: string
  planId: PaidPlanId
  interval: BillingInterval
  amount: number                              // kopecks
  currency: 'UAH'
  status: BillingOrderStatus
  expiresAt: Date
  paidAt: Date | null
  rawProviderPayload: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

const schema = new Schema<IBillingOrder>(
  {
    userId:              { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider:            { type: String, enum: ['wayforpay'], required: true },
    orderReference:      { type: String, required: true, unique: true },
    planId:              { type: String, enum: ['personal', 'couple', 'family'], required: true },
    interval:            { type: String, enum: ['month', 'year'], required: true },
    amount:              { type: Number, required: true },
    currency:            { type: String, enum: ['UAH'], required: true, default: 'UAH' },
    status:              { type: String, enum: ['pending', 'paid', 'failed', 'refunded', 'expired'], default: 'pending' },
    expiresAt:           { type: Date, required: true },
    paidAt:              { type: Date, default: null },
    rawProviderPayload:  { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
)

schema.index({ userId: 1, createdAt: -1 })
schema.index({ status: 1, expiresAt: 1 })

export default model<IBillingOrder>('BillingOrder', schema)

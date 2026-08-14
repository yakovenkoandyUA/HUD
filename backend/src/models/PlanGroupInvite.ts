import { Schema, model, Document, Types } from 'mongoose'

export type PlanGroupInviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled'

export interface IPlanGroupInvite extends Document {
  payerId: Types.ObjectId
  inviteeId: Types.ObjectId
  status: PlanGroupInviteStatus
  createdAt: Date
  respondedAt: Date | null
}

const schema = new Schema<IPlanGroupInvite>({
  payerId:   { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  inviteeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status:    { type: String, enum: ['pending', 'accepted', 'declined', 'cancelled'], default: 'pending' },
  createdAt:   { type: Date, default: Date.now },
  respondedAt: { type: Date, default: null },
})

schema.index({ payerId: 1, inviteeId: 1, status: 1 })

export const PlanGroupInvite = model<IPlanGroupInvite>('PlanGroupInvite', schema)

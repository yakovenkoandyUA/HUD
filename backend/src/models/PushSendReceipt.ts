import { Schema, model } from 'mongoose'

const schema = new Schema({
  _id: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  leaseUntil: { type: Date },
  accepted: { type: Boolean, default: false },
})

export default model('PushSendReceipt', schema)

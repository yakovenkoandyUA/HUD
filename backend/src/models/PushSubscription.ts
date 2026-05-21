import { Schema, model, Document } from 'mongoose'

export interface IPushSubscription extends Document {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  userId: string
}

const schema = new Schema<IPushSubscription>({
  endpoint: { type: String, required: true, unique: true },
  keys:     { p256dh: String, auth: String },
  userId:   { type: String, required: true, index: true },
}, { timestamps: true })

export default model<IPushSubscription>('PushSubscription', schema)

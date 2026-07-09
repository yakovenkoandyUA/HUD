import mongoose, { Schema, Document } from 'mongoose'

export interface IMimirCache extends Document {
  userId: string
  date: string       // YYYY-MM-DD
  timeSlot: 'morning' | 'afternoon' | 'evening'
  mode: 'wise' | 'witty' | 'dark'
  text: string
  pose: string
  createdAt: Date
}

const MimirCacheSchema = new Schema<IMimirCache>({
  userId:   { type: String, required: true, index: true },
  date:     { type: String, required: true },
  timeSlot: { type: String, required: true, enum: ['morning', 'afternoon', 'evening'] },
  mode:     { type: String, required: true, enum: ['wise', 'witty', 'dark'] },
  text:     { type: String, required: true },
  pose:     { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 90000 }, // TTL 25h
})

MimirCacheSchema.index({ userId: 1, date: 1, timeSlot: 1 }, { unique: true })

export default mongoose.model<IMimirCache>('MimirCache', MimirCacheSchema)

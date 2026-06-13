import { Schema, model, Document } from 'mongoose'

export interface IMoodLog extends Document {
  userId: string
  date:   string  // ISO date YYYY-MM-DD
  score:  1 | 2 | 3 | 4 | 5
}

const schema = new Schema<IMoodLog>({
  userId: { type: String, required: true, index: true },
  date:   { type: String, required: true },
  score:  { type: Number, required: true, min: 1, max: 5 },
}, { timestamps: true })

schema.index({ userId: 1, date: 1 }, { unique: true })

export default model<IMoodLog>('MoodLog', schema)

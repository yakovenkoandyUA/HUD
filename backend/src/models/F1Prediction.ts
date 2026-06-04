import { Schema, model, Document } from 'mongoose'

interface PredictionResult {
  p1Match: 'exact' | 'partial' | 'miss'
  p2Match: 'exact' | 'partial' | 'miss'
  p3Match: 'exact' | 'partial' | 'miss'
  actualP1: string
  actualP2: string
  actualP3: string
  points: number
}

export interface IF1Prediction extends Document {
  raceId: string
  raceName: string
  raceRound: number
  p1: string
  p2: string
  p3: string
  savedAt: string
  result?: PredictionResult | null
  userId: string
}

const schema = new Schema<IF1Prediction>({
  raceId:    { type: String, required: true },
  raceName:  { type: String, default: '' },
  raceRound: { type: Number, required: true },
  p1:        { type: String, required: true },
  p2:        { type: String, required: true },
  p3:        { type: String, required: true },
  savedAt:   { type: String, required: true },
  result:    { type: Schema.Types.Mixed, default: null },
  userId:    { type: String, required: true, index: true },
}, { timestamps: true })

schema.index({ userId: 1, raceId: 1 }, { unique: true })

export default model<IF1Prediction>('F1Prediction', schema)

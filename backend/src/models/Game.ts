import { Schema, model, Document } from 'mongoose'

export interface IGame extends Document {
  rawgId: number
  title: string
  coverUrl: string
  backgroundUrl: string
  platforms: string[]
  status: 'announced' | 'want' | 'playing' | 'completed' | 'dropped'
  platinum: boolean
  rating: number | null
  genres: string[]
  releaseDate: string
  metacritic: number | null
  notes: string
  hoursPlayed: number | null
  completedAt: string | null
  currentPlatform: string | null
  userId: string
  addedAt: string
}

const schema = new Schema<IGame>({
  rawgId:        { type: Number, default: 0 },
  title:         { type: String, required: true },
  coverUrl:      { type: String, default: '' },
  backgroundUrl: { type: String, default: '' },
  platforms:     { type: [String], default: [] },
  status:        { type: String, enum: ['announced', 'want', 'playing', 'completed', 'dropped'], default: 'want' },
  platinum:      { type: Boolean, default: false },
  rating:        { type: Number, default: null },
  genres:        { type: [String], default: [] },
  releaseDate:   { type: String, default: '' },
  metacritic:    { type: Number, default: null },
  notes:         { type: String, default: '' },
  hoursPlayed:      { type: Number, default: null },
  completedAt:      { type: String, default: null },
  currentPlatform:  { type: String, default: null },
  userId:        { type: String, required: true, index: true },
  addedAt:       { type: String, default: () => new Date().toISOString() },
}, { timestamps: true })

schema.index({ userId: 1, status: 1 })

export default model<IGame>('Game', schema)

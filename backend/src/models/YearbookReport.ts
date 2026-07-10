import { Schema, model, Document } from 'mongoose'

interface IYearbookSections {
  memoriesCount: number
  placesVisitedCount: number
  topPlaces: string[]
  moviesWatched: number
  seriesWatched: number
  animeWatched: number
  recipesCookedCount: number
  uniqueRecipesCount: number
  moodTrend: 'up' | 'down' | 'flat' | null
  totalSpent: number
  topExpenseCategories: { name: string; total: number }[]
  f1: { points: number; predictionsCount: number } | null
  vehicleStats: { totalCost: number; eventsCount: number; topEventType: string | null } | null
}

export interface IYearbookReport extends Document {
  userId: string
  year: number
  /** 'annual' | 'spring' | 'summer' | 'autumn' | 'winter' | '01'..'12' */
  period: string
  sections: IYearbookSections
  sourceSnapshotHash: string
  generatedAt: Date
}

const schema = new Schema<IYearbookReport>({
  userId: { type: String, required: true, index: true },
  year:   { type: Number, required: true },
  period: { type: String, required: true, default: 'annual' },
  sections: {
    memoriesCount:        { type: Number, default: 0 },
    placesVisitedCount:   { type: Number, default: 0 },
    topPlaces:            { type: [String], default: [] },
    moviesWatched:        { type: Number, default: 0 },
    seriesWatched:        { type: Number, default: 0 },
    animeWatched:         { type: Number, default: 0 },
    recipesCookedCount:   { type: Number, default: 0 },
    uniqueRecipesCount:   { type: Number, default: 0 },
    moodTrend:            { type: String, enum: ['up', 'down', 'flat', null], default: null },
    totalSpent:           { type: Number, default: 0 },
    topExpenseCategories: { type: [{ name: String, total: Number }], default: [] },
    f1:                   { type: Schema.Types.Mixed, default: null },
    vehicleStats:         { type: Schema.Types.Mixed, default: null },
  },
  sourceSnapshotHash: { type: String, required: true },
  generatedAt:         { type: Date, default: Date.now },
})

schema.index({ userId: 1, year: 1, period: 1 }, { unique: true })

export default model<IYearbookReport>('YearbookReport', schema)

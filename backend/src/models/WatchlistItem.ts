import { Schema, model, Document } from 'mongoose'

export interface IWatchlistItem extends Document {
  tmdbId: number
  title: string
  originalTitle: string
  category: 'movie' | 'series' | 'anime' | 'book'
  status: 'want' | 'watching' | 'watched' | 'dropped'
  posterPath: string
  backdropPath: string
  overview: string
  year: string
  genres: string[]
  rating: number | null
  seasonReminder: boolean
  reminderDate: string
  authors: string[]
  pageCount: number
  thumbnail: string
  currentSeason: number | null
  currentEpisode: number | null
  totalEpisodes: number | null
  totalSeasons: number | null
  notifyNewEpisode: boolean
  notifyNewSeason: boolean
  nextEpisodeDate: Date | null
  nextSeasonDate: Date | null
  watchedEpisodes: { season: number; episode: number }[]
  watchTogether: boolean
  watchedWith: string[]
  userId: string
  addedAt: string
}

const schema = new Schema<IWatchlistItem>({
  tmdbId:        { type: Number, default: 0 },
  title:         { type: String, required: true },
  originalTitle: { type: String, default: '' },
  category:      { type: String, enum: ['movie', 'series', 'anime', 'book'], required: true },
  status:        { type: String, enum: ['want', 'watching', 'watched', 'dropped'], default: 'want' },
  posterPath:    { type: String, default: '' },
  backdropPath:  { type: String, default: '' },
  overview:      { type: String, default: '' },
  year:          { type: String, default: '' },
  genres:        { type: [String], default: [] },
  rating:        { type: Number, default: null },
  seasonReminder:{ type: Boolean, default: false },
  reminderDate:  { type: String, default: '' },
  authors:        { type: [String], default: [] },
  pageCount:      { type: Number, default: 0 },
  thumbnail:      { type: String, default: '' },
  currentSeason:    { type: Number,  default: null  },
  currentEpisode:   { type: Number,  default: null  },
  totalEpisodes:    { type: Number,  default: null  },
  totalSeasons:     { type: Number,  default: null  },
  notifyNewEpisode: { type: Boolean, default: false },
  notifyNewSeason:  { type: Boolean, default: false },
  nextEpisodeDate:  { type: Date,    default: null  },
  nextSeasonDate:   { type: Date,    default: null  },
  watchedEpisodes: {
    type: [{ season: { type: Number, required: true }, episode: { type: Number, required: true } }],
    default: [],
  },
  watchTogether: { type: Boolean, default: false },
  watchedWith:   { type: [String], default: [] },
  userId:  { type: String, required: true, index: true },
  addedAt: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true })

schema.index({ userId: 1, category: 1 })

export default model<IWatchlistItem>('WatchlistItem', schema)

import { Schema, model, Document, Types } from 'mongoose'

interface IMemoryPhoto {
  _id: Types.ObjectId
  url: string
  caption: string
  createdAt: Date
  addedBy: string
  addedByName: string
}

interface IMemoryPlace {
  _id: Types.ObjectId
  name: string
  address: string
  lat: number
  lng: number
}

export interface IMemory extends Document {
  title: string
  location: string
  lat: number | null
  lng: number | null
  date: string
  dateEnd: string | null
  isTrip: boolean
  coverUrl: string
  coverAttribution: string
  notes: string
  tags: string[]
  photos: Types.DocumentArray<IMemoryPhoto>
  places: Types.DocumentArray<IMemoryPlace>
  withProfiles: string[]
  userId:  string
  spaceId: string | null
}

const photoSchema = new Schema<IMemoryPhoto>({
  url:         { type: String, required: true },
  caption:     { type: String, default: '' },
  createdAt:   { type: Date, default: Date.now },
  addedBy:     { type: String, default: '' },
  addedByName: { type: String, default: '' },
})

const placeSchema = new Schema<IMemoryPlace>({
  name:    { type: String, required: true },
  address: { type: String, default: '' },
  lat:     { type: Number, required: true },
  lng:     { type: Number, required: true },
})

const schema = new Schema<IMemory>({
  title:    { type: String, required: true },
  location: { type: String, default: '' },
  lat:      { type: Number, default: null },
  lng:      { type: Number, default: null },
  date:     { type: String, required: true },
  dateEnd:  { type: String, default: null },
  isTrip:   { type: Boolean, default: false },
  coverUrl:          { type: String, default: '' },
  coverAttribution:  { type: String, default: '' },
  notes:             { type: String, default: '' },
  tags:     [{ type: String }],
  photos:       { type: [photoSchema], default: [] },
  places:       { type: [placeSchema], default: [] },
  withProfiles: [{ type: String }],
  userId:  { type: String, required: true, index: true },
  spaceId: { type: String, default: null, index: true },
}, { timestamps: true })

export default model<IMemory>('Memory', schema)

import { Schema, model, Document, Types } from 'mongoose'

interface IPlanPhoto {
  url: string
  caption: string
  createdAt: Date
}

interface IPlanLocation {
  name:    string | null
  address: string | null
  lat:     number | null
  lng:     number | null
}

export interface IPlan extends Document {
  userId:       string
  title:        string
  location:     IPlanLocation
  withProfiles: string[]
  notes:        string
  photos:       Types.DocumentArray<IPlanPhoto & Document>
  status:       'want' | 'planned' | 'visited'
  plannedDate:  Date | null
  visitedDate:  Date | null
  memoryId:     Types.ObjectId | null
}

const photoSchema = new Schema<IPlanPhoto & Document>({
  url:       { type: String, required: true },
  caption:   { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
})

const locationSchema = new Schema<IPlanLocation>({
  name:    { type: String, default: null },
  address: { type: String, default: null },
  lat:     { type: Number, default: null },
  lng:     { type: Number, default: null },
}, { _id: false })

const PlanSchema = new Schema<IPlan>({
  userId:       { type: String, required: true, index: true },
  title:        { type: String, required: true },
  location:     { type: locationSchema, default: () => ({}) },
  withProfiles: [{ type: String }],
  notes:        { type: String, default: '' },
  photos:       { type: [photoSchema], default: [] },
  status:       { type: String, enum: ['want', 'planned', 'visited'], default: 'want' },
  plannedDate:  { type: Date, default: null },
  visitedDate:  { type: Date, default: null },
  memoryId:     { type: Schema.Types.ObjectId, ref: 'Memory', default: null },
}, { timestamps: true })

export default model<IPlan>('Plan', PlanSchema)

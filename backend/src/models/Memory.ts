import { Schema, model, Document, Types } from 'mongoose'

interface IMemoryPhoto {
  _id: Types.ObjectId
  url: string
  caption: string
  createdAt: Date
}

export interface IMemory extends Document {
  title: string
  location: string
  date: string
  coverUrl: string
  notes: string
  tags: string[]
  photos: Types.DocumentArray<IMemoryPhoto>
  userId: string
}

const photoSchema = new Schema<IMemoryPhoto>({
  url:       { type: String, required: true },
  caption:   { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
})

const schema = new Schema<IMemory>({
  title:    { type: String, required: true },
  location: { type: String, default: '' },
  date:     { type: String, required: true },
  coverUrl: { type: String, default: '' },
  notes:    { type: String, default: '' },
  tags:     [{ type: String }],
  photos:   { type: [photoSchema], default: [] },
  userId:   { type: String, required: true, index: true },
}, { timestamps: true })

export default model<IMemory>('Memory', schema)

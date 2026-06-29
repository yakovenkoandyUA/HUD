import { Schema, model, Document } from 'mongoose'

export interface ICategory extends Document {
  userId:    string
  name:      string
  icon:      string
  color:     string
  isDefault: boolean
  isActive:  boolean
  order:     number
  parentId:  string | null
  createdAt: Date
}

const schema = new Schema<ICategory>({
  userId:    { type: String, required: true, index: true },
  name:      { type: String, required: true },
  icon:      { type: String, default: 'ti-dots' },
  color:     { type: String, default: '#9CA3AF' },
  isDefault: { type: Boolean, default: false },
  isActive:  { type: Boolean, default: true },
  order:     { type: Number, default: 0 },
  parentId:  { type: String, default: null },
}, { timestamps: true })

schema.index({ userId: 1, name: 1, parentId: 1 }, { unique: true })

export default model<ICategory>('Category', schema)

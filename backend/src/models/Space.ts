import { Schema, model, Document } from 'mongoose'

export type SpaceType = 'personal' | 'shared' | 'trip' | 'family' | 'friends' | 'hobby' | 'sports' | 'project'

export interface ISpaceMember {
  userId: string
  role:   'owner' | 'member'
}

export interface ISpace extends Document {
  name:      string
  type:      SpaceType
  color:     string
  emoji:     string
  ownerId:   string
  members:   ISpaceMember[]
  createdAt: Date
}

const memberSchema = new Schema<ISpaceMember>({
  userId: { type: String, required: true },
  role:   { type: String, enum: ['owner', 'member'], default: 'member' },
}, { _id: false })

const schema = new Schema<ISpace>({
  name:    { type: String, required: true, trim: true, maxlength: 60 },
  type:    { type: String, enum: ['personal','shared','trip','family','friends','hobby','sports','project'], default: 'shared' },
  color:   { type: String, default: '#9b59b6' },
  emoji:   { type: String, default: '' },
  ownerId: { type: String, required: true, index: true },
  members: { type: [memberSchema], default: [] },
}, { timestamps: true })

schema.index({ 'members.userId': 1 })

export const Space = model<ISpace>('Space', schema)

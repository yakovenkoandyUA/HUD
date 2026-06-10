import { Schema, model, Document } from 'mongoose'

export interface IUser extends Document {
  name: string
  username: string
  email?: string
  passwordHash?: string
  pinHash?: string
  avatarUrl: string | null
  role: 'admin' | 'user'
  f1Enabled: boolean
  createdAt: Date
}

const schema = new Schema<IUser>({
  name:         { type: String, required: true },
  username:     { type: String, required: true, unique: true },
  email:        { type: String, unique: true, sparse: true },
  passwordHash: { type: String },
  pinHash:      { type: String },
  avatarUrl:    { type: String, default: null },
  role:         { type: String, enum: ['admin', 'user'], default: 'user' },
  f1Enabled:    { type: Boolean, default: false },
  createdAt:    { type: Date, default: Date.now },
})

export const User = model<IUser>('User', schema)

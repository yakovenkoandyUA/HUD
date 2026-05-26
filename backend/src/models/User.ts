import { Schema, model, Document } from 'mongoose'

export interface IUser extends Document {
  name: string
  username: string
  avatarUrl: string | null
  role: 'admin' | 'user'
  createdAt: Date
}

const schema = new Schema<IUser>({
  name:      { type: String, required: true },
  username:  { type: String, required: true, unique: true },
  avatarUrl: { type: String, default: null },
  role:      { type: String, enum: ['admin', 'user'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
})

export const User = model<IUser>('User', schema)

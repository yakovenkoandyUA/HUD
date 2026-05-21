import { Schema, model, Document } from 'mongoose'

export interface ISavingsGoal extends Document {
  title: string
  emoji: string
  targetAmount: number
  currentAmount: number
  deadline: string
  userId: string
}

const schema = new Schema<ISavingsGoal>({
  title:         { type: String, required: true },
  emoji:         { type: String, default: '🎯' },
  targetAmount:  { type: Number, required: true },
  currentAmount: { type: Number, default: 0 },
  deadline:      { type: String, default: '' },
  userId:        { type: String, required: true, index: true },
}, { timestamps: true })

export default model<ISavingsGoal>('SavingsGoal', schema)

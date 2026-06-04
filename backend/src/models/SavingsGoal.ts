import { Schema, model, Document } from 'mongoose'

export interface IDeposit {
  amount: number
  date: Date
}

export interface ISavingsGoal extends Document {
  title: string
  emoji: string
  targetAmount: number
  currentAmount: number
  deadline: string
  userId: string
  imageUrl: string
  deposits: IDeposit[]
}

const schema = new Schema<ISavingsGoal>({
  title:         { type: String, required: true },
  emoji:         { type: String, default: '🎯' },
  targetAmount:  { type: Number, required: true },
  currentAmount: { type: Number, default: 0 },
  deadline:      { type: String, default: '' },
  userId:        { type: String, required: true, index: true },
  imageUrl:      { type: String, default: '' },
  deposits:      { type: [{ amount: Number, date: Date }], default: [] },
}, { timestamps: true })

export default model<ISavingsGoal>('SavingsGoal', schema)

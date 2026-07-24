import { Schema, model, Document } from 'mongoose'

export interface IWorkoutSession extends Document {
  spaceId:             string
  userId:              string
  programId:           string
  programName:         string
  date:                string
  completedExercises:  string[]
  totalExercises:      number
  notes?:              string
  createdAt:           Date
}

const schema = new Schema<IWorkoutSession>({
  spaceId:            { type: String, required: true, index: true },
  userId:             { type: String, required: true, index: true },
  programId:          { type: String, required: true, index: true },
  programName:        { type: String, required: true },
  date:               { type: String, required: true },
  completedExercises: { type: [String], default: [] },
  totalExercises:     { type: Number, required: true },
  notes:              { type: String, default: '' },
}, { timestamps: true })

export const WorkoutSession = model<IWorkoutSession>('WorkoutSession', schema)

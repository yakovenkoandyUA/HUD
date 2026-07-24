import { Schema, model, Document } from 'mongoose'

export interface IWorkoutExercise {
  id:        string
  name:      string
  sets?:     number | null
  reps?:     number | null
  duration?: number | null
  notes?:    string
}

export interface IWorkoutProgram extends Document {
  spaceId:   string
  userId:    string
  name:      string
  exercises: IWorkoutExercise[]
  createdAt: Date
  updatedAt: Date
}

const exerciseSchema = new Schema<IWorkoutExercise>({
  id:       { type: String, required: true },
  name:     { type: String, required: true },
  sets:     { type: Number, default: null },
  reps:     { type: Number, default: null },
  duration: { type: Number, default: null },
  notes:    { type: String, default: '' },
}, { _id: false })

const schema = new Schema<IWorkoutProgram>({
  spaceId:   { type: String, required: true, index: true },
  userId:    { type: String, required: true, index: true },
  name:      { type: String, required: true },
  exercises: { type: [exerciseSchema], default: [] },
}, { timestamps: true })

export const WorkoutProgram = model<IWorkoutProgram>('WorkoutProgram', schema)

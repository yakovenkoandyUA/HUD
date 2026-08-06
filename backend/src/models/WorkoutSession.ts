import { Schema, model, Document } from 'mongoose'

export interface IWorkoutSetLog {
  reps:   number | null
  weight: number | null
}

export interface IWorkoutExerciseLog {
  exerciseId: string
  name:       string
  sets:       IWorkoutSetLog[]
}

export interface IWorkoutSession extends Document {
  spaceId:             string
  userId:              string
  programId:           string
  programName:         string
  date:                string
  completedExercises:  string[]
  totalExercises:      number
  exerciseLogs:        IWorkoutExerciseLog[]
  notes?:              string
  createdAt:           Date
}

const setLogSchema = new Schema<IWorkoutSetLog>({
  reps:   { type: Number, default: null },
  weight: { type: Number, default: null },
}, { _id: false })

const exerciseLogSchema = new Schema<IWorkoutExerciseLog>({
  exerciseId: { type: String, required: true },
  name:       { type: String, required: true },
  sets:       { type: [setLogSchema], default: [] },
}, { _id: false })

const schema = new Schema<IWorkoutSession>({
  spaceId:            { type: String, required: true, index: true },
  userId:             { type: String, required: true, index: true },
  programId:          { type: String, required: true, index: true },
  programName:        { type: String, required: true },
  date:               { type: String, required: true },
  completedExercises: { type: [String], default: [] },
  totalExercises:     { type: Number, required: true },
  exerciseLogs:       { type: [exerciseLogSchema], default: [] },
  notes:              { type: String, default: '' },
}, { timestamps: true })

export const WorkoutSession = model<IWorkoutSession>('WorkoutSession', schema)

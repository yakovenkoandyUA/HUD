import { Schema, model, Document } from 'mongoose'

export interface IWorkoutSetTarget {
  reps:   number | null
  weight: number | null
}

export interface IWorkoutExercise {
  id:          string
  name:        string
  setTargets?: IWorkoutSetTarget[] | null
  sets?:       number | null
  reps?:       number | null
  duration?:   number | null
  restSec?:    number | null
  notes?:      string
}

export interface IWorkoutProgram extends Document {
  spaceId:   string
  userId:    string
  name:      string
  exercises: IWorkoutExercise[]
  createdAt: Date
  updatedAt: Date
}

const setTargetSchema = new Schema<IWorkoutSetTarget>({
  reps:   { type: Number, default: null },
  weight: { type: Number, default: null },
}, { _id: false })

const exerciseSchema = new Schema<IWorkoutExercise>({
  id:         { type: String, required: true },
  name:       { type: String, required: true },
  setTargets: { type: [setTargetSchema], default: null },
  sets:       { type: Number, default: null },
  reps:       { type: Number, default: null },
  duration:   { type: Number, default: null },
  restSec:    { type: Number, default: null },
  notes:      { type: String, default: '' },
}, { _id: false })

const schema = new Schema<IWorkoutProgram>({
  spaceId:   { type: String, required: true, index: true },
  userId:    { type: String, required: true, index: true },
  name:      { type: String, required: true },
  exercises: { type: [exerciseSchema], default: [] },
}, { timestamps: true })

export const WorkoutProgram = model<IWorkoutProgram>('WorkoutProgram', schema)

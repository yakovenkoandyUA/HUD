import { Schema, model, Document } from 'mongoose'

export interface IF1SessionReminder extends Document {
  userId:       string
  round:        number
  sessionKey:   string
  sessionLabel: string
  sessionAt:    Date
  remindAt:     Date
  sent:         boolean
}

const schema = new Schema<IF1SessionReminder>({
  userId:       { type: String,  required: true, index: true },
  round:        { type: Number,  required: true },
  sessionKey:   { type: String,  required: true },
  sessionLabel: { type: String,  required: true },
  sessionAt:    { type: Date,    required: true },
  remindAt:     { type: Date,    required: true },
  sent:         { type: Boolean, default: false },
}, { timestamps: true })

schema.index({ userId: 1, round: 1, sessionKey: 1 }, { unique: true })
schema.index({ remindAt: 1, sent: 1 })

export default model<IF1SessionReminder>('F1SessionReminder', schema)

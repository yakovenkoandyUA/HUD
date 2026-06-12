import mongoose, { Document, Schema } from 'mongoose'

export interface INote extends Document {
  text: string
  userId: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const NoteSchema = new Schema<INote>(
  {
    text: { type: String, required: true, maxlength: 5000 },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
)

export default mongoose.model<INote>('Note', NoteSchema)

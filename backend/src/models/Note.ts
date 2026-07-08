import mongoose, { Document, Schema } from 'mongoose'

export interface INote extends Document {
  text: string
  userId: mongoose.Types.ObjectId
  spaceId: mongoose.Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const NoteSchema = new Schema<INote>(
  {
    text:    { type: String, required: true, maxlength: 5000 },
    userId:  { type: Schema.Types.ObjectId, ref: 'User',  required: true, index: true },
    spaceId: { type: Schema.Types.ObjectId, ref: 'Space', required: false, default: null, index: true },
  },
  { timestamps: true }
)

export default mongoose.model<INote>('Note', NoteSchema)

import { Schema, model, Document, Types } from 'mongoose'

export interface IWatchlistComment extends Document {
  watchlistItemId: Types.ObjectId
  userId:          Types.ObjectId
  username:        string
  avatarUrl:       string | null
  text:            string
  createdAt:       Date
}

const WatchlistCommentSchema = new Schema<IWatchlistComment>({
  watchlistItemId: { type: Schema.Types.ObjectId, required: true, index: true },
  userId:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
  username:        { type: String, required: true },
  avatarUrl:       { type: String, default: null },
  text:            { type: String, required: true, maxlength: 500 },
}, { timestamps: true })

export default model<IWatchlistComment>('WatchlistComment', WatchlistCommentSchema)

import { Schema, model } from 'mongoose'

export const MIMIR_CHAT_TURN_LIMIT = 10

interface MimirChatTurn {
  question: string
  answer: string
  domains: string[]
  action?: { type: 'note' | 'quest'; id: string; title: string }
}

const turnSchema = new Schema<MimirChatTurn>({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  domains: [String],
  action: { type: { type: String, enum: ['note', 'quest'] }, id: String, title: String },
})

const conversationSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  turns: [turnSchema],
})

export default model('MimirConversation', conversationSchema)

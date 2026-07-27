import { Schema, model, Document } from 'mongoose'

export type TicketTransport = 'plane' | 'train' | 'bus' | 'ferry' | 'car'
export type TicketStatus    = 'planned' | 'confirmed' | 'cancelled' | 'used'

export interface ITicket extends Document {
  spaceId:       string
  userId:        string
  transport:     TicketTransport
  from:          string
  to:            string
  date:          string
  departureTime: string
  arrivalTime:   string
  carrier:       string
  flightNumber:  string
  seat:          string
  bookingCode:   string
  attachmentUrl: string
  price:         number | null
  currency:      'UAH' | 'USD' | 'EUR'
  status:        TicketStatus
  createdAt:     Date
}

const schema = new Schema<ITicket>({
  spaceId:       { type: String, required: true, index: true },
  userId:        { type: String, required: true, index: true },
  transport:     { type: String, enum: ['plane','train','bus','ferry','car'], required: true },
  from:          { type: String, default: '' },
  to:            { type: String, default: '' },
  date:          { type: String, required: true },
  departureTime: { type: String, default: '' },
  arrivalTime:   { type: String, default: '' },
  carrier:       { type: String, default: '' },
  flightNumber:  { type: String, default: '' },
  seat:          { type: String, default: '' },
  bookingCode:   { type: String, default: '' },
  attachmentUrl: { type: String, default: '' },
  price:         { type: Number, default: null },
  currency:      { type: String, enum: ['UAH','USD','EUR'], default: 'UAH' },
  status:        { type: String, enum: ['planned','confirmed','cancelled','used'], default: 'planned' },
}, { timestamps: true })

export const Ticket = model<ITicket>('Ticket', schema)

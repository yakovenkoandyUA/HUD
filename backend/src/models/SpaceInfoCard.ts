import { Schema, model, Document } from 'mongoose'

export type InfoCardIconType = 'link' | 'phone' | 'address' | 'email' | 'text' | 'wifi' | 'code'

export interface ISpaceInfoCard extends Document {
  spaceId:  string
  userId:   string
  iconType: InfoCardIconType
  label:    string
  value:    string
  order:    number
}

const SpaceInfoCardSchema = new Schema<ISpaceInfoCard>({
  spaceId:  { type: String, required: true, index: true },
  userId:   { type: String, required: true },
  iconType: { type: String, default: 'text' },
  label:    { type: String, required: true, maxlength: 60 },
  value:    { type: String, required: true, maxlength: 200 },
  order:    { type: Number, default: 0 },
}, { timestamps: true })

export const SpaceInfoCard = model<ISpaceInfoCard>('SpaceInfoCard', SpaceInfoCardSchema)

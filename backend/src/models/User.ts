import { Schema, model, Document } from 'mongoose'

export type PlanId = 'free' | 'personal' | 'couple' | 'family'
export type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled'
export type AccountStatus = 'active' | 'deletion_requested' | 'deleted'

export interface IUser extends Document {
  name: string
  username: string
  email?: string
  passwordHash?: string
  pinHash?: string
  avatarUrl: string | null
  role: 'admin' | 'user'
  f1Enabled: boolean
  salaryDay: number
  city: string
  morningStart: number
  afternoonStart: number
  eveningStart: number
  isVerified: boolean
  verificationToken: string | null
  reportStyle: string
  mediaEnabledTabs: string[]
  sprintTutorialSeen: boolean
  weekdayLongPressTutorialSeen: boolean
  swipeDismissTutorialSeen: boolean
  sprintTutorialShownCount: number
  weekdayLongPressShownCount: number
  swipeDismissShownCount: number
  unlockedAchievements: { id: string; unlockedAt: Date }[]
  onboardingCompleted: boolean
  createdAt: Date
  // Subscription fields
  plan: PlanId
  subscriptionStatus: SubscriptionStatus
  billingProvider: 'wayforpay' | 'paddle' | null
  paddleCustomerId: string | null
  paddleSubscriptionId: string | null
  currentPeriodEnd: Date | null
  trialEndsAt: Date | null
  earlyBirdLockedPrice: number | null
  // Provider-neutral billing fields
  billingInterval: 'month' | 'year' | null
  billingOrderId: string | null
  cancelAtPeriodEnd: boolean
  lastBillingSyncAt: Date | null
  // Renewal reminder tracking — null = not sent yet, reset on successful payment
  renewalReminder7dSentAt: Date | null
  renewalReminder1dSentAt: Date | null
  downgradedAt: Date | null
  // Account lifecycle
  accountStatus: AccountStatus
  deletedAt: Date | null
}

const schema = new Schema<IUser>({
  name:              { type: String, required: true },
  username:          { type: String, required: true, unique: true },
  email:             { type: String, unique: true, sparse: true },
  passwordHash:      { type: String },
  pinHash:           { type: String },
  avatarUrl:         { type: String, default: null },
  role:              { type: String, enum: ['admin', 'user'], default: 'user' },
  f1Enabled:         { type: Boolean, default: false },
  salaryDay:         { type: Number, default: 1, min: 1, max: 31 },
  city:              { type: String, default: '' },
  morningStart:      { type: Number, default: 6,  min: 0, max: 23 },
  afternoonStart:    { type: Number, default: 12, min: 0, max: 23 },
  eveningStart:      { type: Number, default: 18, min: 0, max: 23 },
  isVerified:        { type: Boolean, default: false },
  verificationToken: { type: String, default: null },
  reportStyle:       { type: String, default: 'standard' },
  mediaEnabledTabs:  { type: [String], default: ['movie', 'series', 'anime', 'game'] },
  sprintTutorialSeen: { type: Boolean, default: false },
  weekdayLongPressTutorialSeen: { type: Boolean, default: false },
  swipeDismissTutorialSeen: { type: Boolean, default: false },
  sprintTutorialShownCount: { type: Number, default: 0 },
  weekdayLongPressShownCount: { type: Number, default: 0 },
  swipeDismissShownCount: { type: Number, default: 0 },
  unlockedAchievements: {
    type: [{ id: { type: String, required: true }, unlockedAt: { type: Date, default: Date.now } }],
    default: [],
  },
  onboardingCompleted:    { type: Boolean, default: false },
  createdAt:              { type: Date, default: Date.now },
  // Subscription fields — safe defaults, no migration needed
  plan:                   { type: String, enum: ['free', 'personal', 'couple', 'family'], default: 'free' },
  subscriptionStatus:     { type: String, enum: ['none', 'trialing', 'active', 'past_due', 'canceled'], default: 'none' },
  billingProvider:        { type: String, enum: ['wayforpay', 'paddle', null], default: null },
  paddleCustomerId:       { type: String, default: null },
  paddleSubscriptionId:   { type: String, default: null },
  currentPeriodEnd:       { type: Date, default: null },
  trialEndsAt:            { type: Date, default: null },
  earlyBirdLockedPrice:   { type: Number, default: null },
  billingInterval:           { type: String, enum: ['month', 'year', null], default: null },
  billingOrderId:            { type: String, default: null },
  cancelAtPeriodEnd:         { type: Boolean, default: false },
  lastBillingSyncAt:         { type: Date, default: null },
  renewalReminder7dSentAt:   { type: Date, default: null },
  renewalReminder1dSentAt:   { type: Date, default: null },
  downgradedAt:              { type: Date, default: null },
  // Account lifecycle — safe defaults, no migration needed
  accountStatus: { type: String, enum: ['active', 'deletion_requested', 'deleted'], default: 'active' },
  deletedAt:     { type: Date, default: null },
})

export const User = model<IUser>('User', schema)

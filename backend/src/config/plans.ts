export type PlanId = 'free' | 'personal' | 'couple' | 'family'

export type Feature =
  | 'aiChat'
  | 'aiChefChat'
  | 'receiptScanner'
  | 'yearbookGenerate'
  | 'monobank'
  | 'gdprExport'
  | 'advancedFinance'
  | 'familyLink'
  | 'sharedSpaces'
  | 'mimirAi'

export interface PlanLimits {
  maxSpaces: number                  // -1 = unlimited
  maxSharedSpaces: number            // 0 = disabled, -1 = unlimited
  maxMembersPerSharedSpace: number   // 0 = disabled, -1 = unlimited
  timelineHistoryYears: number       // -1 = unlimited
}

export interface PlanConfig {
  id: PlanId
  limits: PlanLimits
  features: Record<Feature, boolean>
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    limits: {
      maxSpaces: 2,
      maxSharedSpaces: 0,
      maxMembersPerSharedSpace: 0,
      timelineHistoryYears: 1,
    },
    features: {
      aiChat: false,
      aiChefChat: false,
      receiptScanner: false,
      yearbookGenerate: false,
      monobank: false,
      gdprExport: false,
      advancedFinance: false,
      familyLink: false,
      sharedSpaces: false,
      mimirAi: false,
    },
  },

  personal: {
    id: 'personal',
    limits: {
      maxSpaces: 5,
      maxSharedSpaces: 0,
      maxMembersPerSharedSpace: 0,
      timelineHistoryYears: 5,
    },
    features: {
      aiChat: true,
      aiChefChat: true,
      receiptScanner: true,
      yearbookGenerate: true,
      monobank: true,
      gdprExport: true,
      advancedFinance: true,
      familyLink: false,
      sharedSpaces: false,
      mimirAi: true,
    },
  },

  couple: {
    id: 'couple',
    limits: {
      maxSpaces: 10,
      maxSharedSpaces: 3,
      maxMembersPerSharedSpace: 5,
      timelineHistoryYears: -1,
    },
    features: {
      aiChat: true,
      aiChefChat: true,
      receiptScanner: true,
      yearbookGenerate: true,
      monobank: true,
      gdprExport: true,
      advancedFinance: true,
      familyLink: true,
      sharedSpaces: true,
      mimirAi: true,
    },
  },

  family: {
    id: 'family',
    limits: {
      maxSpaces: -1,
      maxSharedSpaces: -1,
      maxMembersPerSharedSpace: -1,
      timelineHistoryYears: -1,
    },
    features: {
      aiChat: true,
      aiChefChat: true,
      receiptScanner: true,
      yearbookGenerate: true,
      monobank: true,
      gdprExport: true,
      advancedFinance: true,
      familyLink: true,
      sharedSpaces: true,
      mimirAi: true,
    },
  },
}

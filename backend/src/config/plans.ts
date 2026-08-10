export type PlanId = 'free' | 'personal' | 'couple' | 'family'

export type Feature =
  | 'aiChat'
  | 'aiChefChat'
  | 'receiptScanner'
  | 'yearbookGenerate'
  | 'monobank'
  | 'gdprExport'
  | 'advancedFinance'
  | 'sharedSpaces'
  | 'mimirAi'

export interface PlanLimits {
  maxSpaces: number                  // -1 = unlimited
  maxSharedSpaces: number            // 0 = disabled, -1 = unlimited
  maxMembersPerSharedSpace: number   // 0 = disabled, -1 = unlimited
  timelineHistoryYears: number       // -1 = unlimited
  maxReceiptScansPerMonth: number    // -1 = unlimited
  maxFinancialReportsPerMonth: number // -1 = unlimited
  maxFamilyLinks: number             // -1 = unlimited
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
      maxSharedSpaces: 3,
      maxMembersPerSharedSpace: 5,
      timelineHistoryYears: 1,
      maxReceiptScansPerMonth: 5,
      maxFinancialReportsPerMonth: 1,
      maxFamilyLinks: 2,
    },
    features: {
      aiChat: false,
      aiChefChat: false,
      receiptScanner: true,
      yearbookGenerate: false,
      monobank: true,
      gdprExport: false,
      advancedFinance: true,
      sharedSpaces: true,
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
      maxReceiptScansPerMonth: -1,
      maxFinancialReportsPerMonth: -1,
      maxFamilyLinks: 2,
    },
    features: {
      aiChat: true,
      aiChefChat: true,
      receiptScanner: true,
      yearbookGenerate: true,
      monobank: true,
      gdprExport: true,
      advancedFinance: true,
      sharedSpaces: false,
      mimirAi: true,
    },
  },

  couple: {
    id: 'couple',
    limits: {
      maxSpaces: 10,
      maxSharedSpaces: 5,
      maxMembersPerSharedSpace: 5,
      timelineHistoryYears: -1,
      maxReceiptScansPerMonth: -1,
      maxFinancialReportsPerMonth: -1,
      maxFamilyLinks: -1,
    },
    features: {
      aiChat: true,
      aiChefChat: true,
      receiptScanner: true,
      yearbookGenerate: true,
      monobank: true,
      gdprExport: true,
      advancedFinance: true,
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
      maxReceiptScansPerMonth: -1,
      maxFinancialReportsPerMonth: -1,
      maxFamilyLinks: -1,
    },
    features: {
      aiChat: true,
      aiChefChat: true,
      receiptScanner: true,
      yearbookGenerate: true,
      monobank: true,
      gdprExport: true,
      advancedFinance: true,
      sharedSpaces: true,
      mimirAi: true,
    },
  },
}

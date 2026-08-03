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
  maxTaskImages: number              // images per quest/shopping item
  maxReceiptScansPerMonth: number    // -1 = unlimited
  maxFinancialReportsPerMonth: number // -1 = unlimited
  maxFamilyLinks: number             // -1 = unlimited
}

export interface PlanConfig {
  id: PlanId
  label: string
  limits: PlanLimits
  features: Record<Feature, boolean>
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    label: 'Free',
    limits: {
      maxSpaces: 2,
      maxSharedSpaces: 3,
      maxMembersPerSharedSpace: 5,
      timelineHistoryYears: 1,
      maxTaskImages: 1,
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
    label: 'Personal',
    limits: {
      maxSpaces: 5,
      maxSharedSpaces: 0,
      maxMembersPerSharedSpace: 0,
      timelineHistoryYears: 5,
      maxTaskImages: 5,
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
    label: 'Duo',
    limits: {
      maxSpaces: 10,
      maxSharedSpaces: 3,
      maxMembersPerSharedSpace: 5,
      timelineHistoryYears: -1,
      maxTaskImages: 5,
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
    label: 'Group',
    limits: {
      maxSpaces: -1,
      maxSharedSpaces: -1,
      maxMembersPerSharedSpace: -1,
      timelineHistoryYears: -1,
      maxTaskImages: 5,
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

export const PLAN_DISPLAY_NAMES: Record<PlanId, string> = {
  free:     'Free',
  personal: 'Personal',
  couple:   'Duo',
  family:   'Group',
}

export function getPlanDisplayName(plan: PlanId): string {
  return PLAN_DISPLAY_NAMES[plan]
}

/** Returns the lowest-tier plan that unlocks this feature. */
export function getRequiredPlanForFeature(feature: Feature): PlanId {
  const order: PlanId[] = ['personal', 'couple', 'family']
  for (const planId of order) {
    if (PLANS[planId].features[feature]) return planId
  }
  return 'family'
}

/** Returns the lowest-tier plan that supports currentCount+1 items for limitKey. */
export function getRequiredPlanForLimit(limitKey: keyof PlanLimits, currentCount: number): PlanId {
  const order: PlanId[] = ['personal', 'couple', 'family']
  for (const planId of order) {
    const limit = PLANS[planId].limits[limitKey]
    if (limit === -1 || limit > currentCount) return planId
  }
  return 'family'
}

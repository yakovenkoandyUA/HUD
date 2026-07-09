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
  maxTaskImages: number              // images per quest/shopping item
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
    label: 'Personal Starter',
    limits: {
      maxSpaces: 2,
      maxSharedSpaces: 0,
      maxMembersPerSharedSpace: 0,
      timelineHistoryYears: 1,
      maxTaskImages: 1,
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
    label: 'Personal Memory',
    limits: {
      maxSpaces: 5,
      maxSharedSpaces: 0,
      maxMembersPerSharedSpace: 0,
      timelineHistoryYears: 5,
      maxTaskImages: 5,
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
    label: 'Shared Life',
    limits: {
      maxSpaces: 10,
      maxSharedSpaces: 3,
      maxMembersPerSharedSpace: 5,
      timelineHistoryYears: -1,
      maxTaskImages: 5,
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
    label: 'Family Chronicle',
    limits: {
      maxSpaces: -1,
      maxSharedSpaces: -1,
      maxMembersPerSharedSpace: -1,
      timelineHistoryYears: -1,
      maxTaskImages: 5,
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

export const PLAN_DISPLAY_NAMES: Record<PlanId, string> = {
  free:     'Personal Starter',
  personal: 'Personal Memory',
  couple:   'Shared Life',
  family:   'Family Chronicle',
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

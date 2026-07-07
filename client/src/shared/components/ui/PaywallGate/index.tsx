import React from 'react'
import { useCanUseFeature } from '@/shared/hooks/usePlan'
import UpgradePrompt from '../UpgradePrompt'
import type { Feature } from '@/shared/config/plans'

interface Props {
  feature: Feature
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * PaywallGate
 * -----------
 * Renders children if the current user's plan allows the feature.
 * Otherwise renders fallback (or a default UpgradePrompt card).
 *
 * Security note: this is UX-only. Backend enforces the actual gate.
 *
 * @prop {Feature} feature — feature key from plans config
 * @prop {React.ReactNode} [fallback] — custom fallback; defaults to UpgradePrompt
 * @prop {React.ReactNode} children — content to gate
 */
const PaywallGate: React.FC<Props> = ({ feature, fallback, children }) => {
  const canUse = useCanUseFeature(feature)
  if (canUse) return <>{children}</>
  return fallback ? <>{fallback}</> : <UpgradePrompt feature={feature} />
}

export default PaywallGate

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { type Feature, type PlanLimits, getRequiredPlanForFeature, getRequiredPlanForLimit, getPlanDisplayName } from '@/shared/config/plans'
import styles from './UpgradePrompt.module.css'

const FEATURE_LABELS: Partial<Record<Feature, string>> = {
  aiChat:          'AI-асистент MIMIR',
  aiChefChat:      'AI шеф-асистент',
  receiptScanner:  'Сканер чеків',
  yearbookGenerate:'Підсумки року',
  monobank:        'Monobank синхронізація',
  gdprExport:      'Експорт даних',
  advancedFinance: 'AI аналіз фінансів',
  sharedSpaces:    'Спільні простори',
}

interface Props {
  feature?: Feature
  limitKey?: keyof PlanLimits
  currentCount?: number
  message?: string
  compact?: boolean
}

/**
 * UpgradePrompt
 * -------------
 * Frosted-glass картка що показується коли фіча або ліміт недоступні на поточному плані.
 * CTA веде на /profile?tab=plan де Paddle checkout буде підключено пізніше.
 *
 * @prop {Feature} [feature] — фіча яка потребує апгрейду
 * @prop {keyof PlanLimits} [limitKey] — ліміт що досягнуто
 * @prop {number} [currentCount] — поточна кількість (для limitKey)
 * @prop {string} [message] — кастомний опис замість автоматичного
 * @prop {boolean} [compact] — компактний варіант без заголовку та опису
 */
const UpgradePrompt: React.FC<Props> = ({ feature, limitKey, currentCount = 0, message, compact = false }) => {
  const navigate = useNavigate()

  const requiredPlan = feature
    ? getRequiredPlanForFeature(feature)
    : limitKey
      ? getRequiredPlanForLimit(limitKey, currentCount)
      : 'personal'

  const planLabel = getPlanDisplayName(requiredPlan)
  const featureLabel = feature ? (FEATURE_LABELS[feature] ?? feature) : null

  const handleUpgrade = () => navigate('/profile?tab=plan')

  if (compact) {
    return (
      <button type="button" className={styles.compactBtn} onClick={handleUpgrade}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={styles.lockIcon} aria-hidden="true">
          <rect x="2" y="5.5" width="8" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M4 5.5V3.5a2 2 0 0 1 4 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        {planLabel}
      </button>
    )
  }

  return (
    <div className={styles.card}>
      <div className={styles.iconRow}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={styles.lockSvg} aria-hidden="true">
          <rect x="3" y="9" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        {featureLabel && <span className={styles.featureLabel}>{featureLabel}</span>}
      </div>
      {message ? (
        <p className={styles.desc}>{message}</p>
      ) : (
        <p className={styles.desc}>
          Доступно починаючи з плану <span className={styles.planAccent}>{planLabel}</span>
        </p>
      )}
      <button type="button" className={styles.cta} onClick={handleUpgrade}>
        Переглянути плани
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M4.5 2.5L9 6l-4.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}

export default UpgradePrompt

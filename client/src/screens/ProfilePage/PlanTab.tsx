import React, { useState } from 'react'
import { usePlan } from '../../hooks/usePlan'
import type { PlanId } from '../../config/plans'
import styles from './PlanTab.module.css'

type BillingCycle = 'monthly' | 'annual'

interface PlanFeature {
  label: string
  free:     string | boolean
  personal: string | boolean
  couple:   string | boolean
  family:   string | boolean
}

const FEATURES: PlanFeature[] = [
  { label: 'Квести, звички, покупки',    free: true,          personal: true,          couple: true,              family: true },
  { label: 'Простори',                    free: '2',           personal: '5',           couple: '10',              family: 'Безліміт' },
  { label: 'Хроніка (роки назад)',        free: '1 рік',       personal: '5 років',     couple: 'Безліміт',        family: 'Безліміт' },
  { label: 'AI чат-асистент',             free: false,         personal: true,          couple: true,              family: true },
  { label: 'AI шеф-кухар',               free: false,         personal: true,          couple: true,              family: true },
  { label: 'Сканер чеків (AI)',           free: false,         personal: true,          couple: true,              family: true },
  { label: 'AI фінансовий звіт',          free: false,         personal: true,          couple: true,              family: true },
  { label: 'Щорічний підсумок',           free: false,         personal: true,          couple: true,              family: true },
  { label: 'Monobank інтеграція',         free: false,         personal: true,          couple: true,              family: true },
  { label: 'Export даних (JSON)',          free: false,         personal: true,          couple: true,              family: true },
  { label: "Сімейні зв'язки",             free: false,         personal: false,         couple: true,              family: true },
  { label: 'Спільні простори',            free: false,         personal: false,         couple: '3 (до 5 учасн.)', family: 'Безліміт' },
]

interface PlanDef {
  id: PlanId
  name: string
  tagline: string
  priceMonthly: number
  priceAnnual: number
  currency: string
  accentClass: string
  ctaLabel: string
  badge?: string
}

const PLAN_DEFS: PlanDef[] = [
  {
    id: 'free',
    name: 'STARTER',
    tagline: 'Почати з MIMIR',
    priceMonthly: 0,
    priceAnnual: 0,
    currency: '₴',
    accentClass: styles.cardFree,
    ctaLabel: 'Поточний план',
  },
  {
    id: 'personal',
    name: 'PERSONAL',
    tagline: 'Особиста пам\'ять',
    priceMonthly: 149,
    priceAnnual: 99,
    currency: '₴',
    accentClass: styles.cardPersonal,
    ctaLabel: 'Перейти на Personal',
    badge: 'ПОПУЛЯРНИЙ',
  },
  {
    id: 'couple',
    name: 'COUPLE',
    tagline: 'Спільне життя',
    priceMonthly: 249,
    priceAnnual: 179,
    currency: '₴',
    accentClass: styles.cardCouple,
    ctaLabel: 'Перейти на Couple',
  },
  {
    id: 'family',
    name: 'FAMILY',
    tagline: 'Сімейний архів',
    priceMonthly: 399,
    priceAnnual: 279,
    currency: '₴',
    accentClass: styles.cardFamily,
    ctaLabel: 'Перейти на Family',
  },
]

function FeatureValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.checkIcon}>
        <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }
  if (value === false) {
    return <span className={styles.dashIcon}>—</span>
  }
  return <span className={styles.featureVal}>{value}</span>
}

/**
 * PlanTab
 * -------
 * Вкладка "План" у ProfilePage — відображає 4 тарифних плани MIMIR,
 * поточний план користувача з profileStore, і таблицю порівняння функцій.
 */
const PlanTab: React.FC = () => {
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const [expanded, setExpanded] = useState(false)
  const { plan: currentPlan } = usePlan()

  const visibleFeatures = expanded ? FEATURES : FEATURES.slice(0, 7)

  return (
    <div className={styles.root}>

      {/* ── Early Bird banner ── */}
      <div className={styles.earlyBird}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={styles.earlyBirdIcon}>
          <path d="M7 1L8.5 5H13L9.5 7.5L10.5 12L7 9.5L3.5 12L4.5 7.5L1 5H5.5L7 1Z" fill="currentColor"/>
        </svg>
        <span>РАННІЙ ДОСТУП — знижка 33% на перший рік для перших користувачів</span>
      </div>

      {/* ── Billing toggle ── */}
      <div className={styles.cycleRow}>
        <button
          type="button"
          className={`${styles.cycleBtn} ${cycle === 'monthly' ? styles.cycleBtnActive : ''}`}
          onClick={() => setCycle('monthly')}
        >
          Місячно
        </button>
        <button
          type="button"
          className={`${styles.cycleBtn} ${cycle === 'annual' ? styles.cycleBtnActive : ''}`}
          onClick={() => setCycle('annual')}
        >
          Річно
          <span className={styles.cycleSaveBadge}>−33%</span>
        </button>
      </div>

      {/* ── Plan cards ── */}
      <div className={styles.cards}>
        {PLAN_DEFS.map(plan => {
          const isCurrent = plan.id === currentPlan
          const price = cycle === 'annual' ? plan.priceAnnual : plan.priceMonthly
          return (
            <div
              key={plan.id}
              className={`${styles.card} ${plan.accentClass} ${isCurrent ? styles.cardCurrent : ''}`}
            >
              {plan.badge && (
                <span className={styles.planBadge}>{plan.badge}</span>
              )}
              {isCurrent && (
                <span className={styles.currentBadge}>ПОТОЧНИЙ</span>
              )}

              <div className={styles.cardTop}>
                <div>
                  <h3 className={styles.planName}>{plan.name}</h3>
                  <p className={styles.planTagline}>{plan.tagline}</p>
                </div>
                <div className={styles.priceBlock}>
                  {price === 0 ? (
                    <span className={styles.priceFree}>Безкоштовно</span>
                  ) : (
                    <>
                      <span className={styles.priceAmount}>{price}</span>
                      <span className={styles.priceCurrency}>{plan.currency}</span>
                      <span className={styles.pricePer}>/міс</span>
                    </>
                  )}
                  {cycle === 'annual' && price > 0 && (
                    <p className={styles.priceAnnualNote}>при оплаті за рік</p>
                  )}
                </div>
              </div>

              <button
                type="button"
                className={`${styles.cta} ${isCurrent ? styles.ctaCurrent : styles.ctaUpgrade}`}
                disabled={isCurrent}
                onClick={() => {
                  if (!isCurrent) alert('Білінг буде доступний найближчим часом. Слідкуйте за оновленнями!')
                }}
              >
                {isCurrent ? 'Поточний план' : plan.ctaLabel}
                {!isCurrent && (
                  <span className={styles.ctaSoon}>НЕЗАБАРОМ</span>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* ── Feature comparison table ── */}
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span className={styles.tableFeatureCol} />
          {PLAN_DEFS.map(p => (
            <span key={p.id} className={`${styles.tableColLabel} ${p.id === currentPlan ? styles.tableColLabelActive : ''}`}>
              {p.name}
            </span>
          ))}
        </div>

        {visibleFeatures.map((f, i) => (
          <div key={i} className={styles.tableRow}>
            <span className={styles.tableFeature}>{f.label}</span>
            <span className={`${styles.tableCell} ${styles.tableCellFree}`}>
              <FeatureValue value={f.free} />
            </span>
            <span className={`${styles.tableCell} ${styles.tableCellPersonal}`}>
              <FeatureValue value={f.personal} />
            </span>
            <span className={`${styles.tableCell} ${styles.tableCellCouple}`}>
              <FeatureValue value={f.couple} />
            </span>
            <span className={`${styles.tableCell} ${styles.tableCellFamily}`}>
              <FeatureValue value={f.family} />
            </span>
          </div>
        ))}

        <button
          type="button"
          className={styles.expandBtn}
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? 'Згорнути' : `Показати всі ${FEATURES.length} функції`}
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* ── Footer note ── */}
      <p className={styles.footerNote}>
        Платежі будуть оброблятись через Paddle. Скасування підписки — в будь-який момент.
      </p>
    </div>
  )
}

export default PlanTab

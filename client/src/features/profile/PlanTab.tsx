import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePlan } from '@/shared/hooks/usePlan'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { useUiStore } from '@/shared/store/uiStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { usePlanGroupStore } from './store/planGroupStore'
import type { PlanId } from '@/shared/config/plans'
import styles from './PlanTab.module.css'

const MONOBANK_JAR  = 'https://send.monobank.ua/jar/5kPnR95Ve3'
const CARD_NUMBER   = '4874 0700 1132 4330'

type BillingCycle = 'monthly' | 'annual'

interface PlanFeature {
  label:    string
  free:     string | boolean
  personal: string | boolean
  couple:   string | boolean
  family:   string | boolean
}

const FEATURES: PlanFeature[] = [
  { label: 'Квести, звички, покупки',    free: true,      personal: true,        couple: true,           family: true        },
  { label: 'Мімір AI (живий асистент)',  free: false,     personal: true,        couple: true,           family: true        },
  { label: 'Простори життя',             free: '2',       personal: '5',         couple: '10',           family: 'Безліміт'  },
  { label: 'Глибина пам\'яті',           free: '1 рік',   personal: '5 років',   couple: 'Безліміт',     family: 'Безліміт'  },
  { label: 'AI шеф-кухар',              free: false,     personal: true,        couple: true,           family: true        },
  { label: 'Сканер чеків (AI)',          free: '5 / міс', personal: true,        couple: true,           family: true        },
  { label: 'AI фінансовий звіт',        free: '1 / міс', personal: true,        couple: true,           family: true        },
  { label: 'Yearbook / щорічна хроніка', free: false,    personal: true,        couple: true,           family: true        },
  { label: 'Monobank інтеграція',        free: true,      personal: true,        couple: true,           family: true        },
  { label: 'Архів і експорт даних',     free: false,     personal: true,        couple: true,           family: true        },
  { label: 'Близькі (родина/друзі)',     free: 'до 2',    personal: 'до 2',      couple: 'Безліміт',     family: 'Безліміт'  },
  { label: 'Спільні простори',           free: 'до 3 спільних', personal: false, couple: 'до 5 спільних', family: 'Безліміт' },
]

const HIGHLIGHTS: Record<PlanId, string[]> = {
  free:     ['2 простори', '1 рік пам\'яті', 'Сканер чеків 5/міс', 'Monobank'],
  personal: ['5 просторів', 'Мімір AI чат', 'Сканер чеків', 'Yearbook та архів'],
  couple:   ['Усе з PERSONAL', 'Спільна хроніка', 'До 5 учасників', 'Спільні профілі'],
  family:   ['Усе з DUO', 'Безлімітні простори', 'Безлімітні учасники', 'Спільний архів'],
}

interface PlanDef {
  id:              PlanId
  name:            string
  concept:         string
  priceMonthly:    number
  priceAnnual:     number
  priceAnnualTotal: number
}

const PAID_PLANS: PlanDef[] = [
  { id: 'personal', name: 'PERSONAL', concept: 'Solo + AI',      priceMonthly: 199, priceAnnual: 133, priceAnnualTotal: 1596 },
  { id: 'couple',   name: 'DUO',      concept: 'Share with one', priceMonthly: 299, priceAnnual: 199, priceAnnualTotal: 2388 },
  { id: 'family',   name: 'GROUP',    concept: 'Share with all', priceMonthly: 449, priceAnnual: 299, priceAnnualTotal: 3588 },
]

const ALL_PLAN_IDS: PlanId[] = ['free', 'personal', 'couple', 'family']

function SmallCheck() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true" className={styles.highlightCheck}>
      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const PLAN_ICONS: Record<string, React.FC<{ className?: string }>> = {
  personal: ({ className }) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="7" r="3.2" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M3.5 17.5c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  couple: ({ className }) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="7.5" cy="7" r="2.8" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M1.5 17c0-3.3 2.7-6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="13.5" cy="6.5" r="2.8" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M13.5 11c3.3 0 6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  family: ({ className }) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 16.5c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="3.5" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M1 16.5c0-2 1.3-3.7 3-4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="16.5" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M19 16.5c0-2-1.3-3.7-3-4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
}

function FeatureValue({ value }: { value: string | boolean }) {
  if (value === true)  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className={styles.checkIcon}><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  if (value === false) return <span className={styles.dashIcon}>—</span>
  return <span className={styles.featureVal}>{value}</span>
}

/**
 * PlanTab
 * -------
 * Вкладка "Plan" у ProfilePage.
 * Показує 4 тарифи MIMIR, ключові переваги кожного, таблицю порівняння
 * і bottom sheet для підтримки проекту через Monobank.
 */
const PlanTab: React.FC = () => {
  const [cycle, setCycle]           = useState<BillingCycle>('monthly')
  const [expanded, setExpanded]     = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [copied, setCopied]         = useState(false)

  const { plan: currentPlan, planSource, planPayerName } = usePlan()
  const { showToast }         = useUiStore()
  const refreshProfile        = useProfileStore(s => s.refreshProfile)

  const {
    role: groupRole, seatsLimit, seatsUsed, members, pendingInvites, receivedInvites,
    fetchPlanGroup, invite, cancelInvite, removeMember, leaveGroup, acceptInvite, declineInvite,
  } = usePlanGroupStore()

  const [inviteQuery, setInviteQuery]   = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!cancelled) await fetchPlanGroup()
    }
    load()
    return () => { cancelled = true }
  }, [fetchPlanGroup, currentPlan])

  const overlayRef = useRef<HTMLDivElement>(null)
  const sheetRef   = useSwipeToDismiss(() => setSupportOpen(false), { enabled: supportOpen, overlayRef })

  const handleInvite = async () => {
    if (!inviteQuery.trim()) return
    setInviteLoading(true)
    try {
      await invite(inviteQuery.trim())
      setInviteQuery('')
      showToast('Запрошення надіслано', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Помилка', 'error')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      await acceptInvite(inviteId)
      await refreshProfile()
      showToast('Ви приєднались до плану', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Помилка', 'error')
    }
  }

  const handleLeaveGroup = async () => {
    await leaveGroup()
    await refreshProfile()
    showToast('Ви покинули групу', 'success')
  }

  const visibleFeatures = expanded ? FEATURES : FEATURES.slice(0, 7)

  const handleUpgrade = (plan: PlanDef) => {
    const total = cycle === 'annual' ? plan.priceAnnualTotal : plan.priceMonthly
    window.open(`${MONOBANK_JAR}?amount=${total}`, '_blank', 'noopener,noreferrer')
  }

  const handleCopyCard = async () => {
    try {
      await navigator.clipboard.writeText(CARD_NUMBER.replace(/\s/g, ''))
      setCopied(true)
      showToast('Номер картки скопійовано', 'success')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      showToast('Не вдалося скопіювати', 'error')
    }
  }

  return (
    <div className={styles.root}>

      {/* ── Promo strip ── */}
      <div className={styles.promoStrip}>
        <svg width="11" height="11" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true" className={styles.promoStar}>
          <path d="M7 1L8.5 5H13L9.5 7.5L10.5 12L7 9.5L3.5 12L4.5 7.5L1 5H5.5L7 1Z"/>
        </svg>
        <span>Ранній доступ — знижка <strong>33%</strong> на перший рік для перших користувачів</span>
      </div>

      {/* ── Group membership banner ── */}
      {planSource === 'group' && (
        <div className={styles.groupBanner}>
          <div className={styles.groupBannerInfo}>
            <span className={styles.groupBannerTitle}>Ви на плані {currentPlan === 'couple' ? 'DUO' : 'GROUP'}</span>
            <span className={styles.groupBannerSub}>завдяки {planPayerName ?? 'учаснику групи'}</span>
          </div>
          <button type="button" className={styles.groupLeaveBtn} onClick={handleLeaveGroup}>
            Покинути групу
          </button>
        </div>
      )}

      {/* ── Received plan-group invites ── */}
      {receivedInvites.length > 0 && (
        <div className={styles.groupInvitesWrap}>
          {receivedInvites.map(inv => (
            <div key={inv.inviteId} className={styles.groupMemberRow}>
              <div className={styles.groupAvatar}>
                {inv.avatarUrl ? <img src={inv.avatarUrl} alt={inv.name} className={styles.groupAvatarImg} /> : <span>{inv.name[0]}</span>}
              </div>
              <div className={styles.groupMemberInfo}>
                <span className={styles.groupMemberName}>{inv.name}</span>
                <span className={styles.groupMemberSub}>запрошує на тариф</span>
              </div>
              <div className={styles.groupInviteBtns}>
                <button type="button" className={styles.groupAcceptBtn} onClick={() => handleAcceptInvite(inv.inviteId)}>Прийняти</button>
                <button type="button" className={styles.groupDeclineBtn} onClick={() => declineInvite(inv.inviteId)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* ── Support button ── */}
      <button type="button" className={styles.supportBtn} onClick={() => setSupportOpen(true)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        Підтримати проект
      </button>

      {/* ── FREE — compact ── */}
      <div className={`${styles.card} ${styles.cardFree} ${currentPlan === 'free' ? styles.cardCurrentFree : ''}`}>
        {currentPlan === 'free' && (
          <div className={styles.badgeRow}>
            <span className={`${styles.badge} ${styles.badgeCurrentFree}`}>ПОТОЧНИЙ</span>
          </div>
        )}
        <div className={styles.freeHeader}>
          <div>
            <span className={styles.planName}>FREE</span>
            <span className={styles.planConcept}>Starter</span>
          </div>
          <span className={styles.freePrice}>Безкоштовно</span>
        </div>
        <ul className={styles.highlights}>
          {HIGHLIGHTS.free.map(h => (
            <li key={h} className={styles.highlightItem}>
              <SmallCheck />{h}
            </li>
          ))}
        </ul>
        {currentPlan === 'free' ? (
          <div className={styles.currentStatus}>
            <span className={styles.currentDot} aria-hidden="true" />
            Поточний план
          </div>
        ) : (
          <div className={styles.ctaStay}>Залишитися на FREE</div>
        )}
      </div>

      {/* ── Paid plans ── */}
      {PAID_PLANS.map(plan => {
        const isCurrent  = plan.id === currentPlan
        const isPopular  = plan.id === 'personal'
        const price      = cycle === 'annual' ? plan.priceAnnual : plan.priceMonthly
        const cardMod    = plan.id === 'personal' ? styles.cardPersonal
                         : plan.id === 'couple'   ? styles.cardCouple
                         : styles.cardFamily

        return (
          <div
            key={plan.id}
            className={`${styles.card} ${cardMod} ${isCurrent ? styles.cardCurrent : ''} ${isPopular && !isCurrent ? styles.cardPopular : ''}`}
          >
            {/* Badge row */}
            {(isPopular || isCurrent) && (
              <div className={styles.badgeRow}>
                {isPopular && <span className={`${styles.badge} ${styles.badgePopular}`}>ПОПУЛЯРНИЙ</span>}
                {isCurrent && <span className={`${styles.badge} ${styles.badgeCurrent}`}>ПОТОЧНИЙ</span>}
              </div>
            )}

            {/* Header */}
            <div className={styles.cardHeader}>
              <div className={styles.cardMeta}>
                <div className={styles.planNameRow}>
                  {PLAN_ICONS[plan.id] && React.createElement(PLAN_ICONS[plan.id], { className: styles.planIcon })}
                  <span className={styles.planName}>{plan.name}</span>
                </div>
                <span className={styles.planConcept}>{plan.concept}</span>
              </div>
              <div className={styles.priceBlock}>
                <div className={styles.priceMain}>
                  <span className={styles.priceAmount}>{price}</span>
                  <span className={styles.priceSuffix}>₴&thinsp;/ міс</span>
                </div>
                {cycle === 'annual' && (
                  <span className={styles.priceAnnualNote}>{plan.priceAnnualTotal} ₴ / рік</span>
                )}
              </div>
            </div>

            {/* Key features */}
            <ul className={styles.highlights}>
              {HIGHLIGHTS[plan.id].map(h => (
                <li key={h} className={styles.highlightItem}>
                  <SmallCheck />{h}
                </li>
              ))}
            </ul>

            {/* CTA */}
            {isCurrent ? (
              <>
                <div className={styles.currentStatus}>
                  <span className={styles.currentDot} aria-hidden="true" />
                  Поточний план
                </div>
                <button type="button" className={styles.ctaManage} onClick={() => handleUpgrade(plan)}>
                  Керувати підпискою
                </button>
              </>
            ) : (
              <button type="button" className={styles.ctaUpgrade} onClick={() => handleUpgrade(plan)}>
                Обрати {plan.name}
              </button>
            )}
          </div>
        )
      })}

      {/* ── Group members management (payer only) ── */}
      {groupRole === 'payer' && (
        <div className={styles.groupManage}>
          <div className={styles.groupManageHeader}>
            <span className={styles.groupManageTitle}>УЧАСНИКИ ПЛАНУ</span>
            <span className={styles.groupSeats}>{seatsUsed ?? 1}/{seatsLimit ?? 1}</span>
          </div>

          {members.map(m => (
            <div key={m.id} className={styles.groupMemberRow}>
              <div className={styles.groupAvatar}>
                {m.avatarUrl ? <img src={m.avatarUrl} alt={m.name} className={styles.groupAvatarImg} /> : <span>{m.name[0]}</span>}
              </div>
              <div className={styles.groupMemberInfo}>
                <span className={styles.groupMemberName}>{m.name}</span>
                <span className={styles.groupMemberSub}>@{m.username}</span>
              </div>
              <button type="button" className={styles.groupRemoveBtn} onClick={() => removeMember(m.id)}>
                <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
          ))}

          {pendingInvites.map(inv => (
            <div key={inv.inviteId} className={styles.groupMemberRow}>
              <div className={styles.groupAvatar}>
                {inv.avatarUrl ? <img src={inv.avatarUrl} alt={inv.name} className={styles.groupAvatarImg} /> : <span>{inv.name[0]}</span>}
              </div>
              <div className={styles.groupMemberInfo}>
                <span className={styles.groupMemberName}>{inv.name}</span>
                <span className={styles.groupMemberSub}>Очікує підтвердження</span>
              </div>
              <button type="button" className={styles.groupRemoveBtn} onClick={() => cancelInvite(inv.inviteId)}>
                <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
          ))}

          {(seatsUsed ?? 1) < (seatsLimit ?? 1) && (
            <div className={styles.groupInviteRow}>
              <input
                className={styles.groupInviteInput}
                type="text"
                placeholder="Логін або email"
                value={inviteQuery}
                onChange={e => setInviteQuery(e.target.value)}
              />
              <button type="button" className={styles.groupInviteBtn} onClick={handleInvite} disabled={inviteLoading || !inviteQuery.trim()}>
                Запросити
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Feature comparison ── */}
      <div className={styles.tableScroll}>
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span />
          {ALL_PLAN_IDS.map(id => (
            <span key={id} className={`${styles.tableColLabel} ${id === currentPlan ? styles.tableColLabelActive : ''}`}>
              {id === 'free' ? 'FREE' : id === 'personal' ? 'PERS' : id === 'couple' ? 'DUO' : 'GROUP'}
            </span>
          ))}
        </div>

        {visibleFeatures.map((f, i) => (
          <div key={i} className={styles.tableRow}>
            <span className={styles.tableFeature}>{f.label}</span>
            <span className={styles.tableCell}><FeatureValue value={f.free} /></span>
            <span className={styles.tableCell}><FeatureValue value={f.personal} /></span>
            <span className={styles.tableCell}><FeatureValue value={f.couple} /></span>
            <span className={styles.tableCell}><FeatureValue value={f.family} /></span>
          </div>
        ))}

        <button type="button" className={styles.expandBtn} onClick={() => setExpanded(e => !e)}>
          {expanded ? 'Згорнути' : `Показати всі ${FEATURES.length} функції`}
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      </div>

      <p className={styles.footerNote}>
        Оплата через Monobank — після підтвердження платежу план активується вручну.
      </p>

      {/* ── Support bottom sheet ── */}
      {supportOpen && createPortal(
        <div className={styles.overlay} ref={overlayRef} onClick={() => setSupportOpen(false)}>
          <div className={styles.sheet} ref={sheetRef} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />

            <div className={styles.supportHero}>
              <div className={styles.supportIconWrap}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
              <h3 className={styles.supportTitle}>Підтримайте проект</h3>
              <p className={styles.supportDesc}>
                MIMIR — незалежний проект. Ваші донати допомагають оплачувати сервери та розвивати систему.
              </p>
            </div>

            <button
              type="button"
              className={styles.monoBtn}
              onClick={() => window.open(MONOBANK_JAR, '_blank', 'noopener,noreferrer')}
            >
              <div className={styles.monoBtnInfo}>
                <span className={styles.monoBtnName}>Банка Monobank</span>
                <span className={styles.monoBtnSub}>Швидкий донат в 1 клік</span>
              </div>
              <div className={styles.monoBtnIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15"/>
                  <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8.5 14.5h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            </button>

            <div className={styles.cardSection}>
              <span className={styles.cardSectionLabel}>АБО ЗА РЕКВІЗИТАМИ КАРТКИ:</span>
              <button type="button" className={styles.cardRow} onClick={handleCopyCard}>
                <div>
                  <span className={styles.cardNumber}>{CARD_NUMBER}</span>
                  <span className={styles.cardMeta}>Гривня, Monobank</span>
                </div>
                {copied ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--positive)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default PlanTab

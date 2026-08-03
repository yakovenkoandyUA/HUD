import React, { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore, type MimirMode } from '@/shared/store/uiStore'
import { SPACE_TYPE_CONFIG } from '@/features/spaces/data/spaceTypes'
import type { SpaceType } from '@/features/memories/store/spacesStore'
import { authFetch } from '@/shared/services/api'
import { usePwaInstall } from '@/shared/hooks/usePwaInstall'
import ImageUploadButton from '@/shared/components/ui/ImageUploadButton'
import styles from './Onboarding.module.css'

const DIRECTION_ROUTES: Record<Direction, string> = {
  spaces:   '/spaces',
  memories: '/memories',
  tasks:    '/sprint',
  finance:  '/finance',
}

const MONTHS_UA = [
  'Січень','Лютий','Березень','Квітень','Травень','Червень',
  'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень',
]

type Direction = 'spaces' | 'memories' | 'tasks' | 'finance'

const DIRECTIONS: { id: Direction; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: 'spaces', label: 'Простори', desc: 'Авто, рослини, улюбленець, поїздки',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    id: 'memories', label: 'Спогади', desc: 'Фото, поїздки і важливі моменти',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  },
  {
    id: 'tasks', label: 'Задачі й звички', desc: 'Рутини, цілі і щоденні справи',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  },
  {
    id: 'finance', label: 'Фінанси', desc: 'Бюджет, витрати і накопичення',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>,
  },
]

const SPACE_PRESETS: { type: SpaceType; label: string; desc: string }[] = [
  { type: 'plant',   label: 'Рослина',    desc: 'Полив, добрива, ідентифікація' },
  { type: 'pet',     label: 'Вихованець', desc: 'Ветеринар, щеплення, догляд' },
  { type: 'vehicle', label: 'Авто',       desc: 'ТО, заправки, документи' },
  { type: 'trip',    label: 'Подорож',    desc: 'Маршрут, місця, витрати' },
  { type: 'sports',  label: 'Спорт',      desc: 'Результати й прогрес' },
]

const HABIT_PRESETS = ['Спорт', 'Читання', 'Медитація', 'Вода', 'Йога', 'Прогулянка', 'Сон']

const MIMIR_MODES: { id: MimirMode; title: string; sub: string; desc: string; quote: string; icon: React.ReactNode }[] = [
  {
    id: 'wise', title: 'МУДРИЙ', sub: 'WISE', desc: 'Спокійний і точний',
    quote: '«Найкращий шлях — через знання.»',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 6v2M12 16v2M6 12H4M20 12h-2"/></svg>,
  },
  {
    id: 'witty', title: 'БАЛАГУР', sub: 'WITTY', desc: 'Іронічний, але на твоєму боці',
    quote: '«Ти це ще не зробив? Цікаво.»',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  },
  {
    id: 'dark', title: 'ТЕМНИЙ', sub: 'DARK', desc: 'Без прикрас і зайвих сентиментів',
    quote: '«Правда не завжди зручна.»',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  },
]

/** Directions that skip the space-creation step */
const DIRECTIONS_WITHOUT_SPACE: Direction[] = ['finance', 'memories']

interface SalaryDayPickerProps {
  value: number
  onChange: (day: number) => void
}

/** Компактний тригер + Modal-календар для вибору дня місяця */
const SalaryDayPicker: React.FC<SalaryDayPickerProps> = ({ value, onChange }) => {
  const [open, setOpen]           = useState(false)
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())
  const [viewYear, setViewYear]   = useState(() => new Date().getFullYear())

  const daysInMonth = useMemo(
    () => new Date(viewYear, viewMonth + 1, 0).getDate(),
    [viewYear, viewMonth],
  )
  const firstDow = useMemo(() => {
    const d = new Date(viewYear, viewMonth, 1).getDay()
    return d === 0 ? 6 : d - 1
  }, [viewYear, viewMonth])

  const todayDate  = new Date().getDate()
  const todayMonth = new Date().getMonth()
  const todayYear  = new Date().getFullYear()

  const goToPrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const goToNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const ArrowLeft  = () => <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true"><path d="M8 1L2 8l6 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  const ArrowRight = () => <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true"><path d="M2 1l6 7-6 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  const ChevronRight = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>

  return (
    <>
      <button type="button" className={styles.dayTrigger} onClick={() => setOpen(true)}>
        <span className={styles.dayTriggerNum}>{value}</span>
        <span className={styles.dayTriggerLabel}>
          <span className={styles.dayTriggerTitle}>числа місяця</span>
          <span className={styles.dayTriggerSub}>торкніться щоб змінити</span>
        </span>
        <span className={styles.dayTriggerChevron}><ChevronRight /></span>
      </button>

      {open && createPortal(
        <div className={styles.calSheet}>
          <div className={styles.calSheetOverlay} onClick={() => setOpen(false)} />
          <div className={styles.calSheetBody}>
            <div className={styles.calSheetHandle} />
            <div className={styles.calSheetTitle}>День зарплати</div>
            <div className={styles.calNavRow}>
              <button type="button" className={styles.calNavBtn} onClick={goToPrev} aria-label="Попередній місяць"><ArrowLeft /></button>
              <span className={styles.calMonthLabel}>{MONTHS_UA[viewMonth]} {viewYear}</span>
              <button type="button" className={styles.calNavBtn} onClick={goToNext} aria-label="Наступний місяць"><ArrowRight /></button>
            </div>
            <div className={styles.calGrid}>
              {['Пн','Вт','Ср','Чт','Пт','Сб','Нд'].map(d => (
                <span key={d} className={styles.calDow}>{d}</span>
              ))}
              {Array.from({ length: firstDow }, (_, i) => (
                <span key={`e${i}`} className={styles.calEmpty} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const d = i + 1
                const isToday = d === todayDate && viewMonth === todayMonth && viewYear === todayYear
                return (
                  <button
                    key={d}
                    type="button"
                    className={[
                      styles.calDay,
                      value === d ? styles.calDayOn : '',
                      isToday && value !== d ? styles.calDayToday : '',
                    ].join(' ')}
                    onClick={() => { onChange(d); setOpen(false) }}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

/**
 * OnboardingScreen
 * ----------------
 * 6-крокове налаштування при першому вході.
 * Крок 1 — Welcome (fullscreen)
 * Крок 2 — Напрям (з чого почнемо?)
 * Крок 3 — Перший простір (тип → назва, skippable)
 * Крок 4 — Перша дія (залежить від напряму; пропускається якщо spaces + простір створено)
 * Крок 5 — Характер Міміра (WISE / WITTY / DARK)
 * Крок 6 — Готово (summary + CTA)
 */
const OnboardingScreen: React.FC = () => {
  const navigate = useNavigate()
  const { activeProfile, updateProfile } = useProfileStore()
  const { setMimirMode: saveMode } = useUiStore()
  const pwaInstall = usePwaInstall()

  const [step, setStep]   = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 2 — direction
  const [direction, setDirection] = useState<Direction>('tasks')

  // Step 3 — space
  const [spaceType, setSpaceType] = useState<SpaceType | null>(null)
  const [spaceName, setSpaceName] = useState('')

  // Step 4 — first action
  const [habitPreset, setHabitPreset] = useState<string | null>(null)
  const [habitCustom, setHabitCustom] = useState('')
  const [salaryDay, setSalaryDay]     = useState(activeProfile?.salaryDay ?? 1)
  const [monthlyBudget, setMonthlyBudget] = useState('')
  const [memoryPlan, setMemoryPlan]   = useState('')

  // Step 5 — mimir mode
  const [mimirMode, setMimirMode] = useState<MimirMode>('wise')

  // Step 6 — avatar
  const [avatarUrl, setAvatarUrl] = useState(activeProfile?.avatarUrl ?? '')

  const habitTitle = habitPreset ?? (habitCustom.trim() || null)
  const spaceCreated = spaceType !== null && spaceName.trim().length > 0

  const selectPreset = (p: string) => {
    setHabitPreset(prev => prev === p ? null : p)
    setHabitCustom('')
  }

  const skipSpaceStep = DIRECTIONS_WITHOUT_SPACE.includes(direction)

  const goBack = () => {
    if (step === 2) setStep(1)
    else if (step === 3) setStep(2)
    else if (step === 4) setStep(skipSpaceStep ? 2 : 3)
    else if (step === 5) {
      if (spaceCreated && direction === 'spaces') setStep(3)
      else setStep(4)
    }
    else if (step === 6) setStep(5)
  }

  const goNextFromSpace = (skipped: boolean) => {
    if (!skipped && spaceCreated && direction === 'spaces') {
      setStep(5)
    } else {
      setStep(4)
    }
  }

  const handleFinish = () => {
    setSaving(true)
    saveMode(mimirMode)

    // Optimistically mark onboarding done in local store — prevents infinite redirect if PATCH is slow/fails
    const { activeProfile: current } = useProfileStore.getState()
    if (current) {
      useProfileStore.setState({
        activeProfile: { ...current, onboardingCompleted: true, ...(direction === 'finance' ? { salaryDay } : {}) },
      })
    }

    // Fire all network saves as background fire-and-forget
    const patch: Parameters<typeof updateProfile>[0] = { onboardingCompleted: true }
    if (direction === 'finance') patch.salaryDay = salaryDay
    updateProfile(patch).catch(() => {})

    if (spaceCreated && spaceType) {
      const cfg = SPACE_TYPE_CONFIG[spaceType]
      authFetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: spaceName.trim(), type: spaceType, color: cfg?.color ?? '#6C63FF' }),
      }).catch(() => {})
    }

    if (habitTitle) {
      authFetch('/api/sprint/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: habitTitle, type: 'routine', repeat: 'daily', priority: 'normal' }),
      }).catch(() => {})
    }

    if (memoryPlan.trim()) {
      authFetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: memoryPlan.trim(), status: 'want' }),
      }).catch(() => {})
    }

    if (monthlyBudget && !isNaN(+monthlyBudget) && +monthlyBudget > 0) {
      updateProfile({ monthlySpendLimit: +monthlyBudget }).catch(() => {})
    }

    navigate(DIRECTION_ROUTES[direction] ?? '/', { replace: true })
  }

  const ChevronRight = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )

  const progress = useMemo((): { label: string; pct: number } | null => {
    if (step < 2 || step > 5) return null
    if (skipSpaceStep) {
      // 3 effective steps: 2 → 4 → 5
      if (step === 2) return { label: 'Крок 1 / 3', pct: 33 }
      if (step === 4) return { label: 'Крок 2 / 3', pct: 66 }
      if (step === 5) return { label: 'Крок 3 / 3', pct: 100 }
      return null
    }
    // 4 effective steps: 2 → 3 → 4 → 5
    if (step === 2) return { label: 'Крок 1 / 4', pct: 25 }
    if (step === 3) return { label: 'Крок 2 / 4', pct: 50 }
    if (step === 4) return { label: 'Крок 3 / 4', pct: 75 }
    if (step === 5) return { label: 'Крок 4 / 4', pct: 100 }
    return null
  }, [step, skipSpaceStep])

  // Summary items for done step
  const summaryItems = useMemo(() => {
    const items: string[] = []
    if (spaceCreated) items.push(`Простір «${spaceName.trim()}»`)
    if (habitTitle) items.push(`Звичка «${habitTitle}»`)
    if (memoryPlan.trim()) items.push(`План «${memoryPlan.trim()}»`)
    if (monthlyBudget && +monthlyBudget > 0) items.push(`Бюджет ${monthlyBudget} ₴/місяць`)
    const modeLabel = MIMIR_MODES.find(m => m.id === mimirMode)?.title ?? 'Мудрий'
    items.push(`Мімір: ${modeLabel}`)
    return items
  }, [spaceCreated, spaceName, habitTitle, memoryPlan, monthlyBudget, mimirMode])

  // Determine if step 4 action direction is habit-type
  const actionIsHabit = direction === 'tasks' || (direction === 'spaces' && !spaceCreated)

  return (
    <div className={styles.root}>
      <div className={styles.inner}>

        {/* ── Progress bar (steps 2–5) ───────────────────────── */}
        {progress && (
          <div className={styles.progressWrap}>
            <button type="button" className={styles.backBtn} onClick={goBack} aria-label="Назад">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progress.pct}%` }} />
            </div>
            <span className={styles.progressLabel}>{progress.label}</span>
          </div>
        )}

        {/* ── Step 1: Welcome ────────────────────────────────── */}
        {step === 1 && (
          <div className={styles.slideHero}>
            <img
              src="/mimir/mimir-welcome.webp"
              alt="Mimir"
              className={styles.slideHeroImg}
              draggable={false}
            />
            <div className={styles.slideCopy}>
              <h1 className={styles.wordmark}>MIMIR</h1>
              <p className={styles.tagline}>DRINK DEEP</p>
              <p className={styles.slogan}>Thought finds the path. Memory gives it meaning.</p>
              <p className={styles.desc}>
                Особистий простір для пам'яті, фінансів, звичок і всього, що формує твоє життя.
              </p>
            </div>
            <button className={`${styles.primaryBtn} ${styles.primaryBtnFull}`} onClick={() => setStep(2)}>
              РОЗПОЧАТИ <ChevronRight />
            </button>
          </div>
        )}

        {/* ── Step 2: Direction ──────────────────────────────── */}
        {step === 2 && (
          <div className={`${styles.step} ${styles.stepLeft}`}>
            <div className={styles.stepHeaderRow}>
              <img src="/mimir/mimir-pointing.webp" alt="" className={styles.mimirSm} draggable={false} />
              <div className={styles.stepHeaderText}>
                <h2 className={styles.stepTitleSm}>З чого почнемо?</h2>
                <p className={styles.stepSubSm}>Обери напрям — налаштуємо разом.</p>
              </div>
            </div>

            <div className={styles.directionList}>
              {DIRECTIONS.map(d => (
                <button
                  key={d.id}
                  type="button"
                  className={`${styles.directionItem} ${direction === d.id ? styles.directionItemOn : ''}`}
                  onClick={() => setDirection(d.id)}
                  aria-pressed={direction === d.id}
                >
                  <span className={styles.directionItemIcon}>{d.icon}</span>
                  <span className={styles.directionItemText}>
                    <span className={styles.directionLabel}>{d.label}</span>
                    <span className={styles.directionDesc}>{d.desc}</span>
                  </span>
                  <span className={styles.directionCheck} aria-hidden="true">
                    {direction === d.id && (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 8l3.5 3.5L13 4"/>
                      </svg>
                    )}
                  </span>
                </button>
              ))}
            </div>

            <div className={styles.stepFooter}>
              <button
                className={`${styles.primaryBtn} ${styles.primaryBtnWide}`}
                onClick={() => setStep(skipSpaceStep ? 4 : 3)}
              >
                ДАЛІ <ChevronRight />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: First space ────────────────────────────── */}
        {step === 3 && (
          <div className={`${styles.step} ${styles.stepLeft}`}>
            <div className={styles.stepHeaderRow}>
              <img src="/mimir/mimir-pointing.webp" alt="" className={styles.mimirSm} draggable={false} />
              <div className={styles.stepHeaderText}>
                <h2 className={styles.stepTitleSm}>
                  {direction === 'spaces' ? 'Перший простір' : 'Додати простір?'}
                </h2>
                <p className={styles.stepSubSm}>
                  {direction === 'spaces'
                    ? 'Контекст для всього важливого в твоєму житті.'
                    : 'Необов’язково — можна створити пізніше у розділі Простори.'}
                </p>
              </div>
            </div>

            <span className={styles.sectionLabel}>ТИП ПРОСТОРУ</span>
            <div className={styles.spacePresetGrid}>
              {SPACE_PRESETS.map(s => {
                const cfg = SPACE_TYPE_CONFIG[s.type]
                return (
                  <button
                    key={s.type}
                    type="button"
                    className={`${styles.spacePresetChip} ${spaceType === s.type ? styles.spacePresetChipOn : ''}`}
                    onClick={() => {
                      setSpaceType(prev => prev === s.type ? null : s.type)
                      if (!spaceName) setSpaceName(s.label)
                    }}
                    aria-pressed={spaceType === s.type}
                  >
                    <span
                      className={styles.spacePresetDot}
                      style={{ background: cfg?.color ?? 'var(--accent)' }}
                    />
                    <span className={styles.spacePresetLabel}>{s.label}</span>
                    <span className={styles.spacePresetDesc}>{s.desc}</span>
                  </button>
                )
              })}
            </div>

            {spaceType && (
              <div className={styles.section}>
                <span className={styles.sectionLabel}>НАЗВА</span>
                <input
                  className={styles.textInput}
                  type="text"
                  placeholder="Наприклад, Фібі або Моя Tesla…"
                  value={spaceName}
                  onChange={e => setSpaceName(e.target.value)}
                  maxLength={50}
                  autoFocus
                />
              </div>
            )}

            <div className={styles.slideActions} style={{ marginTop: 'auto', paddingTop: 16 }}>
              <button className={styles.slideSkipBtn} onClick={() => {
                setSpaceType(null)
                setSpaceName('')
                goNextFromSpace(true)
              }}>
                Пропустити
              </button>
              <button
                className={`${styles.primaryBtn} ${styles.primaryBtnFlex}`}
                onClick={() => goNextFromSpace(false)}
                disabled={spaceType !== null && !spaceName.trim()}
              >
                ДАЛІ <ChevronRight />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: First action (direction-dependent) ──────── */}
        {step === 4 && (
          <div className={styles.step}>

            {/* Habit step (tasks / overview / spaces-skipped) */}
            {actionIsHabit && (
              <>
                <img
                  src="/mimir/mimir-writing.webp"
                  alt=""
                  className={styles.mimirAvatar}
                  draggable={false}
                />
                <h2 className={styles.stepTitle}>Перша звичка</h2>
                <p className={styles.stepSub}>Обери або напиши свій варіант — одразу з'явиться в щоденнику.</p>

                <div className={styles.presets}>
                  {HABIT_PRESETS.map(p => (
                    <button
                      key={p}
                      type="button"
                      className={`${styles.presetChip} ${habitPreset === p ? styles.presetChipOn : ''}`}
                      onClick={() => selectPreset(p)}
                      aria-pressed={habitPreset === p}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {!habitPreset && (
                  <input
                    className={styles.textInput}
                    type="text"
                    placeholder="або напиши свій варіант…"
                    value={habitCustom}
                    onChange={e => setHabitCustom(e.target.value)}
                    maxLength={60}
                  />
                )}
              </>
            )}

            {/* Finance step */}
            {direction === 'finance' && (
              <>
                <img
                  src="/mimir/mimir-pointing.webp"
                  alt=""
                  className={styles.mimirAvatar}
                  draggable={false}
                />
                <h2 className={styles.stepTitle}>Налаштуємо фінанси</h2>
                <p className={styles.stepSub}>День зарплати і щомісячний бюджет.</p>

                <div className={styles.section} style={{ textAlign: 'left', width: '100%' }}>
                  <span className={styles.sectionLabel}>ДЕНЬ ЗАРПЛАТИ</span>
                  <div className={styles.inputCard}>
                    <SalaryDayPicker value={salaryDay} onChange={setSalaryDay} />
                    <span className={styles.inputCardHint}>Для розрахунку місячного циклу</span>
                  </div>
                </div>

                <div className={styles.section} style={{ textAlign: 'left', width: '100%' }}>
                  <span className={styles.sectionLabel}>МІСЯЧНИЙ БЮДЖЕТ (необов'язково)</span>
                  <input
                    className={styles.textInput}
                    type="number"
                    inputMode="numeric"
                    placeholder="0 ₴"
                    value={monthlyBudget}
                    onChange={e => setMonthlyBudget(e.target.value)}
                    min={0}
                  />
                </div>
              </>
            )}

            {/* Memories step */}
            {direction === 'memories' && (
              <>
                <img
                  src="/mimir/mimir-location.webp"
                  alt=""
                  className={styles.mimirAvatar}
                  draggable={false}
                />
                <h2 className={styles.stepTitle}>Куди хочеш поїхати?</h2>
                <p className={styles.stepSub}>Збережемо як ціль подорожі — повернешся коли буде час.</p>

                <input
                  className={styles.textInput}
                  type="text"
                  placeholder="Наприклад, Барселона або Київ…"
                  value={memoryPlan}
                  onChange={e => setMemoryPlan(e.target.value)}
                  maxLength={80}
                  autoFocus
                />
              </>
            )}

            <div className={styles.slideActions} style={{ marginTop: 'auto' }}>
              <button className={styles.slideSkipBtn} onClick={() => setStep(5)}>
                Пропустити
              </button>
              <button
                className={`${styles.primaryBtn} ${styles.primaryBtnFlex}`}
                onClick={() => setStep(5)}
              >
                ДАЛІ <ChevronRight />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: Mimir character ─────────────────────────── */}
        {step === 5 && (
          <div className={`${styles.step} ${styles.stepLeft}`}>
            <div className={styles.stepHeaderRow}>
              <img src="/mimir/mimir-welcome.webp" alt="" className={styles.mimirSm} draggable={false} />
              <div className={styles.stepHeaderText}>
                <h2 className={styles.stepTitleSm}>Яким Мімір буде поруч?</h2>
                <p className={styles.stepSubSm}>Завжди можна змінити у Профіль → Мімір.</p>
              </div>
            </div>

            <div className={styles.mimirModes}>
              {MIMIR_MODES.map(m => (
                <button
                  key={m.id}
                  type="button"
                  className={`${styles.mimirModeCard} ${mimirMode === m.id ? styles.mimirModeCardOn : ''}`}
                  onClick={() => setMimirMode(m.id)}
                  aria-pressed={mimirMode === m.id}
                >
                  {mimirMode === m.id && (
                    <span className={styles.mimirModeCheck} aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 6l2.5 2.5L10 3"/>
                      </svg>
                    </span>
                  )}
                  <span className={styles.mimirModeIcon} aria-hidden="true">{m.icon}</span>
                  <span className={styles.mimirModeCardTitle}>{m.title}</span>
                  <span className={styles.mimirModeCardSub}>{m.sub}</span>
                  <span className={styles.mimirModeCardDesc}>{m.desc}</span>
                  <span className={styles.mimirModeQuote}>{m.quote}</span>
                </button>
              ))}
            </div>

            <div className={styles.stepFooter}>
              <button
                className={`${styles.primaryBtn} ${styles.primaryBtnWide}`}
                onClick={() => setStep(6)}
              >
                ДАЛІ <ChevronRight />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 6: Done ────────────────────────────────────── */}
        {step === 6 && (
          <div className={`${styles.step} ${styles.stepDone}`}>
            <div className={styles.doneHero}>
              <img
                src="/mimir/mimir-celebrating.webp"
                alt="Mimir"
                className={styles.doneHeroImg}
                draggable={false}
              />
            </div>
            <div className={styles.doneBannerText}>
              <h2 className={styles.doneTitle}>Криниця відкрита.</h2>
              <p className={styles.doneDesc}>Мімір пам'ятає все — тепер і твоє. Твоя хроніка починається.</p>
            </div>

            {/* Avatar upload — circular */}
            <div className={styles.doneAvatarRow}>
              <ImageUploadButton
                currentUrl={avatarUrl || undefined}
                folder="mimir/avatars"
                onUpload={url => {
                  setAvatarUrl(url)
                  updateProfile({ avatarUrl: url }).catch(() => {})
                }}
                placeholder="Додати фото"
                variant="circle"
              />
              <div className={styles.doneAvatarText}>
                <span className={styles.doneAvatarLabel}>ФОТО ПРОФІЛЮ</span>
                <span className={styles.doneAvatarHint}>необов'язково</span>
              </div>
            </div>

            {summaryItems.length > 0 && (
              <div className={styles.summaryCard}>
                {summaryItems.map((item, i) => (
                  <div key={i} className={styles.summaryItem}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1.5 6l3 3L10.5 2"/>
                    </svg>
                    <span className={styles.summaryText}>{item}</span>
                  </div>
                ))}
              </div>
            )}

            {activeProfile?.isVerified === false && (
              <div className={styles.verifyBanner}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                Перевір пошту — підтвердження розблокує деякі фічі
              </div>
            )}

            {pwaInstall.isInstallable && (
              <>
                <button type="button" className={styles.installBtn} onClick={pwaInstall.promptInstall}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2v13M7 11l5 5 5-5"/><path d="M3 19h18"/></svg>
                  Встановити MIMIR
                </button>
                <p className={styles.installHint}>Додати застосунок на головний екран телефону</p>
              </>
            )}

            <div className={styles.stepFooter}>
              <button
                className={`${styles.primaryBtn} ${styles.primaryBtnWide}`}
                onClick={handleFinish}
                disabled={saving}
              >
                {saving ? 'Зберігаємо…' : <>ПЕРЕЙТИ ДО MIMIR <ChevronRight /></>}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default OnboardingScreen

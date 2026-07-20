import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '@/shared/store/profileStore'
import { useCategoryStore } from '@/features/finance/store/categoryStore'
import { authFetch } from '@/shared/services/api'
import Modal from '@/shared/components/ui/Modal'
import styles from './Onboarding.module.css'

const MONTHS_UA = [
  'Січень','Лютий','Березень','Квітень','Травень','Червень',
  'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень',
]

const POPULAR_CAT_NAMES = new Set([
  'Продукти','Житло','Транспорт','Заклади','Комунальні','Побут','Підписки','Розваги',
])

const STEP_PROGRESS: Record<number, { label: string; pct: number }> = {
  2: { label: 'Крок 1 / 5', pct: 20 },
  3: { label: 'Крок 2 / 5', pct: 40 },
  4: { label: 'Крок 3 / 5', pct: 60 },
  5: { label: 'Крок 4 / 5', pct: 80 },
  6: { label: 'Крок 5 / 5', pct: 100 },
}

interface SalaryDayPickerProps {
  value: number
  onChange: (day: number) => void
}

/** Компактний тригер + Modal-календар для вибору дня місяця */
const SalaryDayPicker: React.FC<SalaryDayPickerProps> = ({ value, onChange }) => {
  const [open, setOpen]         = useState(false)
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

  const todayDate = new Date().getDate()
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

  const ChevronRight = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  const ArrowLeft = () => (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true">
      <path d="M8 1L2 8l6 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  const ArrowRight = () => (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true">
      <path d="M2 1l6 7-6 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )

  return (
    <>
      <button type="button" className={styles.dayTrigger} onClick={() => setOpen(true)}>
        <span className={styles.dayTriggerNum}>{value}-го</span>
        <span className={styles.dayTriggerSub}>числа</span>
        <span className={styles.dayTriggerChevron}><ChevronRight /></span>
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="День зарплати" draggable>
        <div className={styles.calModal}>
          <div className={styles.calNavRow}>
            <button type="button" className={styles.calNavBtn} onClick={goToPrev} aria-label="Попередній місяць">
              <ArrowLeft />
            </button>
            <span className={styles.calMonthLabel}>{MONTHS_UA[viewMonth]} {viewYear}</span>
            <button type="button" className={styles.calNavBtn} onClick={goToNext} aria-label="Наступний місяць">
              <ArrowRight />
            </button>
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
      </Modal>
    </>
  )
}

const HABIT_PRESETS = ['Спорт', 'Читання', 'Медитація', 'Вода', 'Йога', 'Прогулянка', 'Сон']

/**
 * OnboardingScreen
 * ----------------
 * 7-крокове налаштування при першому вході.
 * Крок 1 — Welcome (fullscreen, mimir-welcome)
 * Крок 2 — Location permission (fullscreen, mimir-location)
 * Крок 3 — Notifications permission (fullscreen, mimir-notifications)
 * Крок 4 — Фінанси: день зарплати + категорії витрат
 * Крок 5 — Перша звичка (preset-чіпи або свій варіант)
 * Крок 6 — Перший план (куди мрієш поїхати, skippable)
 * Крок 7 — Готово → зберігає все і переходить на Dashboard
 */
const OnboardingScreen: React.FC = () => {
  const navigate = useNavigate()
  const { activeProfile, updateProfile } = useProfileStore()
  const { categories: allCats, fetchCategories, loading: catLoading } = useCategoryStore()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 4 — Finance
  const [salaryDay, setSalaryDay] = useState(activeProfile?.salaryDay ?? 1)
  const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(new Set())
  const [showAllCats, setShowAllCats] = useState(false)
  const catsInitRef = useRef(false)
  const catsFetchRef = useRef(false)

  // Step 5 — Habit
  const [habitPreset, setHabitPreset] = useState<string | null>(null)
  const [habitCustom, setHabitCustom] = useState('')

  // Step 6 — Plan
  const [planDest, setPlanDest] = useState('')

  const topLevelCats = allCats.filter(c => !c.parentId)

  // Fetch categories when entering step 4
  useEffect(() => {
    if (step !== 4 || catsFetchRef.current) return
    catsFetchRef.current = true
    let cancelled = false
    const load = async () => {
      if (allCats.length === 0) await fetchCategories()
      if (!cancelled) { /* categories will trigger the init effect below */ }
    }
    load()
    return () => { cancelled = true }
  }, [step, allCats.length, fetchCategories])

  // Initialize selected category IDs once categories are loaded
  useEffect(() => {
    if (topLevelCats.length === 0 || catsInitRef.current) return
    let cancelled = false
    const init = async () => {
      if (!cancelled) {
        catsInitRef.current = true
        setSelectedCatIds(new Set(topLevelCats.map(c => c._id)))
      }
    }
    init()
    return () => { cancelled = true }
  }, [topLevelCats])

  const toggleCat = (id: string) => {
    setSelectedCatIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectPreset = (p: string) => {
    setHabitPreset(prev => prev === p ? null : p)
    setHabitCustom('')
  }

  const habitTitle = habitPreset ?? (habitCustom.trim() || null)

  const handleGeoPermission = () => {
    navigator.geolocation?.getCurrentPosition(() => {}, () => {})
    setStep(3)
  }

  const handleNotifPermission = async () => {
    if ('Notification' in window) {
      await Notification.requestPermission().catch(() => {})
    }
    setStep(4)
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      await updateProfile({ salaryDay, onboardingCompleted: true })

      const tasks: Promise<unknown>[] = []

      // Deactivate unchecked categories
      topLevelCats
        .filter(c => !selectedCatIds.has(c._id))
        .forEach(c => {
          tasks.push(
            authFetch(`/api/categories/${c._id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isActive: false }),
            })
          )
        })

      if (habitTitle) {
        tasks.push(
          authFetch('/api/sprint/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: habitTitle, type: 'routine', repeat: 'daily', priority: 'normal' }),
          })
        )
      }

      if (planDest.trim()) {
        tasks.push(
          authFetch('/api/plans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: planDest.trim(), status: 'want' }),
          })
        )
      }

      await Promise.allSettled(tasks)
      navigate('/', { replace: true })
    } catch {
      setSaving(false)
    }
  }

  const ChevronRight = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )

  const progress = STEP_PROGRESS[step] ?? null
  const popularCats = topLevelCats.filter(c => POPULAR_CAT_NAMES.has(c.name))
  const otherCats   = topLevelCats.filter(c => !POPULAR_CAT_NAMES.has(c.name))

  return (
    <div className={styles.root}>
      <div className={styles.inner}>

        {/* ── Step progress bar (steps 2–6) ─────────────────── */}
        {progress && (
          <div className={styles.progressWrap}>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progress.pct}%` }} />
            </div>
            <span className={styles.progressLabel}>{progress.label}</span>
          </div>
        )}

        {/* ── Step 1: Welcome (fullscreen) ──────────────────── */}
        {step === 1 && (
          <div className={styles.slideHero}>
            <img
              src="/mimir/mimir-welcome.png"
              alt="Mimir"
              className={styles.slideHeroImg}
              draggable={false}
            />
            <div className={styles.slideCopy}>
              <h1 className={styles.wordmark}>MIMIR</h1>
              <p className={styles.tagline}>DRINK DEEP</p>
              <p className={styles.greeting}>Занурся глибше.</p>
              <p className={styles.desc}>
                Особистий простір для пам'яті, фінансів, звичок і всього, що формує твоє життя.
              </p>
            </div>
            <button className={`${styles.primaryBtn} ${styles.primaryBtnFull}`} onClick={() => setStep(2)}>
              РОЗПОЧАТИ <ChevronRight />
            </button>
          </div>
        )}

        {/* ── Step 2: Location permission (fullscreen) ──────── */}
        {step === 2 && (
          <div className={styles.slideHero}>
            <img
              src="/mimir/mimir-location.png"
              alt="Mimir"
              className={styles.slideHeroImg}
              draggable={false}
            />
            <div className={styles.slideCopy}>
              <h2 className={styles.slideTitle}>Погода по-твоєму</h2>
              <p className={styles.slideDesc}>
                Мімір використовує геолокацію щоб показувати погоду для твого міста. Без реклами, без збору даних.
              </p>
            </div>
            <div className={styles.slideActions}>
              <button className={styles.slideSkipBtn} onClick={() => setStep(3)}>
                Пропустити
              </button>
              <button className={`${styles.primaryBtn} ${styles.primaryBtnFlex}`} onClick={handleGeoPermission}>
                Дозволити <ChevronRight />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Notifications permission (fullscreen) ─── */}
        {step === 3 && (
          <div className={styles.slideHero}>
            <img
              src="/mimir/mimir-notifications.png"
              alt="Mimir"
              className={styles.slideHeroImg}
              draggable={false}
            />
            <div className={styles.slideCopy}>
              <h2 className={styles.slideTitle}>Нагадує коли треба</h2>
              <p className={styles.slideDesc}>
                Дозволь Міміру надсилати нагадування про задачі і звички. Можна вимкнути будь-коли.
              </p>
            </div>
            <div className={styles.slideActions}>
              <button className={styles.slideSkipBtn} onClick={() => setStep(4)}>
                Пропустити
              </button>
              <button className={`${styles.primaryBtn} ${styles.primaryBtnFlex}`} onClick={handleNotifPermission}>
                Увімкнути <ChevronRight />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Finance setup ─────────────────────────── */}
        {step === 4 && (
          <div className={`${styles.step} ${styles.stepLeft}`}>

            {/* Header: small Mimir + title */}
            <div className={styles.stepHeaderRow}>
              <img src="/mimir/mimir-pointing.png" alt="Mimir" className={styles.mimirSm} draggable={false} />
              <div className={styles.stepHeaderText}>
                <h2 className={styles.stepTitleSm}>Налаштуємо фінанси</h2>
                <p className={styles.stepSubSm}>День зарплати і основні витрати — і Finance готовий.</p>
              </div>
            </div>

            {/* Salary day card */}
            <div className={styles.inputCard}>
              <span className={styles.sectionLabel}>ДЕНЬ ЗАРПЛАТИ</span>
              <SalaryDayPicker value={salaryDay} onChange={setSalaryDay} />
              <span className={styles.inputCardHint}>Для розрахунку місячного циклу</span>
            </div>

            {/* Categories */}
            <div className={styles.section}>
              <span className={styles.sectionLabel}>НА ЩО ВИТРАЧАЄШ?</span>
              {catLoading && topLevelCats.length === 0 ? (
                <div className={styles.catSkeleton}>
                  {[1,2,3,4,5,6].map(i => <span key={i} className={styles.catSkeletonChip} />)}
                </div>
              ) : (
                <>
                  <div className={styles.catGrid}>
                    {(popularCats.length > 0 ? popularCats : topLevelCats).map(cat => {
                      const on = selectedCatIds.has(cat._id)
                      return (
                        <button key={cat._id} type="button"
                          className={`${styles.catChip} ${on ? styles.catChipOn : ''}`}
                          onClick={() => toggleCat(cat._id)} aria-pressed={on}>
                          <span className={styles.catDot} style={{ background: cat.color }} />
                          {cat.name}
                        </button>
                      )
                    })}
                  </div>
                  {otherCats.length > 0 && !showAllCats && (
                    <button type="button" className={styles.showMoreBtn} onClick={() => setShowAllCats(true)}>
                      + Ще {otherCats.length} категорій
                    </button>
                  )}
                  {showAllCats && (
                    <div className={`${styles.catGrid} ${styles.catGridMore}`}>
                      {otherCats.map(cat => {
                        const on = selectedCatIds.has(cat._id)
                        return (
                          <button key={cat._id} type="button"
                            className={`${styles.catChip} ${on ? styles.catChipOn : ''}`}
                            onClick={() => toggleCat(cat._id)} aria-pressed={on}>
                            <span className={styles.catDot} style={{ background: cat.color }} />
                            {cat.name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer: selected count + CTA */}
            <div className={styles.stepFooter}>
              <span className={styles.selectedCount}>
                Обрано: {selectedCatIds.size}
              </span>
              <button className={`${styles.primaryBtn} ${styles.primaryBtnWide}`} onClick={() => setStep(5)}>
                Далі <ChevronRight />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: First habit ───────────────────────────── */}
        {step === 5 && (
          <div className={styles.step}>
            <img
              src="/mimir/mimir-writing.png"
              alt="Mimir"
              className={`${styles.mimirAvatar} ${styles.mimirAvatarMd}`}
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

            <div className={styles.btnRow}>
              <button className={styles.skipBtn} onClick={() => setStep(6)}>
                Пропустити
              </button>
              <button
                className={styles.primaryBtn}
                onClick={() => setStep(6)}
                disabled={!habitTitle}
              >
                Далі <ChevronRight />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 6: First plan ────────────────────────────── */}
        {step === 6 && (
          <div className={styles.step}>
            <img
              src="/mimir/mimir-thinking.png"
              alt="Mimir"
              className={`${styles.mimirAvatar} ${styles.mimirAvatarMd}`}
              draggable={false}
            />
            <h2 className={styles.stepTitle}>Куди мрієш поїхати?</h2>
            <p className={styles.stepSub}>Збережемо як перший план у розділі Спогади.</p>

            <input
              className={styles.textInput}
              type="text"
              placeholder="Наприклад, Барселона…"
              value={planDest}
              onChange={e => setPlanDest(e.target.value)}
              maxLength={80}
              autoFocus
            />

            <div className={styles.btnRow}>
              <button className={styles.skipBtn} onClick={() => setStep(7)}>
                Пропустити
              </button>
              <button className={styles.primaryBtn} onClick={() => setStep(7)}>
                Далі <ChevronRight />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 7: Done ──────────────────────────────────── */}
        {step === 7 && (
          <div className={styles.step}>
            <img
              src="/mimir/mimir-celebrating.png"
              alt="Mimir"
              className={`${styles.mimirAvatar} ${styles.mimirAvatarLg}`}
              draggable={false}
            />
            <h2 className={styles.doneTitle}>Криниця відкрита.</h2>
            <p className={styles.doneDesc}>
              Мімір пам'ятає все — тепер і твоє.<br />Твоя хроніка починається.
            </p>
            <p className={styles.doneHint}>
              Вигляд і навігацію можна змінити у Профіль → Вигляд
            </p>
            <button
              className={styles.primaryBtn}
              onClick={handleFinish}
              disabled={saving}
            >
              {saving ? 'Зберігаємо…' : <>Розпочати <ChevronRight /></>}
            </button>
          </div>
        )}


      </div>
    </div>
  )
}

export default OnboardingScreen

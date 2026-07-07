import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../../store/profileStore'
import { useCategoryStore } from '../../store/categoryStore'
import { authFetch } from '../../services/api'
import MimirFillIcon from '../../components/ui/MimirFillIcon'
import styles from './Onboarding.module.css'

const TOTAL_STEPS = 5

const HABIT_PRESETS = ['Спорт', 'Читання', 'Медитація', 'Вода', 'Йога', 'Прогулянка', 'Сон']

/**
 * OnboardingScreen
 * ----------------
 * 5-крокове налаштування при першому вході.
 * Крок 1 — Привітання
 * Крок 2 — Фінанси: день зарплати + активні категорії витрат
 * Крок 3 — Перша звичка (preset-чіпи або свій варіант)
 * Крок 4 — Перший план (куди мрієш поїхати, skippable)
 * Крок 5 — Готово → зберігає все і переходить на Dashboard
 */
const OnboardingScreen: React.FC = () => {
  const navigate = useNavigate()
  const { activeProfile, updateProfile } = useProfileStore()
  const { categories: allCats, fetchCategories, loading: catLoading } = useCategoryStore()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 2 — Finance
  const [salaryDay, setSalaryDay] = useState(activeProfile?.salaryDay ?? 1)
  const [doneProgress, setDoneProgress] = useState(0)
  const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(new Set())
  const catsInitRef = useRef(false)
  const catsFetchRef = useRef(false)

  // Step 3 — Habit
  const [habitPreset, setHabitPreset] = useState<string | null>(null)
  const [habitCustom, setHabitCustom] = useState('')

  // Step 4 — Plan
  const [planDest, setPlanDest] = useState('')

  const firstName = activeProfile?.name?.split(' ')[0] ?? 'друже'
  const topLevelCats = allCats.filter(c => !c.parentId)

  // Fetch categories when entering step 2
  useEffect(() => {
    if (step !== 2 || catsFetchRef.current) return
    catsFetchRef.current = true
    let cancelled = false
    const load = async () => {
      if (allCats.length === 0) await fetchCategories()
      if (!cancelled) { /* categories will trigger the init effect below */ }
    }
    load()
    return () => { cancelled = true }
  }, [step, allCats.length, fetchCategories])

  // Animate MimirFillIcon when entering done step
  useEffect(() => {
    if (step !== 5) return
    let cancelled = false
    const load = async () => {
      const start = performance.now()
      const duration = 1400
      const tick = (now: number) => {
        if (cancelled) return
        const t = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - t, 3)
        if (!cancelled) setDoneProgress(eased)
        if (t < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
    load()
    return () => { cancelled = true }
  }, [step])

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

  return (
    <div className={styles.root}>
      <div className={styles.inner}>

        {/* ── Step 1: Welcome ───────────────────────────────── */}
        {step === 1 && (
          <div className={styles.step}>
            <div className={styles.logoWrap}>
              <MimirFillIcon size={80} progress={1} />
            </div>
            <h1 className={styles.wordmark}>MIMIR</h1>
            <p className={styles.tagline}>DRINK DEEP</p>
            <p className={styles.greeting}>Привіт, {firstName}!</p>
            <p className={styles.desc}>
              Особистий органайзер для тих, хто цінує кожен момент — фінанси, звички, спогади, все в одному місці.
            </p>
            <button className={styles.primaryBtn} onClick={() => setStep(2)}>
              Далі <ChevronRight />
            </button>
          </div>
        )}

        {/* ── Step 2: Finance setup ─────────────────────────── */}
        {step === 2 && (
          <div className={styles.step}>
            <h2 className={styles.stepTitle}>Налаштуємо фінанси</h2>
            <p className={styles.stepSub}>Два питання щоб Finance одразу працював на тебе.</p>

            <div className={styles.section}>
              <span className={styles.sectionLabel}>ФІНАНСОВИЙ ДЕНЬ</span>
              <div className={styles.dayGrid}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <button
                    key={d}
                    type="button"
                    className={`${styles.dayCell} ${salaryDay === d ? styles.dayCellOn : ''}`}
                    onClick={() => setSalaryDay(d)}
                    aria-pressed={salaryDay === d}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <span className={styles.sectionLabel}>ЩО ВІДСТЕЖУВАТИМЕШ?</span>
              {catLoading && topLevelCats.length === 0 ? (
                <div className={styles.catSkeleton}>
                  {[1,2,3,4,5,6].map(i => <span key={i} className={styles.catSkeletonChip} />)}
                </div>
              ) : (
                <div className={styles.catGrid}>
                  {topLevelCats.map(cat => {
                    const on = selectedCatIds.has(cat._id)
                    return (
                      <button
                        key={cat._id}
                        type="button"
                        className={`${styles.catChip} ${on ? styles.catChipOn : ''}`}
                        onClick={() => toggleCat(cat._id)}
                        aria-pressed={on}
                      >
                        <span className={styles.catDot} style={{ background: cat.color }} />
                        {cat.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <button className={styles.primaryBtn} onClick={() => setStep(3)}>
              Далі <ChevronRight />
            </button>
          </div>
        )}

        {/* ── Step 3: First habit ───────────────────────────── */}
        {step === 3 && (
          <div className={styles.step}>
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
              <button className={styles.skipBtn} onClick={() => setStep(4)}>
                Пропустити
              </button>
              <button
                className={styles.primaryBtn}
                onClick={() => setStep(4)}
                disabled={!habitTitle}
              >
                Далі <ChevronRight />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: First plan ────────────────────────────── */}
        {step === 4 && (
          <div className={styles.step}>
            <div className={styles.planIconWrap}>
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
                <circle cx="28" cy="28" r="26" stroke="var(--accent)" strokeWidth="1.5" opacity="0.25"/>
                <path d="M18 32c2-4 5-7 10-7s8 3 10 7" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M14 28c3-7 8-12 14-12s11 5 14 12" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
                <circle cx="28" cy="36" r="3" fill="var(--accent)"/>
              </svg>
            </div>
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
              <button className={styles.skipBtn} onClick={() => setStep(5)}>
                Пропустити
              </button>
              <button className={styles.primaryBtn} onClick={() => setStep(5)}>
                Далі <ChevronRight />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: Done ──────────────────────────────────── */}
        {step === 5 && (
          <div className={styles.step}>
            <div className={styles.doneIcon}>
              <MimirFillIcon size={88} progress={doneProgress} />
            </div>
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

        {/* ── Progress dots (all steps) ─────────────────────── */}
        <div className={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span
              key={i}
              className={`${styles.dot} ${i + 1 === step ? styles.dotActive : i + 1 < step ? styles.dotDone : ''}`}
            />
          ))}
        </div>

      </div>
    </div>
  )
}

export default OnboardingScreen

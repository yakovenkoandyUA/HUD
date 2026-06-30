import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../../store/profileStore'
import styles from './Onboarding.module.css'

interface ModuleDef {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  defaultOn: boolean
}

const FinanceIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="3" y="7" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M3 11h22" stroke="currentColor" strokeWidth="1.6"/>
    <circle cx="9" cy="17" r="2" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)

const SprintIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="5" y="4" width="18" height="21" rx="2" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M9 10h10M9 14h10M9 18h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="20" cy="19" r="4" fill="var(--bg)" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M18.5 19l1 1 2-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const RecipeIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <path d="M9 4v6c0 2.2 1.8 4 4 4h0c2.2 0 4-1.8 4-4V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M13 14v10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M10 24h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M5 4v4a3 3 0 003 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
)

const WatchlistIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="3" y="6" width="22" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M10 22h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M12 10l5 4-5 4V10z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
)

const MemoriesIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="3" y="7" width="22" height="17" rx="2" stroke="currentColor" strokeWidth="1.6"/>
    <circle cx="10" cy="15" r="3" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M3 18l5-4 4 3 5-5 8 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19 7V5h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const F1Icon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <path d="M4 18c2-3 5-5 10-5 3 0 6 1 8 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M3 15l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="8" cy="20" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="20" cy="20" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M14 6v4M11 7l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const MODULES: ModuleDef[] = [
  { id: 'finance',   label: 'ФІНАНСИ',       description: 'Бюджет, витрати, цілі',      icon: <FinanceIcon />,   defaultOn: true },
  { id: 'sprint',    label: 'КВЕСТИ',         description: 'Задачі та щоденні звички',   icon: <SprintIcon />,    defaultOn: true },
  { id: 'recipes',   label: 'РЕЦЕПТИ',        description: 'Страви, меню, список покупок', icon: <RecipeIcon />, defaultOn: true },
  { id: 'watchlist', label: 'МЕДІА',          description: 'Фільми, серіали, аніме, ігри', icon: <WatchlistIcon />, defaultOn: true },
  { id: 'memories',  label: 'СПОГАДИ',        description: 'Фото, місця, поїздки',       icon: <MemoriesIcon />,  defaultOn: true },
  { id: 'f1',        label: 'F1',             description: 'Прогнози і чемпіонат',       icon: <F1Icon />,        defaultOn: false },
]

const DOT_COUNT = 3

/**
 * OnboardingScreen
 * ----------------
 * Показується один раз після реєстрації (`onboardingCompleted === false`).
 * 3 кроки: Привітання → Вибір модулів → Готово.
 * По завершенню зберігає `onboardingCompleted: true` + `f1Enabled` і редіректить на Dashboard.
 */
const OnboardingScreen: React.FC = () => {
  const navigate = useNavigate()
  const { activeProfile, updateProfile } = useProfileStore()
  const [step, setStep] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(MODULES.filter(m => m.defaultOn).map(m => m.id))
  )
  const [saving, setSaving] = useState(false)

  const firstName = activeProfile?.name?.split(' ')[0] ?? 'друже'

  const toggleModule = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      await updateProfile({
        onboardingCompleted: true,
        f1Enabled: selected.has('f1'),
      })
      navigate('/', { replace: true })
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.inner}>

        {/* ── Step 1: Welcome ─────────────────── */}
        {step === 1 && (
          <div className={styles.step}>
            <div className={styles.logoWrap}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-label="MIMIR">
                <circle cx="32" cy="32" r="30" stroke="var(--accent)" strokeWidth="2"/>
                <path d="M20 44V22l12 14 12-14v22" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="32" cy="18" r="3" fill="var(--accent)"/>
              </svg>
            </div>
            <h1 className={styles.wordmark}>MIMIR</h1>
            <p className={styles.tagline}>DRINK DEEP</p>
            <p className={styles.greeting}>Привіт, {firstName}!</p>
            <p className={styles.desc}>
              Особистий органайзер для тих, хто цінує кожен момент — фінанси, звички, спогади, все в одному місці.
            </p>
            <button className={styles.primaryBtn} onClick={() => setStep(2)}>
              Далі
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* ── Step 2: Module selection ─────────── */}
        {step === 2 && (
          <div className={styles.step}>
            <h2 className={styles.stepTitle}>Що тебе цікавить?</h2>
            <p className={styles.stepSub}>Обери модулі. Завжди можна змінити у профілі.</p>
            <div className={styles.moduleGrid}>
              {MODULES.map(mod => {
                const on = selected.has(mod.id)
                return (
                  <button
                    key={mod.id}
                    type="button"
                    className={`${styles.moduleTile} ${on ? styles.moduleTileOn : ''}`}
                    onClick={() => toggleModule(mod.id)}
                    aria-pressed={on}
                  >
                    <span className={styles.moduleTileIcon}>{mod.icon}</span>
                    <span className={styles.moduleTileLabel}>{mod.label}</span>
                    <span className={styles.moduleTileDesc}>{mod.description}</span>
                    <span className={`${styles.moduleTileCheck} ${on ? styles.moduleTileCheckOn : ''}`}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  </button>
                )
              })}
            </div>
            <button className={styles.primaryBtn} onClick={() => setStep(3)}>
              Далі
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* ── Step 3: Done ─────────────────────── */}
        {step === 3 && (
          <div className={styles.step}>
            <div className={styles.doneIconWrap}>
              <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
                <circle cx="36" cy="36" r="33" stroke="var(--accent)" strokeWidth="2" opacity="0.3"/>
                <circle cx="36" cy="36" r="26" stroke="var(--accent)" strokeWidth="1.5" opacity="0.15"/>
                <path d="M22 37l9 9 19-19" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className={styles.doneTitle}>Все готово!</h2>
            <p className={styles.doneDesc}>
              MIMIR налаштовано. Додай перший спогад, плануй звички або перевір баланс — починати можна з будь-чого.
            </p>
            <button
              className={styles.primaryBtn}
              onClick={handleFinish}
              disabled={saving}
            >
              {saving ? 'Зберігаємо…' : 'Розпочати'}
              {!saving && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        )}

        {/* ── Progress dots ─────────────────────── */}
        {step > 1 && (
          <div className={styles.dots}>
            {Array.from({ length: DOT_COUNT }, (_, i) => (
              <span
                key={i}
                className={`${styles.dot} ${i + 1 === step ? styles.dotActive : i + 1 < step ? styles.dotDone : ''}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default OnboardingScreen

import React, { useState, useEffect, useRef } from 'react'
import { useUiStore } from '../../store/uiStore'
import { usePushSubscription } from '../../hooks/usePushSubscription'
import { useProfileStore } from '../../store/profileStore'
import type { Theme } from '../../store/uiStore'
import styles from './ProfilePage.module.css'

interface ThemePalette {
  id: Theme
  name: string
  bg: string
  surface: string
  border: string
  accent: string
  text: string
}

const PALETTES: ThemePalette[] = [
  { id: 'velvet',  name: 'VELVET', bg: '#0d0f1a', surface: '#1e2235', border: '#2e3450', accent: '#d4a017', text: '#e8d5a0' },
  { id: 'japan',   name: 'JAPAN',  bg: '#F5F0EB', surface: '#EDE8E2', border: '#D5CEC5', accent: '#C8102E', text: '#1a1a1a' },
  { id: 'cyber',   name: 'CYBER',  bg: '#06080e', surface: '#131a2c', border: '#202c48', accent: '#ff2060', text: '#d8eaf8' },
  { id: 'noir',    name: 'NOIR',   bg: '#080808', surface: '#1a1a1a', border: '#2a2a2a', accent: '#d0d0d0', text: '#ebebeb' },
  { id: 'pixel',  name: 'PIXEL',  bg: '#f4efe0', surface: '#faf6ea', border: '#c8bc94', accent: '#d42020', text: '#181028' },
  { id: 'arctic', name: 'ARCTIC', bg: '#1e2330', surface: '#313a4e', border: '#4a5570', accent: '#88c0d0', text: '#eceff4' },
]

/**
 * AppearanceTab
 * -------------
 * Вкладка "Вигляд" — вибір теми + Web Push нотифікації.
 */
const AppearanceTab: React.FC = () => {
  const { theme, setTheme } = useUiStore()
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushSubscription()
  const { activeProfile, updateProfile } = useProfileStore()
  const [pushLoading, setPushLoading] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [city, setCity] = useState(activeProfile?.city ?? '')
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      if (!isSupported) return
      const perm = Notification.permission
      if (!cancelled) setPermissionDenied(perm === 'denied')
    }
    check()
    return () => { cancelled = true }
  }, [isSupported])

  const handleCityChange = (value: string) => {
    setCity(value)
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current)
    cityDebounceRef.current = setTimeout(() => {
      updateProfile({ city: value.trim() })
    }, 800)
  }

  const handleTimeSlot = (field: 'morningStart' | 'afternoonStart' | 'eveningStart', value: number) => {
    updateProfile({ [field]: value })
  }

  const handlePushToggle = async () => {
    if (pushLoading) return
    setPushLoading(true)
    try {
      if (isSubscribed) {
        await unsubscribe()
      } else {
        const perm = Notification.permission === 'granted'
          ? true
          : await Notification.requestPermission().then(p => p === 'granted')
        if (!perm) { setPermissionDenied(true); return }
        await subscribe()
      }
    } finally {
      setPushLoading(false)
    }
  }

  return (
    <div className={styles.tabContent}>
      {/* ── Theme ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>ТЕМА</span>
        </div>
        <div className={styles.themeGrid}>
          {PALETTES.map(p => {
            const isActive = theme === p.id
            return (
              <button
                key={p.id}
                type="button"
                className={`${styles.themeSwatch} ${isActive ? styles.themeSwatchActive : ''}`}
                style={{
                  '--swatch-bg': p.bg,
                  '--swatch-surface': p.surface,
                  '--swatch-border': p.border,
                  '--swatch-accent': p.accent,
                  '--swatch-text': p.text,
                } as React.CSSProperties}
                onClick={() => setTheme(p.id)}
                aria-pressed={isActive}
              >
                <div className={styles.swatchPreview}>
                  <div className={styles.swatchCard} />
                  <div className={styles.swatchAccent} />
                </div>
                <span className={styles.swatchName}>{p.name}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Push notifications ── */}
      {isSupported && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>СПОВІЩЕННЯ</span>
          </div>
          {permissionDenied ? (
            <p className={styles.sectionHint}>
              Дозвіл на сповіщення відхилено. Увімкни в налаштуваннях браузера.
            </p>
          ) : (
            <div className={styles.pushRow}>
              <div className={styles.pushInfo}>
                <span className={styles.pushLabel}>Push-сповіщення</span>
                <span className={styles.pushSub}>Нагадування про гонки, задачі та оновлення</span>
              </div>
              <button
                type="button"
                className={`${styles.toggle} ${isSubscribed ? styles.toggleOn : ''}`}
                onClick={handlePushToggle}
                disabled={pushLoading}
                aria-pressed={isSubscribed}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>
          )}
        </section>
      )}
      {/* ── My Day settings ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>МІЙ ДЕНЬ</span>
        </div>

        <div className={styles.fieldRow}>
          <label className={styles.fieldLabel}>Місто (погода)</label>
          <input
            className={styles.fieldInput}
            value={city}
            onChange={e => handleCityChange(e.target.value)}
            placeholder="Київ"
          />
        </div>

        <p className={styles.sectionHint} style={{ marginTop: 12 }}>Часові межі секцій</p>
        {([
          { key: 'morningStart',   label: 'Ранок починається о' },
          { key: 'afternoonStart', label: 'День починається о' },
          { key: 'eveningStart',   label: 'Вечір починається о' },
        ] as const).map(({ key, label }) => (
          <div key={key} className={styles.slotRow}>
            <span className={styles.slotLabel}>{label}</span>
            <div className={styles.slotStepper}>
              <button
                type="button"
                className={styles.stepperBtn}
                onClick={() => handleTimeSlot(key, Math.max(0, (activeProfile?.[key] ?? 6) - 1))}
              >−</button>
              <span className={styles.stepperVal}>
                {String(activeProfile?.[key] ?? 0).padStart(2, '0')}:00
              </span>
              <button
                type="button"
                className={styles.stepperBtn}
                onClick={() => handleTimeSlot(key, Math.min(23, (activeProfile?.[key] ?? 6) + 1))}
              >+</button>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

export default AppearanceTab

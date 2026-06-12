import React, { useState, useEffect } from 'react'
import { useUiStore } from '../../store/uiStore'
import { usePushSubscription } from '../../hooks/usePushSubscription'
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
  { id: 'retro',   name: 'RETRO',  bg: '#0d0d0d', surface: '#201e1b', border: '#2e2b27', accent: '#B83A2D', text: '#EDE0CC' },
  { id: 'velvet',  name: 'VELVET', bg: '#0d0f1a', surface: '#1e2235', border: '#2e3450', accent: '#d4a017', text: '#e8d5a0' },
  { id: 'japan',   name: 'JAPAN',  bg: '#F5F0EB', surface: '#EDE8E2', border: '#D5CEC5', accent: '#C8102E', text: '#1a1a1a' },
  { id: 'cyber',   name: 'CYBER',  bg: '#06080e', surface: '#131a2c', border: '#202c48', accent: '#ff2060', text: '#d8eaf8' },
  { id: 'noir',    name: 'NOIR',   bg: '#080808', surface: '#1a1a1a', border: '#2a2a2a', accent: '#d0d0d0', text: '#ebebeb' },
  { id: 'pixel',   name: 'PIXEL',  bg: '#f4efe0', surface: '#faf6ea', border: '#c8bc94', accent: '#d42020', text: '#181028' },
  { id: 'cosmos',  name: 'COSMOS', bg: '#09060f', surface: '#180e2e', border: '#2e1a52', accent: '#ff7055', text: '#ecdff5' },
]

/**
 * AppearanceTab
 * -------------
 * Вкладка "Вигляд" — вибір теми + Web Push нотифікації.
 */
const AppearanceTab: React.FC = () => {
  const { theme, setTheme } = useUiStore()
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushSubscription()
  const [pushLoading, setPushLoading] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)

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
    </div>
  )
}

export default AppearanceTab

import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUiStore } from '../../../store/uiStore'
import { useProfileStore } from '../../../store/profileStore'
import { usePwaInstall } from '../../../hooks/usePwaInstall'
import type { Theme } from '../../../store/uiStore'
import { clearApiCaches } from '../../../utils/appCache'
import styles from './ThemePicker.module.css'

/**
 * ThemePicker
 * -----------
 * Вибір теми (2×2 сітка) + секція ПРОФІЛЬ.
 * Профіль: аватар з можливістю змінити, ім'я, кнопка "Змінити профіль".
 *
 * Props:
 * @prop {() => void} onClose — закрити після вибору
 */
interface ThemePickerProps {
  onClose: () => void
}

interface ThemePalette {
  id: Theme
  name: string
  bg: string
  surface: string
  border: string
  accent: string
  second: string
  gold: string
  text: string
}

const PALETTES: ThemePalette[] = [
  {
    id: 'retro',
    name: 'RETRO',
    bg: '#0d0d0d',
    surface: '#201e1b',
    border: '#2e2b27',
    accent: '#B83A2D',
    second: '#4E6851',
    gold: '#DCC9A9',
    text: '#EDE0CC',
  },
  {
    id: 'warm',
    name: 'WARM',
    bg: '#1a2328',
    surface: '#264653',
    border: '#2f5a69',
    accent: '#E76F51',
    second: '#2A9D8F',
    gold: '#E9C46A',
    text: '#f0ece8',
  },
  {
    id: 'japan',
    name: 'JAPAN',
    bg: '#F5F0EB',
    surface: '#EDE8E2',
    border: '#D5CEC5',
    accent: '#C8102E',
    second: '#1a1a1a',
    gold: '#8B7355',
    text: '#1a1a1a',
  },
  {
    id: 'heroes',
    name: 'HEROES',
    bg: '#0d0f1a',
    surface: '#1e2235',
    border: '#2e3450',
    accent: '#d4a017',
    second: '#6a4fc8',
    gold: '#d4a017',
    text: '#e8d5a0',
  },
  {
    id: 'berry',
    name: 'BERRY',
    bg: '#0f1a24',
    surface: '#1E3442',
    border: '#2a4d5e',
    accent: '#FF5C8D',
    second: '#732553',
    gold: '#85A3B2',
    text: '#E9D8C8',
  },
]

const ThemePicker: React.FC<ThemePickerProps> = ({ onClose }) => {
  const navigate = useNavigate()
  const { theme, setTheme, showToast } = useUiStore()
  const { activeProfile, logout, uploadAvatar } = useProfileStore()
  const { isInstallable, isIOS, promptInstall } = usePwaInstall()
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  const showInstall = !isStandalone && (isInstallable || isIOS)
  const [cleared, setCleared] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handlePick = (id: Theme) => {
    setTheme(id)
    onClose()
  }

  const handleClearCache = () => {
    clearApiCaches()
    setCleared(true)
    showToast('Кеш очищено', 'success')
    setTimeout(() => setCleared(false), 2000)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadAvatar(file)
      showToast('Аватар оновлено', 'success')
    } catch {
      showToast('Помилка завантаження', 'error')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSwitchProfile = () => {
    logout()
    onClose()
    navigate('/profile-select')
  }

  return (
    <>
      {/* ── Теми ── */}
      <div className={styles.grid}>
        {PALETTES.map((p) => {
          const isActive = theme === p.id
          return (
            <button
              key={p.id}
              type="button"
              className={styles.card}
              style={{
                background: p.bg,
                border: isActive
                  ? `2px solid ${p.accent}`
                  : `1.5px solid ${p.border}`,
                boxShadow: isActive ? `0 0 16px ${p.accent}44` : 'none',
              }}
              onClick={() => handlePick(p.id)}
            >
              <span
                className={styles.name}
                style={{ color: p.accent, fontFamily: 'var(--font-display)' }}
              >
                {p.name}
              </span>

              <div className={styles.swatches}>
                <span className={styles.swatch} style={{ background: p.accent }} />
                <span className={styles.swatch} style={{ background: p.second }} />
                <span className={styles.swatch} style={{ background: p.gold }}   />
                <span className={styles.swatch} style={{ background: p.text, opacity: 0.7 }} />
              </div>

              <div className={styles.preview}>
                <div className={styles.previewBar} style={{ background: p.surface, border: `1px solid ${p.border}` }}>
                  <div className={styles.previewDot}  style={{ background: p.accent }} />
                  <div className={styles.previewLine} style={{ background: p.text, opacity: 0.6 }} />
                  <div className={styles.previewLine} style={{ background: p.text, opacity: 0.3, width: '40%' }} />
                </div>
                <div className={styles.previewBar} style={{ background: p.surface, border: `1px solid ${p.border}` }}>
                  <div className={styles.previewDot}  style={{ background: p.second }} />
                  <div className={styles.previewLine} style={{ background: p.text, opacity: 0.6 }} />
                  <div className={styles.previewLine} style={{ background: p.text, opacity: 0.3, width: '55%' }} />
                </div>
              </div>

              {isActive && (
                <span className={styles.activeTick} style={{ color: p.accent }}>✓</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Профіль ── */}
      {activeProfile && (
        <div className={styles.profileSection}>
          <p className={styles.sectionLabel}>ПРОФІЛЬ</p>

          <div className={styles.profileRow}>
            {/* Avatar + upload */}
            <button
              type="button"
              className={styles.avatarBtn}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Змінити аватар"
            >
              {activeProfile.avatarUrl ? (
                <img src={activeProfile.avatarUrl} alt={activeProfile.name} className={styles.avatarImg} />
              ) : (
                <span className={styles.avatarInitial}>
                  {activeProfile.name[0].toUpperCase()}
                </span>
              )}
              <span className={styles.avatarOverlay}>{uploading ? '...' : '✎'}</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />

            {/* Name + switch button */}
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>{activeProfile.name}</span>
              <button
                type="button"
                className={styles.switchBtn}
                onClick={handleSwitchProfile}
              >
                Змінити профіль
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Встановити ── */}
      {showInstall && (
        <div className={styles.installSection}>
          <p className={styles.sectionLabel}>ДОДАТОК</p>
          {isIOS ? (
            <p className={styles.installHint}>
              Натисніть <strong>⎙ Share</strong> → <strong>«Додати на початковий екран»</strong> щоб встановити MIMIR як додаток.
            </p>
          ) : (
            <button
              type="button"
              className={styles.installBtn}
              onClick={() => { promptInstall(); onClose() }}
            >
              <span className={styles.installIcon}>⬇</span>
              Встановити додаток
            </button>
          )}
        </div>
      )}

      {/* ── Кеш ── */}
      <button
        type="button"
        className={`${styles.clearBtn} ${cleared ? styles.clearBtnDone : ''}`}
        onClick={handleClearCache}
      >
        {cleared ? '✓ Кеш очищено' : 'Очистити кеш'}
      </button>
    </>
  )
}

export default ThemePicker

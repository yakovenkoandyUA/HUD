import React, { useState } from 'react'
import { useModalHistory } from '../../../hooks/useModalHistory'
import { useNavigate } from 'react-router-dom'
import { useUiStore } from '../../../store/uiStore'
import { useProfileStore } from '../../../store/profileStore'
import { usePwaInstall } from '../../../hooks/usePwaInstall'
import type { Theme } from '../../../store/uiStore'
import { clearApiCaches } from '../../../utils/appCache'
import ProfileEditModal from '../../ui/ProfileEditModal'
import styles from './ThemePicker.module.css'

/**
 * ThemePicker
 * -----------
 * Модалка налаштувань: ПРОФІЛЬ → ТЕМА → ДОДАТКОВО.
 * Логіку тем, профілю та кешу не змінювати.
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
    id: 'castle',
    name: 'CASTLE',
    bg: '#0d0f1a',
    surface: '#1e2235',
    border: '#2e3450',
    accent: '#d4a017',
    second: '#6a4fc8',
    gold: '#d4a017',
    text: '#e8d5a0',
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
    id: 'cyber',
    name: 'CYBER',
    bg: '#06080e',
    surface: '#131a2c',
    border: '#202c48',
    accent: '#ff2060',
    second: '#00d4ff',
    gold: '#f0a020',
    text: '#d8eaf8',
  },
  {
    id: 'noir',
    name: 'NOIR',
    bg: '#080808',
    surface: '#1a1a1a',
    border: '#2a2a2a',
    accent: '#d0d0d0',
    second: '#606060',
    gold: '#c8c8c8',
    text: '#ebebeb',
  },
  {
    id: 'pixel',
    name: 'PIXEL',
    bg: '#f4efe0',
    surface: '#faf6ea',
    border: '#c8bc94',
    accent: '#d42020',
    second: '#1848c8',
    gold: '#e8a020',
    text: '#181028',
  },
]

const ThemePicker: React.FC<ThemePickerProps> = ({ onClose }) => {
  useModalHistory(onClose, true)

  const navigate = useNavigate()
  const { theme, setTheme, showToast, updateAvailable } = useUiStore()
  const { activeProfile, logout, updateProfile } = useProfileStore()
  const { isInstallable, isIOS, promptInstall } = usePwaInstall()
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  const showInstall = !isStandalone && (isInstallable || isIOS)
  const [cleared, setCleared] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

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

  const handleSwitchProfile = () => {
    logout()
    onClose()
    navigate('/login')
  }

  return (
    <>
      {/* ── 1. ПРОФІЛЬ ── */}
      {activeProfile && (
        <div className={styles.profileSection}>
          <p className={styles.sectionLabel}>ПРОФІЛЬ</p>

          <div className={styles.profileRow}>
            <button
              type="button"
              className={styles.avatarBtn}
              onClick={() => setEditOpen(true)}
              title="Редагувати профіль"
            >
              {activeProfile.avatarUrl ? (
                <img src={activeProfile.avatarUrl} alt={activeProfile.name} className={styles.avatarImg} />
              ) : (
                <span className={styles.avatarInitial}>
                  {activeProfile.name[0].toUpperCase()}
                </span>
              )}
              <span className={styles.avatarOverlay}>✎</span>
            </button>

            <div className={styles.profileInfo}>
              <span className={styles.profileName}>{activeProfile.name}</span>
              <div className={styles.profileActions}>
                <button
                  type="button"
                  className={styles.editBtn}
                  onClick={() => { onClose(); navigate('/profile') }}
                >
                  Редагувати
                </button>
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

          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>F1 модуль</span>
            <button
              type="button"
              className={`${styles.toggle} ${activeProfile.f1Enabled ? styles.toggleOn : ''}`}
              onClick={() => updateProfile({ f1Enabled: !(activeProfile.f1Enabled ?? false) })}
              aria-label="Увімкнути F1 модуль"
            />
          </div>
        </div>
      )}

      {/* ── 2. ТЕМА ── */}
      <div className={styles.themeSection}>
        <p className={styles.sectionLabel}>ТЕМА</p>
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
      </div>

      {/* ── 3. ДОДАТКОВО ── */}
      <div className={styles.extraSection}>
        <p className={styles.sectionLabel}>ДОДАТКОВО</p>

        {updateAvailable && (
          <div className={styles.updateRow}>
            <span className={styles.updateLabel}>🔄 Доступне оновлення</span>
            <button
              type="button"
              className={styles.updateBtn}
              onClick={() => window.location.reload()}
            >
              ОНОВИТИ
            </button>
          </div>
        )}

        {showInstall && (
          isIOS ? (
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
          )
        )}

        <button
          type="button"
          className={`${styles.clearBtn} ${cleared ? styles.clearBtnDone : ''}`}
          onClick={handleClearCache}
        >
          {cleared ? '✓ Кеш очищено' : 'Очистити кеш'}
        </button>
      </div>

      <ProfileEditModal isOpen={editOpen} onClose={() => setEditOpen(false)} />
    </>
  )
}

export default ThemePicker

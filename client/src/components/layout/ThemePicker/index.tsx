import React from 'react'
import { useUiStore } from '../../../store/uiStore'
import type { Theme } from '../../../store/uiStore'
import styles from './ThemePicker.module.css'

/**
 * ThemePicker
 * -----------
 * Вибір теми у вигляді 2×2 сітки карток.
 * Кожна картка — превью кольорів теми.
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
]

const ThemePicker: React.FC<ThemePickerProps> = ({ onClose }) => {
  const { theme, setTheme } = useUiStore()

  const handlePick = (id: Theme) => {
    setTheme(id)
    onClose()
  }

  return (
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
            {/* Theme name */}
            <span
              className={styles.name}
              style={{ color: p.accent, fontFamily: 'var(--font-display)' }}
            >
              {p.name}
            </span>

            {/* Color swatches row */}
            <div className={styles.swatches}>
              <span className={styles.swatch} style={{ background: p.accent }} title="accent" />
              <span className={styles.swatch} style={{ background: p.second }} title="second" />
              <span className={styles.swatch} style={{ background: p.gold }}   title="gold"   />
              <span className={styles.swatch} style={{ background: p.text, opacity: 0.7 }}   title="text" />
            </div>

            {/* Mini preview strips */}
            <div className={styles.preview}>
              <div className={styles.previewBar} style={{ background: p.surface, border: `1px solid ${p.border}` }}>
                <div className={styles.previewDot} style={{ background: p.accent }} />
                <div className={styles.previewLine} style={{ background: p.text, opacity: 0.6 }} />
                <div className={styles.previewLine} style={{ background: p.text, opacity: 0.3, width: '40%' }} />
              </div>
              <div className={styles.previewBar} style={{ background: p.surface, border: `1px solid ${p.border}` }}>
                <div className={styles.previewDot} style={{ background: p.second }} />
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
  )
}

export default ThemePicker

import React from 'react'
import { useUiStore } from '../../../store/uiStore'
import type { Theme } from '../../../store/uiStore'
import styles from './ThemeSwitcher.module.css'

/**
 * ThemeSwitcher
 * -------------
 * Перемикач між 4 темами застосунку.
 * Зберігає вибір у uiStore → localStorage.
 * Застосовує тему через data-theme атрибут на <html>.
 */

const THEMES: { id: Theme; label: string }[] = [
  { id: 'retro', label: 'RETRO' },
  { id: 'warm',  label: 'WARM'  },
  { id: 'dark',  label: 'DARK'  },
  { id: 'japan', label: 'JAPAN' },
]

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useUiStore()

  return (
    <div className={styles.switcher}>
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`${styles.btn} ${theme === t.id ? styles.active : ''}`}
          onClick={() => setTheme(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export default ThemeSwitcher

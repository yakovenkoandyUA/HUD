import React from 'react'
import ThemeSwitcher from '../ThemeSwitcher'
import styles from './TopBar.module.css'

/**
 * TopBar
 * ------
 * Верхня панель: логотип HUD зліва, ThemeSwitcher справа.
 *
 * Props:
 * @prop {string} [title] — назва поточного екрану (опціонально)
 */
interface TopBarProps {
  title?: string
}

const TopBar: React.FC<TopBarProps> = ({ title }) => (
  <header className={styles.bar}>
    <div className={styles.left}>
      <h1 className={styles.logo}>HUD</h1>
      {title && <span className={styles.title}>{title}</span>}
    </div>
    <ThemeSwitcher />
  </header>
)

export default TopBar

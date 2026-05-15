import React from 'react'
import styles from './TopBar.module.css'

/**
 * TopBar
 * ------
 * Верхня панель з логотипом HUD.
 *
 * Props:
 * @prop {string} [title] — назва поточного екрану (опціонально)
 */
interface TopBarProps {
  title?: string
}

const TopBar: React.FC<TopBarProps> = ({ title }) => (
  <header className={styles.bar}>
    <h1 className={styles.logo}>HUD</h1>
    {title && <span className={styles.title}>{title}</span>}
  </header>
)

export default TopBar

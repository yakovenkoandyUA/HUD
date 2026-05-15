import React from 'react'
import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

/**
 * BottomNav
 * ---------
 * Нижня навігація між основними екранами.
 * Не приймає пропсів — використовує NavLink для активного стану.
 */
const NAV_ITEMS = [
  { to: '/',        label: 'HUD',     icon: '⊞' },
  { to: '/finance', label: 'Finance', icon: '₴' },
  { to: '/f1',      label: 'F1',      icon: '🏎' },
  { to: '/sprint',  label: 'Sprint',  icon: '◎' },
]

const BottomNav: React.FC = () => (
  <nav className={styles.nav}>
    {NAV_ITEMS.map(({ to, label, icon }) => (
      <NavLink
        key={to}
        to={to}
        end={to === '/'}
        className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
      >
        <span className={styles.icon}>{icon}</span>
        <span className={styles.label}>{label}</span>
      </NavLink>
    ))}
  </nav>
)

export default BottomNav

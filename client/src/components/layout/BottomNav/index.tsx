import React, { useState } from 'react'
import { NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import styles from './BottomNav.module.css'
import DashboardIcon from '../../../assets/icons/nav/dashboard.svg?react'
import WalletIcon    from '../../../assets/icons/nav/wallet.svg?react'
import F1Icon        from '../../../assets/icons/nav/F1.svg?react'
import SprintIcon    from '../../../assets/icons/nav/sprint.svg?react'
import RecipeIcon    from '../../../assets/icons/nav/recipe.svg?react'
import WatchIcon     from '../../../assets/icons/nav/watch.svg?react'
import MemoriesIcon  from '../../../assets/icons/nav/memories.svg?react'
import { useProfileStore } from '../../../store/profileStore'

type ProfileTab = 'me' | 'wallet' | 'family' | 'plan' | 'admin'

const PROFILE_TABS: { id: ProfileTab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { id: 'me', label: 'Я', icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="7" r="4"/><path d="M3 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
  { id: 'wallet', label: 'Гаманець', icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="18" height="13" rx="2"/><path d="M2 10h18"/><circle cx="16" cy="15" r="1.2" fill="currentColor" stroke="none"/><path d="M6 3l10 0" strokeWidth="1.3"/></svg> },
  { id: 'family', label: "Сім'я", icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="7" r="3"/><circle cx="15" cy="8" r="2.5"/><path d="M1 20c0-3.5 3-6 7-6s7 2.5 7 6"/><path d="M15.5 14c2.5 0 5 1.5 5 5"/></svg> },
  { id: 'plan', label: 'План', icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2L13.5 8H20L14.5 12L16.5 18.5L11 15L5.5 18.5L7.5 12L2 8H8.5L11 2Z"/></svg> },
  { id: 'admin', label: 'Адмін', adminOnly: true, icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="3"/><path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.93 4.93l1.41 1.41M15.66 15.66l1.41 1.41M4.93 17.07l1.41-1.41M15.66 6.34l1.41-1.41"/></svg> },
]

// Arc positions for secondary pills (relative to hub button center, pill is centered on each point)
// 4 items (no F1): symmetric 4-point fan
// 5 items (F1 enabled): symmetric 5-point fan
const ARC_POSITIONS_4 = [
  { x: -100, y: -130 },
  { x:  -38, y: -188 },
  { x:   38, y: -188 },
  { x:  100, y: -130 },
]
const ARC_POSITIONS_5 = [
  { x: -108, y: -110 },
  { x:  -60, y: -175 },
  { x:    0, y: -198 },
  { x:   60, y: -175 },
  { x:  108, y: -110 },
]

/**
 * BottomNav
 * ---------
 * Floating pill with 4 pinned icons + central MIMIR hub button.
 * Hub tap → secondary section pills radiate around the close button.
 * On /profile → full-width labeled tab bar.
 */
const BottomNav: React.FC = () => {
  const { activeProfile } = useProfileStore()
  const f1Enabled = activeProfile?.f1Enabled ?? false
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [hubOpen, setHubOpen] = useState(false)

  const isProfile = pathname === '/profile'

  const handleHubNav = (to: string) => {
    setHubOpen(false)
    navigate(to)
  }

  if (isProfile) {
    const activeTab = (searchParams.get('tab') as ProfileTab | null) ?? 'me'
    const isAdmin = activeProfile?.role === 'admin'
    const visibleTabs = PROFILE_TABS.filter(t => !t.adminOnly || isAdmin)
    return (
      <nav className={`${styles.nav} ${styles.navProfile}`}>
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.item} ${styles.profileItem} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => navigate(`/profile?tab=${tab.id}`, { replace: true })}
          >
            <span className={styles.icon}>{tab.icon}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </nav>
    )
  }

  // Secondary sections not shown in main pill
  const secondarySections = [
    { to: '/recipes',  label: 'Рецепти', Icon: RecipeIcon,   active: pathname === '/recipes'   },
    { to: '/memories', label: 'Спогади', Icon: MemoriesIcon, active: pathname === '/memories'  },
    ...(f1Enabled ? [{ to: '/f1', label: 'F1', Icon: F1Icon, active: pathname.startsWith('/f1') }] : []),
    { to: '/profile',  label: 'Профіль', Icon: () => (
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="7" r="4"/><path d="M3 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ), active: false },
  ]

  return (
    <>
      {/* Backdrop */}
      {hubOpen && (
        <div className={styles.backdrop} onClick={() => setHubOpen(false)} />
      )}

      {/* Radial pills — positioned relative to hub button center */}
      <div className={styles.pillsAnchor}>
        {secondarySections.map((s, i) => {
          const arcPos = secondarySections.length <= 4 ? ARC_POSITIONS_4 : ARC_POSITIONS_5
          const pos = arcPos[i] ?? arcPos[arcPos.length - 1]
          return (
            <button
              key={s.to}
              type="button"
              className={`${styles.pill} ${hubOpen ? styles.pillVisible : ''} ${s.active ? styles.pillActive : ''}`}
              style={{
                '--px': `${pos.x}px`,
                '--py': `${pos.y}px`,
                transitionDelay: hubOpen ? `${i * 35}ms` : `${(secondarySections.length - 1 - i) * 25}ms`,
              } as React.CSSProperties}
              onClick={() => handleHubNav(s.to)}
            >
              <span className={styles.pillIcon}><s.Icon /></span>
              <span className={styles.pillLabel}>{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* Main pill nav */}
      <nav className={styles.nav}>
        <NavLink to="/" end className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
          <DashboardIcon className={styles.icon} />
        </NavLink>

        <NavLink to="/finance" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
          <WalletIcon className={styles.icon} />
        </NavLink>

        <button
          type="button"
          className={`${styles.hubBtn} ${hubOpen ? styles.hubBtnOpen : ''}`}
          onClick={() => setHubOpen(o => !o)}
          aria-label="Всі розділи"
        >
          {hubOpen ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          ) : (
            <span className={styles.hubBtnLetter}>M</span>
          )}
        </button>

        <NavLink to="/sprint" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
          <SprintIcon className={styles.icon} />
        </NavLink>

        <NavLink to="/watchlist" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
          <WatchIcon className={styles.icon} />
        </NavLink>
      </nav>
    </>
  )
}

export default BottomNav

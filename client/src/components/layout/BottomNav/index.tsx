import React from 'react'
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

/** Profile section tabs — order must match tab IDs */
type ProfileTab = 'me' | 'wallet' | 'family'

const PROFILE_TABS: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'me',
    label: 'Я',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="7" r="4"/>
        <path d="M3 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
  },
  {
    id: 'wallet',
    label: 'Гаманець',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="18" height="13" rx="2"/>
        <path d="M2 10h18"/>
        <circle cx="16" cy="15" r="1.2" fill="currentColor" stroke="none"/>
        <path d="M6 3l10 0" strokeWidth="1.3"/>
      </svg>
    ),
  },
  {
    id: 'family',
    label: "Сім'я",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="7" r="3"/>
        <circle cx="15" cy="8" r="2.5"/>
        <path d="M1 20c0-3.5 3-6 7-6s7 2.5 7 6"/>
        <path d="M15.5 14c2.5 0 5 1.5 5 5"/>
      </svg>
    ),
  },
]

/**
 * BottomNav
 * ---------
 * Нижня навігація між основними екранами.
 * На /profile автоматично перемикається на 4-вкладковий профільний режим.
 * F1 іконка відображається тільки якщо f1Enabled у профілі.
 */
const BottomNav: React.FC = () => {
  const { activeProfile } = useProfileStore()
  const f1Enabled = activeProfile?.f1Enabled ?? false
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const isProfile = pathname === '/profile'

  if (isProfile) {
    const activeTab = (searchParams.get('tab') as ProfileTab | null) ?? 'me'
    return (
      <nav className={styles.nav}>
        {PROFILE_TABS.map(tab => (
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

  return (
    <nav className={styles.nav}>
      <NavLink to="/" end className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <DashboardIcon className={styles.icon} />
      </NavLink>

      <NavLink to="/finance" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <WalletIcon className={styles.icon} />
      </NavLink>

      {f1Enabled && (
        <NavLink to="/f1" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
          <F1Icon className={styles.icon} />
        </NavLink>
      )}

      <NavLink to="/sprint" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <SprintIcon className={styles.icon} />
      </NavLink>

      <NavLink to="/recipes" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <RecipeIcon className={styles.icon} />
      </NavLink>

      <NavLink to="/watchlist" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <WatchIcon className={styles.icon} />
      </NavLink>

      <NavLink to="/memories" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <MemoriesIcon className={styles.icon} />
      </NavLink>
    </nav>
  )
}

export default BottomNav

import React from 'react'
import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'
import DashboardIcon from '../../../../public/icons/nav/dashboard.svg?react'
import WalletIcon    from '../../../../public/icons/nav/wallet.svg?react'
import F1Icon        from '../../../../public/icons/nav/F1.svg?react'
import SprintIcon    from '../../../../public/icons/nav/sprint.svg?react'
import RecipeIcon    from '../../../../public/icons/nav/recipe.svg?react'
import WatchIcon     from '../../../../public/icons/nav/watch.svg?react'
import MemoriesIcon  from '../../../../public/icons/nav/memories.svg?react'
import { useProfileStore } from '../../../store/profileStore'

/**
 * BottomNav
 * ---------
 * Нижня навігація між основними екранами.
 * F1 іконка відображається тільки якщо f1Enabled у профілі.
 */
const BottomNav: React.FC = () => {
  const { activeProfile } = useProfileStore()
  const f1Enabled = activeProfile?.f1Enabled ?? false

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

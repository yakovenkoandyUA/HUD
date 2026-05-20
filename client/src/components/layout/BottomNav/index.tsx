import React from 'react'
import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'
import DashboardIcon from '../../../../public/icons/nav/dashboard.svg?react'
import WalletIcon from '../../../../public/icons/nav/wallet.svg?react'
import F1Icon from '../../../../public/icons/nav/F1.svg?react'
import SprintIcon from '../../../../public/icons/nav/sprint.svg?react'
import RecipeIcon from '../../../../public/icons/nav/recipe.svg?react'
import WatchIcon from '../../../../public/icons/nav/watch.svg?react'

/**
 * BottomNav
 * ---------
 * Нижня навігація між основними екранами.
 * Не приймає пропсів — використовує NavLink для активного стану.
 * Іконки — SVG компоненти через vite-plugin-svgr.
 */
const NAV_ITEMS = [
  { to: '/',          Icon: DashboardIcon },
  { to: '/finance',   Icon: WalletIcon    },
  { to: '/f1',        Icon: F1Icon        },
  { to: '/sprint',    Icon: SprintIcon    },
  { to: '/recipes',   Icon: RecipeIcon    },
  { to: '/watchlist', Icon: WatchIcon     },
]

const BottomNav: React.FC = () => (
  <nav className={styles.nav}>
    {NAV_ITEMS.map(({ to, Icon }) => (
      <NavLink
        key={to}
        to={to}
        end={to === '/'}
        className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
      >
        <Icon className={styles.icon} />
      </NavLink>
    ))}
  </nav>
)

export default BottomNav

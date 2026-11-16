import React, { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import styles from './BottomNav.module.css'
import DashboardIcon from '@/assets/icons/nav/dashboard.svg?react'
import WalletIcon    from '@/assets/icons/nav/wallet.svg?react'
import SportIcon     from '@/assets/icons/nav/sport.svg?react'
import SprintIcon    from '@/assets/icons/nav/sprint.svg?react'
import RecipeIcon    from '@/assets/icons/nav/recipe.svg?react'
import WatchIcon     from '@/assets/icons/nav/watch.svg?react'
import MemoriesIcon  from '@/assets/icons/nav/memories.svg?react'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'

export interface NavSection {
  to: string
  label: string
  Icon: React.ComponentType<{ className?: string }>
  requiresSport?: boolean
}

export const ALL_NAV_SECTIONS: NavSection[] = [
  { to: '/',          label: 'Головна', Icon: DashboardIcon },
  { to: '/finance',   label: 'Фінанси', Icon: WalletIcon },
  { to: '/sprint',    label: 'Квести',  Icon: SprintIcon },
  { to: '/watchlist', label: 'Медіа',   Icon: WatchIcon },
  { to: '/recipes',   label: 'Рецепти', Icon: RecipeIcon },
  { to: '/memories',  label: 'Спогади', Icon: MemoriesIcon },
  { to: '/f1',        label: 'Спорт',   Icon: SportIcon, requiresSport: true },
]

// Arc positions for secondary pills (relative to hub button center)
const ARC_POSITIONS_3 = [
  { x: -90, y:  -88 },
  { x:   0, y: -145 },
  { x:  90, y:  -88 },
]
const ARC_POSITIONS_4 = [
  { x: -108, y:  -82 },
  { x:  -45, y: -138 },
  { x:   45, y: -138 },
  { x:  108, y:  -82 },
]
const ARC_POSITIONS_5 = [
  { x: -108, y:  -72 },
  { x:  -62, y: -128 },
  { x:    0, y: -148 },
  { x:   62, y: -128 },
  { x:  108, y:  -72 },
]

/** Ansuz rune ᚨ — Odin's rune of wisdom (Mimir connection). Flips 180° when hub opens. */
function AnsuzRune({ flipped }: { flipped: boolean }) {
  return (
    <svg
      width="22" height="22" viewBox="0 0 22 22" fill="none"
      className={`${styles.ansuzRune} ${flipped ? styles.ansuzFlipped : ''}`}
    >
      {/* Vertical stem */}
      <line x1="8" y1="2.5" x2="8" y2="19.5"
            stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
      {/* Upper branch */}
      <line x1="8" y1="6" x2="16" y2="10.5"
            stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
      {/* Lower branch */}
      <line x1="8" y1="12" x2="16" y2="16.5"
            stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
    </svg>
  )
}

/**
 * BottomNav
 * ---------
 * Supports 3 nav styles (from uiStore.navStyle):
 * - 'classic'  — full-width bottom bar with icon + label for all sections
 * - 'pill'     — floating pill with pinned sections as icons only
 * - 'hub'      — floating pill + Mimir's eye hub button that opens radial secondary pills
 *
 * On /profile the bar is hidden.
 */
const BottomNav: React.FC = () => {
  const { activeProfile } = useProfileStore()
  const { navStyle, navLabelMode, pinnedSections, modalDepth } = useUiStore()
  const sportEnabled = (activeProfile?.f1Enabled ?? false) || (activeProfile?.footballEnabled ?? false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [hubOpen, setHubOpen] = useState(false)

  React.useEffect(() => {
    document.body.classList.toggle('hub-open', hubOpen)
    return () => { document.body.classList.remove('hub-open') }
  }, [hubOpen])

  React.useEffect(() => {
    document.body.dataset.navStyle = navStyle
  }, [navStyle])

  if (modalDepth > 0) return null
  if (pathname.startsWith('/drinks')) return null

  // /profile is a plain page without bottom navigation (other sections live in ProfileDrawer)
  if (pathname === '/profile') return null

  // All sections available for this user
  const availableSections = ALL_NAV_SECTIONS.filter(s => !s.requiresSport || sportEnabled)

  // Pinned sections (ordered by ALL_NAV_SECTIONS order, filtered to available)
  const pinnedAvailable = availableSections.filter(s => pinnedSections.includes(s.to))

  // Dashboard in center when count is odd (5/7); left when even (6 — no true center)
  const dashSection = availableSections.find(s => s.to === '/')
  const rest        = availableSections.filter(s => s.to !== '/')
  const isOdd       = availableSections.length % 2 === 1
  const half        = Math.ceil(rest.length / 2)

  const orderedSections: NavSection[] = dashSection && isOdd
    ? [...rest.slice(0, half), dashSection, ...rest.slice(half)]
    : availableSections

  // ── Classic style ─────────────────────────────────────────────
  if (navStyle === 'classic') {
    const classicLink = (s: NavSection) => (
      <NavLink
        key={s.to}
        to={s.to}
        end={s.to === '/'}
        className={({ isActive }) =>
          `${styles.classicItem} ${isActive ? styles.active : ''}`
        }
      >
        {({ isActive }) => (
          <>
            <s.Icon className={styles.icon} />
            {(navLabelMode === 'always' || (navLabelMode === 'active' && isActive)) && (
              <span className={styles.classicLabel}>{s.label}</span>
            )}
          </>
        )}
      </NavLink>
    )
    return (
      <nav className={`${styles.nav} ${styles.navClassic}`}>
        {orderedSections.map(classicLink)}
      </nav>
    )
  }

  // ── Pill style ────────────────────────────────────────────────
  if (navStyle === 'pill') {
    const pillLink = (s: NavSection) => (
      <NavLink
        key={s.to}
        to={s.to}
        end={s.to === '/'}
        className={({ isActive }) => {
          const showLabel = navLabelMode === 'always' || (navLabelMode === 'active' && isActive)
          return `${styles.item} ${isActive ? styles.active : ''} ${showLabel ? styles.itemWithLabel : ''}`
        }}
      >
        {({ isActive }) => {
          const showLabel = navLabelMode === 'always' || (navLabelMode === 'active' && isActive)
          return (
            <>
              <s.Icon className={styles.icon} />
              {showLabel && <span className={styles.navItemLabel}>{s.label}</span>}
            </>
          )
        }}
      </NavLink>
    )

    const allLabelsClass = navLabelMode === 'always' ? styles.navAllLabels : ''
    return (
      <nav className={`${styles.nav} ${allLabelsClass}`}>
        {orderedSections.map(pillLink)}
      </nav>
    )
  }

  // ── Hub style (default) ───────────────────────────────────────
  const secondarySections = availableSections.filter(s => !pinnedSections.includes(s.to))

  return (
    <>
      {/* Backdrop */}
      {hubOpen && (
        <div className={styles.backdrop} onClick={() => setHubOpen(false)} />
      )}

      {/* Radial pills */}
      <div className={styles.pillsAnchor}>
        {secondarySections.map((s, i) => {
          const arcPos = secondarySections.length <= 3 ? ARC_POSITIONS_3
                       : secondarySections.length === 4 ? ARC_POSITIONS_4
                       : ARC_POSITIONS_5
          const pos = arcPos[i] ?? arcPos[arcPos.length - 1]
          const isActive = s.to === '/' ? pathname === '/' : pathname.startsWith(s.to)
          return (
            <button
              key={s.to}
              type="button"
              className={`${styles.pill} ${hubOpen ? styles.pillVisible : ''} ${isActive ? styles.pillActive : ''}`}
              style={{
                '--px': `${pos.x}px`,
                '--py': `${pos.y}px`,
                transitionDelay: hubOpen ? `${i * 35}ms` : `${(secondarySections.length - 1 - i) * 25}ms`,
              } as React.CSSProperties}
              onClick={() => { setHubOpen(false); navigate(s.to) }}
            >
              <span className={styles.pillIcon}><s.Icon /></span>
              <span className={styles.pillLabel}>{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* Main pill nav */}
      <nav className={styles.nav}>
        {pinnedAvailable.slice(0, 2).map(s => (
          <NavLink
            key={s.to}
            to={s.to}
            end={s.to === '/'}
            className={({ isActive }) =>
              `${styles.item} ${isActive ? styles.active : ''} ${isActive && navLabelMode !== 'never' ? styles.itemWithLabel : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <s.Icon className={styles.icon} />
                {isActive && navLabelMode !== 'never' && <span className={styles.navItemLabel}>{s.label}</span>}
              </>
            )}
          </NavLink>
        ))}

        <button
          type="button"
          className={`${styles.hubBtn} ${hubOpen ? styles.hubBtnOpen : ''}`}
          onClick={() => setHubOpen(o => !o)}
          aria-label="Всі розділи"
        >
          <AnsuzRune flipped={hubOpen} />
        </button>

        {pinnedAvailable.slice(2, 4).map(s => (
          <NavLink
            key={s.to}
            to={s.to}
            end={s.to === '/'}
            className={({ isActive }) =>
              `${styles.item} ${isActive ? styles.active : ''} ${isActive && navLabelMode !== 'never' ? styles.itemWithLabel : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <s.Icon className={styles.icon} />
                {isActive && navLabelMode !== 'never' && <span className={styles.navItemLabel}>{s.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  )
}

export default BottomNav

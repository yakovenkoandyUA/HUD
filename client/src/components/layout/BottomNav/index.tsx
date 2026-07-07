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
import { useUiStore } from '../../../store/uiStore'

type ProfileTab = 'me' | 'wallet' | 'plan' | 'timeline' | 'spaces' | 'admin'

const PROFILE_TABS: { id: ProfileTab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { id: 'me',       label: 'Профіль',     icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="7" r="4"/><path d="M3 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
  { id: 'wallet',   label: 'Гаманець',    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="18" height="13" rx="2"/><path d="M2 10h18"/><circle cx="16" cy="15" r="1.2" fill="currentColor" stroke="none"/><path d="M6 3l10 0" strokeWidth="1.3"/></svg> },
  { id: 'plan',     label: 'Тарифи',      icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2L13.5 8H20L14.5 12L16.5 18.5L11 15L5.5 18.5L7.5 12L2 8H8.5L11 2Z"/></svg> },
  { id: 'timeline', label: 'Хроніка',     icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M11 6.5V11l3.5 2"/></svg> },
  { id: 'spaces',   label: 'Простори',    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="8" height="8" rx="1.5"/><rect x="12" y="2" width="8" height="8" rx="1.5"/><rect x="2" y="12" width="8" height="8" rx="1.5"/><rect x="12" y="12" width="8" height="8" rx="1.5"/></svg> },
  { id: 'admin',    label: 'Адмін',       adminOnly: true, icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="3"/><path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.93 4.93l1.41 1.41M15.66 15.66l1.41 1.41M4.93 17.07l1.41-1.41M15.66 6.34l1.41-1.41"/></svg> },
]

export interface NavSection {
  to: string
  label: string
  Icon: React.ComponentType<{ className?: string }>
  requiresF1?: boolean
}

export const ALL_NAV_SECTIONS: NavSection[] = [
  { to: '/',          label: 'Головна', Icon: DashboardIcon },
  { to: '/finance',   label: 'Фінанси', Icon: WalletIcon },
  { to: '/sprint',    label: 'Спринт',  Icon: SprintIcon },
  { to: '/watchlist', label: 'Медіа',   Icon: WatchIcon },
  { to: '/recipes',   label: 'Рецепти', Icon: RecipeIcon },
  { to: '/memories',  label: 'Спогади', Icon: MemoriesIcon },
  { to: '/f1',        label: 'F1',      Icon: F1Icon, requiresF1: true },
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
 * On /profile → full-width labeled tab bar (always, regardless of style).
 */
const BottomNav: React.FC = () => {
  const { activeProfile } = useProfileStore()
  const { navStyle, navLabelMode, pinnedSections } = useUiStore()
  const f1Enabled = activeProfile?.f1Enabled ?? false
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [hubOpen, setHubOpen] = useState(false)

  React.useEffect(() => {
    document.body.classList.toggle('hub-open', hubOpen)
    return () => { document.body.classList.remove('hub-open') }
  }, [hubOpen])

  React.useEffect(() => {
    document.body.dataset.navStyle = navStyle
  }, [navStyle])

  const isProfile = pathname === '/profile'

  // All sections available for this user
  const availableSections = ALL_NAV_SECTIONS.filter(s => !s.requiresF1 || f1Enabled)

  // Pinned sections (ordered by ALL_NAV_SECTIONS order, filtered to available)
  const pinnedAvailable = availableSections.filter(s => pinnedSections.includes(s.to))

  // ── Profile mode — respects navStyle for consistency (live preview when changing style) ──
  if (isProfile) {
    const activeTab = (searchParams.get('tab') as ProfileTab | null) ?? 'me'
    const isAdmin = activeProfile?.role === 'admin'
    const visibleTabs = PROFILE_TABS.filter(t => !t.adminOnly || isAdmin)

    const profilePillItem = (tab: typeof PROFILE_TABS[number]) => {
      const isActive = activeTab === tab.id
      const showLabel = navLabelMode !== 'never' && isActive
      return (
        <button
          key={tab.id}
          type="button"
          className={`${styles.item} ${isActive ? styles.active : ''} ${showLabel ? styles.itemWithLabel : ''}`}
          onClick={() => navigate(`/profile?tab=${tab.id}`, { replace: true })}
        >
          <span className={styles.icon}>{tab.icon}</span>
          {showLabel && <span className={styles.navItemLabel}>{tab.label}</span>}
        </button>
      )
    }

    const profileClassicItem = (tab: typeof PROFILE_TABS[number]) => {
      const isActive = activeTab === tab.id
      const showLabel = navLabelMode === 'always' || (navLabelMode === 'active' && isActive)
      return (
        <button
          key={tab.id}
          type="button"
          className={`${styles.item} ${styles.profileItem} ${isActive ? styles.active : ''} ${isActive && navLabelMode !== 'never' ? styles.itemWithLabel : ''}`}
          onClick={() => navigate(`/profile?tab=${tab.id}`, { replace: true })}
        >
          <span className={styles.icon}>{tab.icon}</span>
          {showLabel && <span className={styles.tabLabel}>{tab.label}</span>}
        </button>
      )
    }

    // Classic → full-width tab bar
    if (navStyle === 'classic') {
      return (
        <nav className={`${styles.nav} ${styles.navProfile}`}>
          {visibleTabs.map(profileClassicItem)}
        </nav>
      )
    }

    // Pill → floating pill, all profile tabs
    if (navStyle === 'pill') {
      return (
        <nav className={styles.nav}>
          {visibleTabs.map(profilePillItem)}
        </nav>
      )
    }

    // Hub → floating pill with Ansuz hub button; first 4 tabs in pill, rest in radial
    const pinnedProfileTabs  = visibleTabs.slice(0, 4)
    const radialProfileTabs  = visibleTabs.slice(4)
    const arcPos = radialProfileTabs.length <= 3 ? ARC_POSITIONS_3
                 : radialProfileTabs.length === 4 ? ARC_POSITIONS_4
                 : ARC_POSITIONS_5

    return (
      <>
        {hubOpen && <div className={styles.backdrop} onClick={() => setHubOpen(false)} />}

        <div className={styles.pillsAnchor}>
          {radialProfileTabs.map((tab, i) => {
            const pos = arcPos[i] ?? arcPos[arcPos.length - 1]
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                className={`${styles.pill} ${hubOpen ? styles.pillVisible : ''} ${isActive ? styles.pillActive : ''}`}
                style={{
                  '--px': `${pos.x}px`,
                  '--py': `${pos.y}px`,
                  transitionDelay: hubOpen ? `${i * 35}ms` : `${(radialProfileTabs.length - 1 - i) * 25}ms`,
                } as React.CSSProperties}
                onClick={() => { setHubOpen(false); navigate(`/profile?tab=${tab.id}`, { replace: true }) }}
              >
                <span className={styles.pillIcon}>{tab.icon}</span>
                <span className={styles.pillLabel}>{tab.label}</span>
              </button>
            )
          })}
        </div>

        <nav className={styles.nav}>
          {pinnedProfileTabs.slice(0, 2).map(profilePillItem)}
          <button
            type="button"
            className={`${styles.hubBtn} ${hubOpen ? styles.hubBtnOpen : ''}`}
            onClick={() => setHubOpen(o => !o)}
            aria-label="Всі розділи профілю"
          >
            <AnsuzRune flipped={hubOpen} />
          </button>
          {pinnedProfileTabs.slice(2, 4).map(profilePillItem)}
        </nav>
      </>
    )
  }

  // ── Classic style ─────────────────────────────────────────────
  if (navStyle === 'classic') {
    return (
      <nav className={`${styles.nav} ${styles.navClassic}`}>
        {availableSections.map(s => (
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
        ))}
      </nav>
    )
  }

  // ── Pill style ────────────────────────────────────────────────
  // Завжди всі доступні розділи (максимум 7), без налаштування — Dashboard
  // в центрі ряду тільки коли загальна кількість непарна (5/7 — є справжній
  // центр); інакше (6 — типовий випадок без F1) Dashboard зліва, бо немає
  // парного центру і "зліва" найпередбачуваніше для головного розділу.
  if (navStyle === 'pill') {
    const pillLink = (s: NavSection) => (
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
    )

    const dashSection = availableSections.find(s => s.to === '/')
    const rest = availableSections.filter(s => s.to !== '/')
    const isOdd = availableSections.length % 2 === 1

    if (!isOdd) {
      return (
        <nav className={styles.nav}>
          {dashSection && pillLink(dashSection)}
          {rest.map(pillLink)}
        </nav>
      )
    }

    const half = Math.ceil(rest.length / 2)
    return (
      <nav className={styles.nav}>
        {rest.slice(0, half).map(pillLink)}
        {dashSection && pillLink(dashSection)}
        {rest.slice(half).map(pillLink)}
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

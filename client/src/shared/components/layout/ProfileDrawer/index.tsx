import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '@/shared/store/profileStore'
import { useFamilyStore } from '@/shared/store/familyStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useRuneScore } from '@/features/achievements/hooks/useAchievementProgress'
import { getLevel } from '@/features/achievements/levels'
import ChangelogSheet from '@/features/profile/components/ChangelogSheet'
import styles from './ProfileDrawer.module.css'

/**
 * ProfileDrawer
 * -------------
 * Slide-in panel from the left, triggered by the avatar in AppHeader.
 * Shows user info + plan badge + navigation to profile sub-sections + logout.
 *
 * Props:
 * @prop {boolean}    isOpen  — whether the drawer is open
 * @prop {() => void} onClose — close callback
 */
interface ProfileDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ isOpen, onClose }) => {
  const { activeProfile, logout } = useProfileStore()
  const { pendingReceived } = useFamilyStore()
  const { updateAvailable } = useUiStore()
  const navigate = useNavigate()
  const runeScore = useRuneScore()
  const level = getLevel(runeScore)

  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [changelogOpen, setChangelogOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 340)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // Swipe left to close
  const startXRef = useRef<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => { startXRef.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startXRef.current === null) return
    const delta = startXRef.current - e.changedTouches[0].clientX
    if (delta > 60) onClose()
    startXRef.current = null
  }

  const go = (to: string) => { onClose(); navigate(to) }
  const handleLogout = () => {
    onClose()
    logout()
    navigate('/login', { replace: true })
  }

  if (!mounted || !activeProfile) return null

  const isPro = activeProfile.plan && activeProfile.plan !== 'free'
  const planLabel = isPro ? 'PRO' : 'FREE'
  const isAdmin = activeProfile.role === 'admin'
  const familyPending = pendingReceived.length

  return (
    <div
      className={`${styles.overlay} ${visible ? styles.overlayVisible : ''}`}
      onClick={onClose}
    >
      <div
        className={`${styles.drawer} ${visible ? styles.drawerVisible : ''}`}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* ── User header ── */}
        <div className={styles.header}>
          {activeProfile.avatarUrl ? (
            <img
              src={activeProfile.avatarUrl}
              alt={activeProfile.name}
              className={styles.avatar}
              style={{ borderColor: level.color }}
            />
          ) : (
            <div className={styles.avatarFallback} style={{ borderColor: level.color }}>
              {activeProfile.name[0].toUpperCase()}
            </div>
          )}
          <div className={styles.userInfo}>
            <span className={styles.userName}>{activeProfile.name}</span>
            <span className={styles.userHandle}>@{activeProfile.username}</span>
          </div>
          <span className={`${styles.planBadge} ${isPro ? styles.planBadgePro : ''}`}>
            {planLabel}
          </span>
        </div>

        <div className={styles.divider} />

        {/* ── Nav items ── */}
        <nav className={styles.nav}>
          <DrawerItem
            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 1.5a7.5 7.5 0 1 0 0 15c1 0 1.6-.7 1.6-1.5 0-.4-.15-.76-.38-1.04-.22-.27-.37-.6-.37-.96 0-.76.62-1.38 1.4-1.38h1.75A3.5 3.5 0 0 0 16.5 8c0-3.5-3.4-6.5-7.5-6.5z"/><circle cx="5.5" cy="7.5" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="7.5" r="1" fill="currentColor" stroke="none"/></svg>}
            label="Вигляд"
            sub="Теми, стиль навігації"
            onClick={() => go('/profile/appearance')}
          />
          <DrawerItem
            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="2.5"/><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.9 3.9l1.4 1.4M12.7 12.7l1.4 1.4M3.9 14.1l1.4-1.4M12.7 5.3l1.4-1.4"/></svg>}
            label="Система"
            sub="Місто, F1, сповіщення, безпека"
            onClick={() => go('/profile/system')}
          />
          <DrawerItem
            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="1.5" width="6.5" height="6.5" rx="1.5"/><rect x="10" y="1.5" width="6.5" height="6.5" rx="1.5"/><rect x="1.5" y="10" width="6.5" height="6.5" rx="1.5"/><rect x="10" y="10" width="6.5" height="6.5" rx="1.5"/></svg>}
            label="Модулі"
            sub="Медіа, спорт та інше"
            onClick={() => go('/profile/modules')}
          />
          <DrawerItem
            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="6.5" cy="6" r="2.5"/><path d="M2 17c0-2.8 2-4.5 4.5-4.5S11 14.2 11 17"/><circle cx="13" cy="6.5" r="2"/><path d="M11.5 12.5c.4-.1.9-.2 1.5-.2 2 0 3.5 1.4 3.5 3.7"/></svg>}
            label="Близькі"
            sub="Запити, учасники"
            badge={familyPending > 0 ? familyPending : undefined}
            onClick={() => go('/profile/family')}
          />
          <DrawerItem
            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="14" height="11" rx="2"/><path d="M5 4V3a2 2 0 0 1 4 0v1M5 9h8M5 12h5"/></svg>}
            label="Тариф"
            sub="Підписка, ліміти"
            onClick={() => go('/profile?tab=plan')}
          />
          {isAdmin && (
            <DrawerItem
              icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 1L2 5v4c0 4.2 3 7.7 7 9 4-1.3 7-4.8 7-9V5L9 1z"/></svg>}
              label="Адмін"
              sub="Користувачі, плани"
              onClick={() => go('/profile/admin')}
            />
          )}
          <DrawerItem
            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="2.2"/><path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.1 3.1l1.4 1.4M13.5 13.5l1.4 1.4M3.1 14.9l1.4-1.4M13.5 4.5l1.4-1.4"/><circle cx="9" cy="9" r="5.5"/></svg>}
            label="Акаунт"
            sub="Дані, юридичне, небезпечна зона"
            onClick={() => go('/profile/account')}
          />
          {updateAvailable && (
            <button type="button" className={styles.updateRow} onClick={() => setChangelogOpen(true)}>
              <span className={styles.updateDot} />
              <span className={styles.updateText}>Доступне оновлення</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 3l4 4-4 4"/>
              </svg>
            </button>
          )}
        </nav>
        <ChangelogSheet isOpen={changelogOpen} onClose={() => setChangelogOpen(false)} />

        <div className={styles.spacer} />
        <div className={styles.divider} />

        {/* ── Logout ── */}
        <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.5 3h2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2"/>
            <path d="M7 11l3-3-3-3M10 8H2.5"/>
          </svg>
          Вийти
        </button>
      </div>
    </div>
  )
}

// ── Internal nav item ────────────────────────────────────────────────────────

interface DrawerItemProps {
  icon: React.ReactNode
  label: string
  sub: string
  badge?: number
  onClick: () => void
}

const DrawerItem: React.FC<DrawerItemProps> = ({ icon, label, sub, badge, onClick }) => (
  <button type="button" className={styles.navItem} onClick={onClick}>
    <span className={styles.navIcon}>{icon}</span>
    <span className={styles.navText}>
      <span className={styles.navLabel}>{label}</span>
      <span className={styles.navSub}>{sub}</span>
    </span>
    {badge != null && (
      <span className={styles.navBadge}>{badge}</span>
    )}
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 3l4 4-4 4"/>
    </svg>
  </button>
)

export default ProfileDrawer

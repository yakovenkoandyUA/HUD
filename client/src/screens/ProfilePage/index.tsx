import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useProfileStore } from '../../store/profileStore'
import { useFamilyStore } from '../../store/familyStore'
import MeTab from './MeTab'
import WalletTab from './WalletTab'
import PlanTab from './PlanTab'
import AdminTab from './AdminTab'
import styles from './ProfilePage.module.css'

type ProfileTab = 'me' | 'wallet' | 'plan' | 'admin'

/**
 * ProfilePage
 * -----------
 * Сторінка налаштувань профілю з 3 вкладками через ?tab= query param.
 * BottomNav на /profile перемикається в профільний режим і drive-ить вкладки.
 *
 * Props: none
 */
const ProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { activeProfile, logout } = useProfileStore()
  const { fetchFamily } = useFamilyStore()

  const activeTab = (searchParams.get('tab') as ProfileTab | null) ?? 'me'

  useEffect(() => { fetchFamily() }, [fetchFamily])

  if (!activeProfile) return null

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12.5 16L7 10l5.5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className={styles.headerTitle}>ПРОФІЛЬ</span>
        <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M12 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M8 12l3-3-3-3M11 9H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* ── Tab content (with bottom nav padding) ── */}
      <div className={styles.content}>
        <div key={activeTab} className={styles.tabFade}>
          {activeTab === 'me'     && <MeTab />}
          {activeTab === 'wallet' && <WalletTab />}
          {activeTab === 'plan'   && <PlanTab />}
          {activeTab === 'admin' && activeProfile.role === 'admin' && <AdminTab />}
        </div>
      </div>
    </div>
  )
}

export default ProfilePage

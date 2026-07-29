import React from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './ProfilePage.module.css'

/**
 * ProfileSubPage
 * --------------
 * Thin layout wrapper for profile sub-screens (/profile/appearance, /system, etc.).
 * Reuses ProfilePage header styles: back button + title, no logout button.
 *
 * Props:
 * @prop {string}    title      — page title shown in header (uppercase)
 * @prop {ReactNode} children   — page content
 * @prop {boolean}   [fullBleed] — skip `.content` padding/gap so children can fill edge-to-edge
 *                                 (e.g. a full-height background photo like MeLevels)
 */
interface ProfileSubPageProps {
  title: string
  children: ReactNode
  fullBleed?: boolean
}

const ProfileSubPage: React.FC<ProfileSubPageProps> = ({ title, children, fullBleed }) => {
  const navigate = useNavigate()
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12.5 16L7 10l5.5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className={styles.headerTitle}>{title}</span>
        <span className={styles.headerSpacer} />
      </div>
      <div className={fullBleed ? styles.contentFullBleed : styles.content}>
        {children}
      </div>
    </div>
  )
}

export default ProfileSubPage

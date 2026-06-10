import React, { useState } from 'react'
import { useProfileStore } from '../../../store/profileStore'
import { useUiStore } from '../../../store/uiStore'
import styles from './VerificationBanner.module.css'

/**
 * VerificationBanner
 * ------------------
 * Sticky strip shown below AppHeader when user email is not verified.
 * Dismissible per-session. Shows resend button.
 */
const VerificationBanner: React.FC = () => {
  const { activeProfile, resendVerification } = useProfileStore()
  const { showToast } = useUiStore()
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!activeProfile?.email || activeProfile.isVerified || dismissed) return null

  const handleResend = async () => {
    if (loading) return
    setLoading(true)
    try {
      await resendVerification()
      showToast('Лист відправлено', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Помилка', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.banner}>
      <svg className={styles.icon} viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 4a1 1 0 110 2 1 1 0 010-2zm.75 8.25h-1.5v-5h1.5v5z"
          fill="currentColor" />
      </svg>
      <span className={styles.text}>
        Підтвердіть email <strong>{activeProfile.email}</strong>
      </span>
      <button
        type="button"
        className={styles.resendBtn}
        onClick={handleResend}
        disabled={loading}
      >
        {loading ? '...' : 'Надіслати ще'}
      </button>
      <button
        type="button"
        className={styles.closeBtn}
        onClick={() => setDismissed(true)}
        aria-label="Закрити"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden>
          <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

export default VerificationBanner

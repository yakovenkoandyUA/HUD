import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useProfileStore } from '@/shared/store/profileStore'
import styles from './VerifyEmail.module.css'

/**
 * VerifyEmail
 * -----------
 * Landing page for /verify?token=...
 * Calls verifyEmailToken, then redirects home on success.
 */
const VerifyEmail: React.FC = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { verifyEmailToken, activeProfile } = useProfileStore()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const token = params.get('token')
      if (!token) {
        if (!cancelled) { setStatus('error'); setErrMsg('Відсутній токен верифікації') }
        return
      }
      try {
        await verifyEmailToken(token)
        if (!cancelled) setStatus('success')
        setTimeout(() => navigate('/', { replace: true }), 2500)
      } catch (e) {
        if (!cancelled) {
          setStatus('error')
          setErrMsg(e instanceof Error ? e.message : 'Помилка верифікації')
        }
      }
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        {status === 'loading' && (
          <>
            <div className={styles.spinner} />
            <p className={styles.text}>Перевіряємо...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <svg className={styles.iconSuccess} viewBox="0 0 48 48" fill="none" aria-hidden>
              <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" />
              <path d="M14 24l7 7 13-14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className={styles.title}>Email підтверджено!</p>
            <p className={styles.text}>
              {activeProfile?.name ? `Ласкаво просимо, ${activeProfile.name}!` : 'Ласкаво просимо!'}
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <svg className={styles.iconError} viewBox="0 0 48 48" fill="none" aria-hidden>
              <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" />
              <path d="M16 16l16 16M32 16L16 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <p className={styles.title}>Помилка</p>
            <p className={styles.text}>{errMsg}</p>
            <button type="button" className={styles.btn} onClick={() => navigate('/', { replace: true })}>
              На головну
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default VerifyEmail

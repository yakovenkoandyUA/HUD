import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useProfileStore } from '../../store/profileStore'
import { getBillingOrderStatus } from '../../services/billing'
import type { BillingOrderStatus } from '../../services/billing'
import styles from './PaymentResult.module.css'

const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 10

/**
 * PaymentResult
 * -------------
 * Landing page after WayForPay redirects user back from the payment page.
 * Polls /api/billing/order/:orderReference/status until paid/failed/timeout.
 * Does NOT activate plan — that happens via verified server-to-server callback.
 */
const PaymentResult: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate        = useNavigate()
  const { fetchProfiles } = useProfileStore()

  const orderReference = searchParams.get('orderReference')

  type UIState = 'pending' | 'paid' | 'failed' | 'timeout' | 'noref'
  const [uiState, setUiState]   = useState<UIState>(orderReference ? 'pending' : 'noref')
  const [attempts, setAttempts] = useState(0)
  const cancelledRef            = useRef(false)

  useEffect(() => {
    if (!orderReference) return
    cancelledRef.current = false
    let attempt = 0

    const poll = async () => {
      if (cancelledRef.current) return

      try {
        const data = await getBillingOrderStatus(orderReference)
        const status: BillingOrderStatus = data.status

        if (cancelledRef.current) return

        if (status === 'paid') {
          await fetchProfiles()
          if (!cancelledRef.current) setUiState('paid')
          return
        }

        if (status === 'failed' || status === 'refunded' || status === 'expired') {
          if (!cancelledRef.current) setUiState('failed')
          return
        }

        // pending — continue polling
        attempt++
        if (!cancelledRef.current) setAttempts(attempt)

        if (attempt >= POLL_MAX_ATTEMPTS) {
          if (!cancelledRef.current) setUiState('timeout')
          return
        }

        setTimeout(poll, POLL_INTERVAL_MS)
      } catch {
        attempt++
        if (!cancelledRef.current) setAttempts(attempt)
        if (attempt >= POLL_MAX_ATTEMPTS) {
          if (!cancelledRef.current) setUiState('timeout')
          return
        }
        setTimeout(poll, POLL_INTERVAL_MS)
      }
    }

    void poll()
    return () => { cancelledRef.current = true }
  }, [orderReference, fetchProfiles])

  const dotsCount = (attempts % 3) + 1
  const dots = '.'.repeat(dotsCount)

  return (
    <div className={styles.root}>
      <div className={styles.card}>

        {uiState === 'pending' && (
          <>
            <span className={styles.iconPending} aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="var(--accent)" strokeWidth="2.5" strokeDasharray="6 4" className={styles.spinCircle}/>
                <path d="M24 14v10l6 6" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <h1 className={styles.title}>Очікуємо підтвердження{dots}</h1>
            <p className={styles.sub}>Банк обробляє платіж. Зазвичай це займає декілька секунд.</p>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${Math.min((attempts / POLL_MAX_ATTEMPTS) * 100, 95)}%` }}
              />
            </div>
          </>
        )}

        {uiState === 'paid' && (
          <>
            <span className={styles.iconSuccess} aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" fill="color-mix(in srgb, var(--accent) 15%, transparent)" stroke="var(--accent)" strokeWidth="2.5"/>
                <path d="M15 24l7 7 11-13" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <h1 className={styles.title}>Оплату підтверджено</h1>
            <p className={styles.sub}>Ваш план активовано. Криниця відкрита.</p>
            <button
              type="button"
              className={styles.ctaBtn}
              onClick={() => navigate('/profile?tab=plan')}
            >
              Переглянути план
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => navigate('/')}
            >
              На головну
            </button>
          </>
        )}

        {uiState === 'failed' && (
          <>
            <span className={styles.iconFailed} aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="var(--error, #e05)" strokeWidth="2.5"/>
                <path d="M17 17l14 14M31 17L17 31" stroke="var(--error, #e05)" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </span>
            <h1 className={styles.title}>Платіж не пройшов</h1>
            <p className={styles.sub}>Спробуйте ще раз або зверніться до банку. Кошти не було списано.</p>
            <button
              type="button"
              className={styles.ctaBtn}
              onClick={() => navigate('/profile?tab=plan')}
            >
              Спробувати ще раз
            </button>
          </>
        )}

        {uiState === 'timeout' && (
          <>
            <span className={styles.iconPending} aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="var(--text3)" strokeWidth="2.5"/>
                <path d="M24 14v10l6 6" stroke="var(--text3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <h1 className={styles.title}>Платіж обробляється</h1>
            <p className={styles.sub}>Підтвердження ще не надійшло. Оновіть сторінку через хвилину або перевірте план у профілі.</p>
            <button
              type="button"
              className={styles.ctaBtn}
              onClick={() => window.location.reload()}
            >
              Оновити
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => navigate('/profile?tab=plan')}
            >
              Перейти до плану
            </button>
          </>
        )}

        {uiState === 'noref' && (
          <>
            <h1 className={styles.title}>Невідомий платіж</h1>
            <p className={styles.sub}>Відсутній ідентифікатор замовлення. Перевірте план у профілі.</p>
            <button
              type="button"
              className={styles.ctaBtn}
              onClick={() => navigate('/profile?tab=plan')}
            >
              До профілю
            </button>
          </>
        )}

      </div>
    </div>
  )
}

export default PaymentResult

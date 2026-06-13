import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useProfileStore } from '../../store/profileStore'
import styles from './Login.module.css'

const BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').trim()
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''

/**
 * LoginScreen
 * -----------
 * Email + password login. Google Sign-In через GIS (renderButton).
 * Після успіху редіректить на головну.
 */
const LoginScreen: React.FC = () => {
  const navigate = useNavigate()
  const { loginWithEmail } = useProfileStore()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const googleBtnRef = useRef<HTMLDivElement>(null)

  // ── Google Sign-In ─────────────────────────────────────────────────────────

  const handleGoogleCredential = useCallback(async (response: GoogleCredentialResponse) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Google auth failed')
      }
      const { token, user } = await res.json() as { token: string; user: { id: string; name: string; username: string; email?: string; avatarUrl: string | null; role: 'admin' | 'user'; f1Enabled: boolean; salaryDay: number; hasPIN: boolean; isVerified: boolean; city: string; morningStart: number; afternoonStart: number; eveningStart: number } }
      useProfileStore.setState({ token, activeProfile: user, pinLocked: false })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка Google входу')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtnRef.current) return

    const initGoogle = () => {
      if (!window.google || !googleBtnRef.current) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      })
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        width: 288,
        text: 'signin_with',
      })
    }

    // GIS script may already be loaded or still loading
    if (window.google) {
      initGoogle()
    } else {
      const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
      if (existing) {
        existing.addEventListener('load', initGoogle, { once: true })
      }
    }
  }, [handleGoogleCredential])

  // ── Email login ────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError(null)
    try {
      await loginWithEmail(email.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка входу')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <span className={`${styles.corner} ${styles.tl}`} />
        <span className={`${styles.corner} ${styles.tr}`} />
        <span className={`${styles.corner} ${styles.bl}`} />
        <span className={`${styles.corner} ${styles.br}`} />

        <div className={styles.header}>
          <h1 className={styles.title}>MIMIR</h1>
          <p className={styles.subtitle}>HEADS UP DISPLAY</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputWrap}>
            <input
              className={styles.input}
              type="email"
              placeholder="EMAIL"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          <div className={styles.inputWrap}>
            <input
              className={styles.input}
              type="password"
              placeholder="ПАРОЛЬ"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            className={styles.button}
            type="submit"
            disabled={loading || !email.trim() || !password}
          >
            {loading ? '▪▪▪' : 'УВІЙТИ'}
          </button>
        </form>

        <div className={styles.divider}>
          <span className={styles.dividerText}>або</span>
        </div>

        {/* Google Sign-In button rendered by GIS */}
        <div className={styles.googleWrap}>
          <div ref={googleBtnRef} className={styles.googleBtn} />
        </div>

        <p className={styles.footer}>
          Ще немає акаунту?{' '}
          <Link to="/register" className={styles.link}>Зареєструватись</Link>
        </p>
      </div>
    </div>
  )
}

export default LoginScreen

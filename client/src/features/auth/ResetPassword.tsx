import React, { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useProfileStore } from '@/shared/store/profileStore'
import PasswordToggleButton from '@/shared/components/ui/PasswordToggleButton'
import styles from './ResetPassword.module.css'

/**
 * ResetPasswordScreen
 * --------------------
 * Landing page for /reset-password?token=...
 * Приймає новий пароль, відправляє токен на бекенд, автологінить при успіху.
 */
const ResetPasswordScreen: React.FC = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { resetPasswordWithToken } = useProfileStore()
  const token = params.get('token')

  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [status, setStatus]   = useState<'form' | 'success'>('form')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setError('Відсутній токен відновлення')
      return
    }
    if (newPassword.length < 6) {
      setError('Пароль мінімум 6 символів')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Паролі не співпадають')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await resetPasswordWithToken(token, newPassword)
      setStatus('success')
      setTimeout(() => navigate('/', { replace: true }), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка відновлення пароля')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        {status === 'success' ? (
          <>
            <svg className={styles.iconSuccess} viewBox="0 0 48 48" fill="none" aria-hidden>
              <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" />
              <path d="M14 24l7 7 13-14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className={styles.title}>Пароль оновлено!</p>
            <p className={styles.text}>Заходимо в акаунт...</p>
          </>
        ) : !token ? (
          <>
            <svg className={styles.iconError} viewBox="0 0 48 48" fill="none" aria-hidden>
              <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" />
              <path d="M16 16l16 16M32 16L16 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <p className={styles.title}>Невалідне посилання</p>
            <p className={styles.text}>Токен відновлення відсутній або пошкоджений.</p>
            <Link to="/forgot-password" className={styles.btn}>Запросити нове посилання</Link>
          </>
        ) : (
          <>
            <p className={styles.title}>Новий пароль</p>
            <p className={styles.text}>Вкажіть новий пароль для вашого акаунту MIMIR.</p>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.inputWrap}>
                <input
                  className={`${styles.input} ${styles.passwordInput}`}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="НОВИЙ ПАРОЛЬ"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoFocus
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />
                <PasswordToggleButton visible={showPassword} onToggle={() => setShowPassword(v => !v)} />
              </div>

              <div className={styles.inputWrap}>
                <input
                  className={styles.input}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="ПІДТВЕРДЬТЕ ПАРОЛЬ"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button
                className={styles.btn}
                type="submit"
                disabled={loading || newPassword.length < 6 || !confirmPassword}
              >
                {loading ? '▪▪▪' : 'ЗБЕРЕГТИ ПАРОЛЬ'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default ResetPasswordScreen

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProfileStore } from '@/shared/store/profileStore'
import styles from './ForgotPassword.module.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/

/**
 * ForgotPasswordScreen
 * ---------------------
 * Форма запиту на відновлення пароля за email.
 * Завжди показує однакове повідомлення про успіх — щоб не розкривати,
 * чи існує акаунт із цим email.
 */
const ForgotPasswordScreen: React.FC = () => {
  const { requestPasswordReset } = useProfileStore()

  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [sent, setSent]       = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    if (!EMAIL_RE.test(email.trim())) {
      setError('Невірний формат email')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка відправки листа')
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
          <p className={styles.subtitle}>
            {sent
              ? 'Перевірте пошту — якщо акаунт з таким email існує, ми надіслали посилання для відновлення пароля.'
              : 'Вкажіть email, прив\'язаний до акаунту — надішлемо посилання для скидання пароля.'}
          </p>
        </div>

        {!sent && (
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

            {error && <p className={styles.error}>{error}</p>}

            <button
              className={styles.button}
              type="submit"
              disabled={loading || !email.trim()}
            >
              {loading ? '▪▪▪' : 'НАДІСЛАТИ ПОСИЛАННЯ'}
            </button>
          </form>
        )}

        <p className={styles.footer}>
          <Link to="/login" className={styles.link}>← Повернутись до входу</Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPasswordScreen

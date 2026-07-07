import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useProfileStore } from '../../store/profileStore'
import MimirFillIcon from '../../components/ui/MimirFillIcon'
import PasswordToggleButton from '../../components/ui/PasswordToggleButton'
import styles from './Register.module.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_RE = /^[a-z0-9_]{3,20}$/

/**
 * RegisterScreen
 * --------------
 * Реєстрація нового акаунту. Якщо username вже існує але без пароля
 * (Котька / Коська) — прив'язує email+пароль до існуючого профілю.
 */
const RegisterScreen: React.FC = () => {
  const navigate = useNavigate()
  const { register } = useProfileStore()

  const [name, setName]         = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !username.trim() || !email.trim() || !password) return
    if (!EMAIL_RE.test(email.trim())) {
      setError('Невірний формат email')
      return
    }
    if (!USERNAME_RE.test(username.trim())) {
      setError('Нікнейм: 3-20 символів, тільки латиниця, цифри і "_"')
      return
    }
    if (password.length < 6) {
      setError('Пароль мінімум 6 символів')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await register(email.trim(), password, name.trim(), username.trim())
      navigate('/onboarding', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка реєстрації')
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
          <MimirFillIcon
            size={88}
            progress={[
              name.trim().length > 0,
              username.trim().length > 0,
              email.trim().length > 0,
              password.length >= 6,
            ].filter(Boolean).length / 4}
          />
          <h1 className={styles.title}>MIMIR</h1>
          <p className={styles.subtitle}>РЕЄСТРАЦІЯ</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.row}>
            <div className={styles.inputWrap}>
              <label className={styles.label}>ІМ'Я</label>
              <input
                className={styles.input}
                type="text"
                placeholder="Андрій"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                autoComplete="name"
                disabled={loading}
                required
              />
            </div>
            <div className={styles.inputWrap}>
              <label className={styles.label}>НІКНЕЙМ</label>
              <input
                className={styles.input}
                type="text"
                placeholder="andriy"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                autoComplete="username"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className={styles.inputWrap}>
            <label className={styles.label}>EMAIL</label>
            <input
              className={styles.input}
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          <div className={styles.inputWrap}>
            <label className={styles.label}>ПАРОЛЬ</label>
            <div className={styles.passwordFieldWrap}>
              <input
                className={styles.input}
                type={showPassword ? 'text' : 'password'}
                placeholder="мінімум 6 символів"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
                required
              />
              <PasswordToggleButton visible={showPassword} onToggle={() => setShowPassword(v => !v)} />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            className={styles.button}
            type="submit"
            disabled={loading || !name.trim() || !username.trim() || !email.trim() || password.length < 6}
          >
            {loading ? '▪▪▪' : 'ЗАРЕЄСТРУВАТИСЬ'}
          </button>
        </form>

        <p className={styles.hint}>
          Якщо твій нікнейм вже є в системі — введи його і встанови email+пароль для свого акаунту.
        </p>

        <p className={styles.footer}>
          Вже є акаунт?{' '}
          <Link to="/login" className={styles.link}>Увійти</Link>
        </p>

        <p className={styles.legalFooter}>
          <Link to="/terms" className={styles.legalLink}>Умови</Link>
          <span className={styles.legalSep}>·</span>
          <Link to="/privacy" className={styles.legalLink}>Конфіденційність</Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterScreen

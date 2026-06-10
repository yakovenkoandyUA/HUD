import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useProfileStore } from '../../store/profileStore'
import styles from './Register.module.css'

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
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !username.trim() || !email.trim() || !password) return
    if (password.length < 6) {
      setError('Пароль мінімум 6 символів')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await register(email.trim(), password, name.trim(), username.trim())
      navigate('/', { replace: true })
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
                placeholder="Котька"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                autoComplete="name"
                disabled={loading}
                required
              />
            </div>
            <div className={styles.inputWrap}>
              <label className={styles.label}>ЛОГІН</label>
              <input
                className={styles.input}
                type="text"
                placeholder="kotkа"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
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
            <input
              className={styles.input}
              type="password"
              placeholder="мінімум 6 символів"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
              required
            />
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
          Якщо твій логін (Котька / Коська) вже є в системі — введи його і встанови email+пароль для свого акаунту.
        </p>

        <p className={styles.footer}>
          Вже є акаунт?{' '}
          <Link to="/login" className={styles.link}>Увійти</Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterScreen

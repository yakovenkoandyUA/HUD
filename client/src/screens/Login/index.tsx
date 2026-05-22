import React, { useState } from 'react'
import styles from './Login.module.css'

/**
 * LoginScreen
 * -----------
 * Full-screen HUD-themed auth gate. Single password input.
 *
 * Props:
 * @prop {(password: string) => Promise<boolean>} onLogin — login handler from parent
 * @prop {boolean}      loading — request in-flight
 * @prop {string|null}  error   — error message to display
 */
interface LoginScreenProps {
  onLogin: (password: string) => Promise<boolean>
  loading?: boolean
  error?: string | null
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, loading = false, error }) => {
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onLogin(password)
  }

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <span className={`${styles.corner} ${styles.tl}`} />
        <span className={`${styles.corner} ${styles.tr}`} />
        <span className={`${styles.corner} ${styles.bl}`} />
        <span className={`${styles.corner} ${styles.br}`} />

        <div className={styles.header}>
          <h1 className={styles.title}>HUD</h1>
          <p className={styles.subtitle}>HEADS UP DISPLAY</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputWrap}>
            <input
              className={styles.input}
              type="password"
              placeholder="ПАРОЛЬ"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            className={styles.button}
            type="submit"
            disabled={loading || !password.trim()}
          >
            {loading ? '▪▪▪' : 'УВІЙТИ'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginScreen

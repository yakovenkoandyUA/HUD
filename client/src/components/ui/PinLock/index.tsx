import React, { useState, useCallback } from 'react'
import { useProfileStore } from '../../../store/profileStore'
import styles from './PinLock.module.css'

const PIN_LENGTH = 4

/**
 * PinLock
 * -------
 * Fullscreen PIN overlay після 5 хв бездіяльності.
 * Пін-пад 0–9, видалення, 4 dot-індикатор.
 * Верифікація через POST /auth/pin/verify.
 * "Вийти" → logout (крайній випадок).
 *
 * Props: none — зчитує стан з profileStore.
 */
const PinLock: React.FC = () => {
  const { activeProfile, verifyPIN, unlockPIN, logout } = useProfileStore()

  const [pin, setPin]       = useState('')
  const [error, setError]   = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDigit = useCallback((digit: string) => {
    if (pin.length >= PIN_LENGTH || loading) return
    const next = pin + digit
    setPin(next)
    setError(false)
    if (next.length === PIN_LENGTH) {
      verify(next)
    }
  }, [pin, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = useCallback(() => {
    if (loading) return
    setPin(p => p.slice(0, -1))
    setError(false)
  }, [loading])

  const verify = async (p: string) => {
    setLoading(true)
    const ok = await verifyPIN(p)
    if (ok) {
      unlockPIN()
    } else {
      setError(true)
      setPin('')
    }
    setLoading(false)
  }

  const initials = activeProfile?.name?.[0]?.toUpperCase() ?? '?'

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        {/* Profile avatar */}
        <div className={styles.avatar}>
          {activeProfile?.avatarUrl ? (
            <img src={activeProfile.avatarUrl} alt={activeProfile.name} className={styles.avatarImg} />
          ) : (
            <span className={styles.avatarInitial}>{initials}</span>
          )}
        </div>

        <p className={styles.name}>{activeProfile?.name}</p>
        <p className={styles.prompt}>Введи PIN-код</p>

        {/* 4-dot indicator */}
        <div className={styles.dots}>
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <span
              key={i}
              className={`${styles.dot} ${i < pin.length ? styles.dotFilled : ''} ${error ? styles.dotError : ''}`}
            />
          ))}
        </div>

        {error && <p className={styles.error}>Невірний PIN</p>}

        {/* Numpad */}
        <div className={styles.pad}>
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <button
              key={d}
              type="button"
              className={styles.padBtn}
              onClick={() => handleDigit(d)}
              disabled={loading}
            >
              {d}
            </button>
          ))}
          <div className={styles.padEmpty} />
          <button
            type="button"
            className={styles.padBtn}
            onClick={() => handleDigit('0')}
            disabled={loading}
          >
            0
          </button>
          <button
            type="button"
            className={`${styles.padBtn} ${styles.padDel}`}
            onClick={handleDelete}
            disabled={loading || pin.length === 0}
            aria-label="Видалити"
          >
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
              <path d="M7.5 1H19a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7.5L1 7l6.5-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M12 5l4 4M16 5l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <button type="button" className={styles.logoutBtn} onClick={logout}>
          Вийти
        </button>
      </div>
    </div>
  )
}

export default PinLock

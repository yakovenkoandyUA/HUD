import React, { useCallback, useState } from 'react'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import PasswordToggleButton from '@/shared/components/ui/PasswordToggleButton'
import styles from './ProfilePage.module.css'

/**
 * MeSecurity
 * ----------
 * Підекран "Безпека" вкладки "Я": зміна пароля + PIN-код.
 */
const MeSecurity: React.FC = () => {
  const { activeProfile, changePassword, setPIN, removePIN } = useProfileStore()
  const { showToast } = useUiStore()

  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew]         = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwError, setPwError]     = useState<string | null>(null)
  const [savingPw, setSavingPw]   = useState(false)
  const [showPw, setShowPw]       = useState(false)
  const [pwOpen, setPwOpen]       = useState(false)

  const [pinStep, setPinStep]       = useState<'idle' | 'enter' | 'confirm'>('idle')
  const [pinValue, setPinValue]     = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinError, setPinError]     = useState<string | null>(null)
  const [savingPin, setSavingPin]   = useState(false)

  const handlePasswordChange = useCallback(async () => {
    if (!pwCurrent || !pwNew) { setPwError('Заповніть всі поля'); return }
    if (pwNew !== pwConfirm)  { setPwError('Паролі не співпадають'); return }
    if (pwNew.length < 6)     { setPwError('Мінімум 6 символів'); return }
    setSavingPw(true)
    setPwError(null)
    try {
      await changePassword(pwCurrent, pwNew)
      showToast('Пароль змінено', 'success')
      setPwCurrent(''); setPwNew(''); setPwConfirm('')
      setPwOpen(false)
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setSavingPw(false)
    }
  }, [pwCurrent, pwNew, pwConfirm, changePassword, showToast])

  const handleSavePIN = useCallback(async (pin: string) => {
    setSavingPin(true)
    try {
      await setPIN(pin)
      showToast('PIN встановлено', 'success')
      setPinStep('idle'); setPinValue(''); setPinConfirm('')
    } catch {
      showToast('Помилка збереження PIN', 'error')
    } finally {
      setSavingPin(false)
    }
  }, [setPIN, showToast])

  const handlePinDigit = (digit: string) => {
    if (pinStep === 'enter') {
      const next = pinValue + digit
      if (next.length > 4) return
      setPinValue(next)
      setPinError(null)
      if (next.length === 4) setPinStep('confirm')
    } else if (pinStep === 'confirm') {
      const next = pinConfirm + digit
      if (next.length > 4) return
      setPinConfirm(next)
      setPinError(null)
      if (next.length === 4) {
        if (next !== pinValue) {
          setPinError('PIN не співпадає. Спробуй знову.')
          setPinValue(''); setPinConfirm(''); setPinStep('enter')
        } else {
          handleSavePIN(next)
        }
      }
    }
  }

  const handlePinDelete = () => {
    if (pinStep === 'enter') setPinValue(p => p.slice(0, -1))
    else setPinConfirm(p => p.slice(0, -1))
    setPinError(null)
  }

  const handleRemovePIN = async () => {
    setSavingPin(true)
    try {
      await removePIN()
      showToast('PIN видалено', 'success')
    } catch {
      showToast('Помилка видалення PIN', 'error')
    } finally {
      setSavingPin(false)
    }
  }

  if (!activeProfile) return null

  return (
    <>
      {activeProfile.email && (
        <>
          <div className={styles.cardRow}>
            <span className={styles.cardRowLabel}>Пароль</span>
            <button type="button" className={styles.sectionAction} onClick={() => setPwOpen(v => !v)}>
              {pwOpen ? 'Сховати' : 'Змінити'}
            </button>
          </div>
          <div className={`${styles.accordionBody} ${pwOpen ? styles.accordionBodyOpen : ''}`}>
            <div className={styles.pwForm}>
              <div className={styles.pwInputWrap}>
                <input type={showPw ? 'text' : 'password'} className={styles.pwInput} placeholder="Поточний пароль" value={pwCurrent} onChange={e => { setPwCurrent(e.target.value); setPwError(null) }} autoComplete="current-password" />
                <PasswordToggleButton visible={showPw} onToggle={() => setShowPw(v => !v)} />
              </div>
              <div className={styles.pwInputWrap}>
                <input type={showPw ? 'text' : 'password'} className={styles.pwInput} placeholder="Новий пароль (мін. 6 символів)" value={pwNew} onChange={e => { setPwNew(e.target.value); setPwError(null) }} autoComplete="new-password" />
                <PasswordToggleButton visible={showPw} onToggle={() => setShowPw(v => !v)} />
              </div>
              <div className={styles.pwInputWrap}>
                <input type={showPw ? 'text' : 'password'} className={styles.pwInput} placeholder="Підтвердь новий пароль" value={pwConfirm} onChange={e => { setPwConfirm(e.target.value); setPwError(null) }} autoComplete="new-password" />
                <PasswordToggleButton visible={showPw} onToggle={() => setShowPw(v => !v)} />
              </div>
              {pwError && <p className={styles.fieldError}>{pwError}</p>}
              <button type="button" className={styles.pwSaveBtn} onClick={handlePasswordChange} disabled={savingPw}>
                {savingPw ? 'Збереження...' : 'Змінити пароль'}
              </button>
            </div>
          </div>
          <div className={styles.cardDivider} />
        </>
      )}

      {pinStep === 'idle' ? (
        <div className={styles.cardRow}>
          <div>
            <div className={styles.cardRowLabel}>PIN-код</div>
            <div className={styles.pushSub}>
              {activeProfile.hasPIN ? 'Блокування через 5 хв' : 'Захист додатку'}
            </div>
          </div>
          <div className={styles.pinActions}>
            <button type="button" className={styles.pinBtn} onClick={() => { setPinStep('enter'); setPinValue(''); setPinConfirm(''); setPinError(null) }}>
              {activeProfile.hasPIN ? 'Змінити' : 'Встановити'}
            </button>
            {activeProfile.hasPIN && (
              <button type="button" className={`${styles.pinBtn} ${styles.pinBtnDanger}`} onClick={handleRemovePIN} disabled={savingPin}>
                Видалити
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.cardPadded}>
          <div className={styles.pinSetup}>
            <p className={styles.pinSetupLabel}>{pinStep === 'enter' ? 'Введи новий PIN' : 'Підтвердь PIN'}</p>
            <div className={styles.pinDots}>
              {Array.from({ length: 4 }, (_, i) => {
                const filled = pinStep === 'enter' ? i < pinValue.length : i < pinConfirm.length
                return <span key={i} className={`${styles.pinDot} ${filled ? styles.pinDotFilled : ''}`} />
              })}
            </div>
            {pinError && <p className={styles.pinError}>{pinError}</p>}
            <div className={styles.pinPad}>
              {['1','2','3','4','5','6','7','8','9'].map(d => (
                <button key={d} type="button" className={styles.pinPadBtn} onClick={() => handlePinDigit(d)} disabled={savingPin}>{d}</button>
              ))}
              <div />
              <button type="button" className={styles.pinPadBtn} onClick={() => handlePinDigit('0')} disabled={savingPin}>0</button>
              <button type="button" className={`${styles.pinPadBtn} ${styles.pinPadDel}`} onClick={handlePinDelete}>
                <svg width="16" height="11" viewBox="0 0 20 14" fill="none"><path d="M7.5 1H19a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7.5L1 7l6.5-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M12 5l4 4M16 5l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <button type="button" className={styles.pinCancelBtn} onClick={() => { setPinStep('idle'); setPinValue(''); setPinConfirm('') }}>
              Скасувати
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default MeSecurity

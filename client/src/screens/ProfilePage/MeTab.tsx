import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useProfileStore } from '../../store/profileStore'
import { useUiStore } from '../../store/uiStore'
import { uploadToCloudinary } from '../../utils/uploadToCloudinary'
import styles from './ProfilePage.module.css'

const CameraIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M1.5 5.5C1.5 4.672 2.172 4 3 4h1.646L6 2h6l1.354 2H15c.828 0 1.5.672 1.5 1.5v9c0 .828-.672 1.5-1.5 1.5H3c-.828 0-1.5-.672-1.5-1.5v-9z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <circle cx="9" cy="9.5" r="2.2" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
)

const CheckIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

/**
 * MeTab
 * -----
 * Вкладка "Я" — аватар, ім'я, username, зміна пароля, PIN.
 */
const MeTab: React.FC = () => {
  const { activeProfile, updateProfile, changePassword, setPIN, removePIN } = useProfileStore()
  const { showToast } = useUiStore()

  // Avatar
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Name
  const nameRef = useRef<HTMLInputElement>(null)
  const [nameInput, setNameInput]       = useState(activeProfile?.name ?? '')
  const [editingName, setEditingName]   = useState(false)
  const [savingName, setSavingName]     = useState(false)

  // Username
  const usernameRef = useRef<HTMLInputElement>(null)
  const [usernameInput, setUsernameInput]     = useState(activeProfile?.username ?? '')
  const [editingUsername, setEditingUsername] = useState(false)
  const [savingUsername, setSavingUsername]   = useState(false)

  // Password
  const [pwCurrent, setPwCurrent]   = useState('')
  const [pwNew, setPwNew]           = useState('')
  const [pwConfirm, setPwConfirm]   = useState('')
  const [pwError, setPwError]       = useState<string | null>(null)
  const [savingPw, setSavingPw]     = useState(false)
  const [pwOpen, setPwOpen]         = useState(false)

  // PIN
  const [pinStep, setPinStep]     = useState<'idle' | 'enter' | 'confirm'>('idle')
  const [pinValue, setPinValue]   = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinError, setPinError]   = useState<string | null>(null)
  const [savingPin, setSavingPin] = useState(false)

  useEffect(() => { if (editingName) nameRef.current?.focus() }, [editingName])
  useEffect(() => { if (editingUsername) usernameRef.current?.focus() }, [editingUsername])

  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (fileRef.current) fileRef.current.value = ''
    setUploadingAvatar(true)
    try {
      const url = await uploadToCloudinary(file, 'mimir/avatars')
      await updateProfile({ avatarUrl: url })
      showToast('Аватар оновлено', 'success')
    } catch {
      showToast('Помилка завантаження', 'error')
    } finally {
      setUploadingAvatar(false)
    }
  }, [updateProfile, showToast])

  const saveName = useCallback(async () => {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === activeProfile?.name) { setEditingName(false); return }
    setSavingName(true)
    try {
      await updateProfile({ name: trimmed })
      showToast("Ім'я оновлено", 'success')
    } catch {
      showToast('Помилка збереження', 'error')
      setNameInput(activeProfile?.name ?? '')
    } finally {
      setSavingName(false)
      setEditingName(false)
    }
  }, [nameInput, activeProfile?.name, updateProfile, showToast])

  const saveUsername = useCallback(async () => {
    const trimmed = usernameInput.trim().toLowerCase()
    if (!trimmed || trimmed === activeProfile?.username) { setEditingUsername(false); return }
    setSavingUsername(true)
    try {
      await updateProfile({ username: trimmed })
      showToast('Нікнейм оновлено', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Помилка збереження', 'error')
      setUsernameInput(activeProfile?.username ?? '')
    } finally {
      setSavingUsername(false)
      setEditingUsername(false)
    }
  }, [usernameInput, activeProfile?.username, updateProfile, showToast])

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

  const handleSavePIN = async (pin: string) => {
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
    <div className={styles.tabContent}>
      {/* ── Avatar hero ── */}
      <div className={styles.hero}>
        <div className={styles.avatarWrap}>
          <button
            type="button"
            className={styles.avatarBtn}
            onClick={() => fileRef.current?.click()}
            disabled={uploadingAvatar}
            aria-label="Змінити аватар"
          >
            {activeProfile.avatarUrl ? (
              <img src={activeProfile.avatarUrl} alt={activeProfile.name} className={styles.avatarImg} />
            ) : (
              <span className={styles.avatarInitial}>{activeProfile.name[0].toUpperCase()}</span>
            )}
            <div className={styles.cameraOverlay}>
              {uploadingAvatar ? <div className={styles.spinner} /> : <CameraIcon />}
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className={styles.fileInput} onChange={handleAvatarChange} />
        </div>

        {editingName ? (
          <div className={styles.nameEditRow}>
            <input
              ref={nameRef}
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setNameInput(activeProfile.name); setEditingName(false) } }}
              className={styles.nameInput}
              maxLength={32}
              disabled={savingName}
            />
            <button type="button" className={styles.nameConfirmBtn} onClick={saveName} disabled={savingName}><CheckIcon /></button>
          </div>
        ) : (
          <button type="button" className={styles.nameBtn} onClick={() => { setNameInput(activeProfile.name); setEditingName(true) }}>
            {activeProfile.name}
            <span className={styles.namePencil}>✎</span>
          </button>
        )}

        {editingUsername ? (
          <div className={styles.usernameEditRow}>
            <span className={styles.usernameAt}>@</span>
            <input
              ref={usernameRef}
              type="text"
              value={usernameInput}
              onChange={e => setUsernameInput(e.target.value.toLowerCase())}
              onBlur={saveUsername}
              onKeyDown={e => { if (e.key === 'Enter') saveUsername(); if (e.key === 'Escape') { setUsernameInput(activeProfile.username); setEditingUsername(false) } }}
              className={styles.usernameInput}
              maxLength={30}
              disabled={savingUsername}
              autoCapitalize="none"
            />
            <button type="button" className={styles.nameConfirmBtn} onClick={saveUsername} disabled={savingUsername}><CheckIcon /></button>
          </div>
        ) : (
          <button type="button" className={styles.usernameBtn} onClick={() => { setUsernameInput(activeProfile.username); setEditingUsername(true) }}>
            @{activeProfile.username}
            <span className={styles.namePencil}>✎</span>
          </button>
        )}

        {activeProfile.email && (
          <span className={styles.emailLabel}>{activeProfile.email}</span>
        )}
      </div>

      {/* ── Password change ── */}
      {activeProfile.email && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>ПАРОЛЬ</span>
            <button type="button" className={styles.sectionAction} onClick={() => setPwOpen(v => !v)}>
              {pwOpen ? 'Сховати' : 'Змінити'}
            </button>
          </div>
          <div className={`${styles.accordionBody} ${pwOpen ? styles.accordionBodyOpen : ''}`}>
            <div className={styles.pwForm}>
              <input
                type="password"
                className={styles.pwInput}
                placeholder="Поточний пароль"
                value={pwCurrent}
                onChange={e => { setPwCurrent(e.target.value); setPwError(null) }}
                autoComplete="current-password"
              />
              <input
                type="password"
                className={styles.pwInput}
                placeholder="Новий пароль (мін. 6 символів)"
                value={pwNew}
                onChange={e => { setPwNew(e.target.value); setPwError(null) }}
                autoComplete="new-password"
              />
              <input
                type="password"
                className={styles.pwInput}
                placeholder="Підтвердь новий пароль"
                value={pwConfirm}
                onChange={e => { setPwConfirm(e.target.value); setPwError(null) }}
                autoComplete="new-password"
              />
              {pwError && <p className={styles.fieldError}>{pwError}</p>}
              <button
                type="button"
                className={styles.pwSaveBtn}
                onClick={handlePasswordChange}
                disabled={savingPw}
              >
                {savingPw ? 'Збереження...' : 'Змінити пароль'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── PIN ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>PIN-КОД</span>
          <span className={styles.sectionCount}>{activeProfile.hasPIN ? 'Встановлено' : 'Не встановлено'}</span>
        </div>
        {pinStep === 'idle' ? (
          <div className={styles.pinRow}>
            <p className={styles.pinHint}>
              {activeProfile.hasPIN
                ? 'Блокування після 5 хв бездіяльності.'
                : 'Встанови 4-значний PIN для захисту застосунку.'}
            </p>
            <div className={styles.pinActions}>
              <button
                type="button"
                className={styles.pinBtn}
                onClick={() => { setPinStep('enter'); setPinValue(''); setPinConfirm(''); setPinError(null) }}
              >
                {activeProfile.hasPIN ? 'Змінити PIN' : 'Встановити PIN'}
              </button>
              {activeProfile.hasPIN && (
                <button type="button" className={`${styles.pinBtn} ${styles.pinBtnDanger}`} onClick={handleRemovePIN} disabled={savingPin}>
                  Видалити PIN
                </button>
              )}
            </div>
          </div>
        ) : (
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
        )}
      </section>
    </div>
  )
}

export default MeTab

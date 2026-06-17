import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useProfileStore } from '../../store/profileStore'
import { useUiStore } from '../../store/uiStore'
import { usePushSubscription } from '../../hooks/usePushSubscription'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { clearApiCaches } from '../../utils/appCache'
import { uploadToCloudinary } from '../../utils/uploadToCloudinary'
import type { Theme } from '../../store/uiStore'
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

interface ThemePalette {
  id: Theme
  name: string
  bg: string
  surface: string
  border: string
  accent: string
  second: string
  gold: string
  text: string
}

const PALETTES: ThemePalette[] = [
  { id: 'velvet', name: 'VELVET', bg: '#0d0f1a', surface: '#1e2235', border: '#2e3450', accent: '#d4a017', second: '#6a4fc8', gold: '#d4a017', text: '#e8d5a0' },
  { id: 'japan',  name: 'JAPAN',  bg: '#F5F0EB', surface: '#EDE8E2', border: '#D5CEC5', accent: '#C8102E', second: '#1a1a1a', gold: '#8B7355',  text: '#1a1a1a' },
  { id: 'cyber',  name: 'CYBER',  bg: '#06080e', surface: '#131a2c', border: '#202c48', accent: '#ff2060', second: '#00d4ff', gold: '#f0a020',  text: '#d8eaf8' },
  { id: 'noir',   name: 'NOIR',   bg: '#080808', surface: '#1a1a1a', border: '#2a2a2a', accent: '#d0d0d0', second: '#606060', gold: '#c8c8c8',  text: '#ebebeb' },
  { id: 'pixel',  name: 'PIXEL',  bg: '#f4efe0', surface: '#faf6ea', border: '#c8bc94', accent: '#d42020', second: '#1848c8', gold: '#e8a020',  text: '#181028' },
  { id: 'arctic', name: 'ARCTIC', bg: '#1e2330', surface: '#313a4e', border: '#4a5570', accent: '#88c0d0', second: '#b48ead', gold: '#ebcb8b',  text: '#eceff4' },
]

/**
 * MeTab
 * -----
 * Вкладка "Я" — аватар, ім'я, username, пароль, PIN, тема, сповіщення,
 * налаштування дня, модулі та додаткові системні опції.
 */
const MeTab: React.FC = () => {
  const { activeProfile, updateProfile, changePassword, setPIN, removePIN } = useProfileStore()
  const { theme, setTheme, showToast, updateAvailable } = useUiStore()
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushSubscription()
  const { isInstallable, isIOS, promptInstall } = usePwaInstall()
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  const showInstall = !isStandalone && (isInstallable || isIOS)

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
  const [pinStep, setPinStep]       = useState<'idle' | 'enter' | 'confirm'>('idle')
  const [pinValue, setPinValue]     = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinError, setPinError]     = useState<string | null>(null)
  const [savingPin, setSavingPin]   = useState(false)

  // Push
  const [pushLoading, setPushLoading]       = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)

  // Cache
  const [cacheCleared, setCacheCleared] = useState(false)

  // My Day
  const [city, setCity] = useState(activeProfile?.city ?? '')
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { if (editingName) nameRef.current?.focus() }, [editingName])
  useEffect(() => { if (editingUsername) usernameRef.current?.focus() }, [editingUsername])

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      if (!isSupported) return
      if (!cancelled) setPermissionDenied(Notification.permission === 'denied')
    }
    check()
    return () => { cancelled = true }
  }, [isSupported])

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

  const handlePushToggle = async () => {
    if (pushLoading) return
    setPushLoading(true)
    try {
      if (isSubscribed) {
        await unsubscribe()
      } else {
        const granted = Notification.permission === 'granted'
          ? true
          : await Notification.requestPermission().then(p => p === 'granted')
        if (!granted) { setPermissionDenied(true); return }
        await subscribe()
      }
    } finally {
      setPushLoading(false)
    }
  }

  const handleCityChange = (value: string) => {
    setCity(value)
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current)
    cityDebounceRef.current = setTimeout(() => {
      updateProfile({ city: value.trim() })
    }, 800)
  }

  const handleTimeSlot = (field: 'morningStart' | 'afternoonStart' | 'eveningStart', value: number) => {
    updateProfile({ [field]: value })
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
              <input type="password" className={styles.pwInput} placeholder="Поточний пароль" value={pwCurrent} onChange={e => { setPwCurrent(e.target.value); setPwError(null) }} autoComplete="current-password" />
              <input type="password" className={styles.pwInput} placeholder="Новий пароль (мін. 6 символів)" value={pwNew} onChange={e => { setPwNew(e.target.value); setPwError(null) }} autoComplete="new-password" />
              <input type="password" className={styles.pwInput} placeholder="Підтвердь новий пароль" value={pwConfirm} onChange={e => { setPwConfirm(e.target.value); setPwError(null) }} autoComplete="new-password" />
              {pwError && <p className={styles.fieldError}>{pwError}</p>}
              <button type="button" className={styles.pwSaveBtn} onClick={handlePasswordChange} disabled={savingPw}>
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
              {activeProfile.hasPIN ? 'Блокування після 5 хв бездіяльності.' : 'Встанови 4-значний PIN для захисту застосунку.'}
            </p>
            <div className={styles.pinActions}>
              <button type="button" className={styles.pinBtn} onClick={() => { setPinStep('enter'); setPinValue(''); setPinConfirm(''); setPinError(null) }}>
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

      {/* ── Theme ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>ТЕМА</span>
        </div>
        <div className={styles.themeGrid}>
          {PALETTES.map(p => {
            const isActive = theme === p.id
            return (
              <button
                key={p.id}
                type="button"
                className={styles.themeCard}
                style={{
                  background: p.bg,
                  border: isActive ? `2px solid ${p.accent}` : `1.5px solid ${p.border}`,
                  boxShadow: isActive ? `0 0 16px ${p.accent}44` : 'none',
                }}
                onClick={() => setTheme(p.id)}
                aria-pressed={isActive}
              >
                <span className={styles.themeCardName} style={{ color: p.accent }}>{p.name}</span>
                <div className={styles.themeSwatches}>
                  <span className={styles.themeSwatch} style={{ background: p.accent }} />
                  <span className={styles.themeSwatch} style={{ background: p.second }} />
                  <span className={styles.themeSwatch} style={{ background: p.gold }} />
                  <span className={styles.themeSwatch} style={{ background: p.text, opacity: 0.7 }} />
                </div>
                <div className={styles.themePreview}>
                  <div className={styles.themePreviewBar} style={{ background: p.surface, border: `1px solid ${p.border}` }}>
                    <div className={styles.themePreviewDot} style={{ background: p.accent }} />
                    <div className={styles.themePreviewLine} style={{ background: p.text, opacity: 0.6 }} />
                    <div className={styles.themePreviewLine} style={{ background: p.text, opacity: 0.3, width: '40%' }} />
                  </div>
                  <div className={styles.themePreviewBar} style={{ background: p.surface, border: `1px solid ${p.border}` }}>
                    <div className={styles.themePreviewDot} style={{ background: p.second }} />
                    <div className={styles.themePreviewLine} style={{ background: p.text, opacity: 0.6 }} />
                    <div className={styles.themePreviewLine} style={{ background: p.text, opacity: 0.3, width: '55%' }} />
                  </div>
                </div>
                {isActive && <span className={styles.themeActiveTick} style={{ color: p.accent }}>✓</span>}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Push notifications ── */}
      {isSupported && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>СПОВІЩЕННЯ</span>
          </div>
          {permissionDenied ? (
            <p className={styles.sectionHint}>Дозвіл відхилено — увімкни в налаштуваннях браузера.</p>
          ) : (
            <div className={styles.pushRow}>
              <div className={styles.pushInfo}>
                <span className={styles.pushLabel}>Push-сповіщення</span>
                <span className={styles.pushSub}>Гонки, задачі, оновлення</span>
              </div>
              <button
                type="button"
                className={`${styles.toggle} ${isSubscribed ? styles.toggleOn : ''}`}
                onClick={handlePushToggle}
                disabled={pushLoading}
                aria-pressed={isSubscribed}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── My Day ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>МІЙ ДЕНЬ</span>
        </div>
        <div className={styles.fieldRow}>
          <label className={styles.fieldLabel}>Місто (погода)</label>
          <input
            className={styles.fieldInput}
            value={city}
            onChange={e => handleCityChange(e.target.value)}
            placeholder="Київ"
          />
        </div>
        <p className={styles.sectionHint} style={{ marginTop: 12 }}>Часові межі секцій</p>
        {([
          { key: 'morningStart',   label: 'Ранок починається о' },
          { key: 'afternoonStart', label: 'День починається о' },
          { key: 'eveningStart',   label: 'Вечір починається о' },
        ] as const).map(({ key, label }) => (
          <div key={key} className={styles.slotRow}>
            <span className={styles.slotLabel}>{label}</span>
            <div className={styles.slotStepper}>
              <button type="button" className={styles.stepperBtn} onClick={() => handleTimeSlot(key, Math.max(0, (activeProfile[key] ?? 6) - 1))}>−</button>
              <span className={styles.stepperVal}>{String(activeProfile[key] ?? 0).padStart(2, '0')}:00</span>
              <button type="button" className={styles.stepperBtn} onClick={() => handleTimeSlot(key, Math.min(23, (activeProfile[key] ?? 6) + 1))}>+</button>
            </div>
          </div>
        ))}
      </section>

      {/* ── Modules ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>МОДУЛІ</span>
        </div>
        <div className={styles.settingRow}>
          <div className={styles.pushInfo}>
            <span className={styles.pushLabel}>F1 модуль</span>
            <span className={styles.pushSub}>Календар, стендінги, прогнози гонок</span>
          </div>
          <button
            type="button"
            className={`${styles.toggle} ${activeProfile.f1Enabled ? styles.toggleOn : ''}`}
            onClick={() => updateProfile({ f1Enabled: !(activeProfile.f1Enabled ?? false) })}
            aria-label="Увімкнути F1 модуль"
            aria-pressed={activeProfile.f1Enabled ?? false}
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>
      </section>

      {/* ── Additional ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>ДОДАТКОВО</span>
        </div>

        {updateAvailable && (
          <div className={styles.settingRow}>
            <span className={styles.pushLabel}>Доступне оновлення</span>
            <button type="button" className={styles.pinBtn} onClick={() => window.location.reload()}>
              ОНОВИТИ
            </button>
          </div>
        )}

        {showInstall && (
          isIOS ? (
            <p className={styles.sectionHint}>
              Натисніть <strong>⎙ Share</strong> → <strong>«Додати на початковий екран»</strong> щоб встановити MIMIR як додаток.
            </p>
          ) : (
            <div className={styles.settingRow}>
              <span className={styles.pushLabel}>Встановити додаток</span>
              <button type="button" className={styles.pinBtn} onClick={promptInstall}>
                ВСТАНОВИТИ
              </button>
            </div>
          )
        )}

        <div className={styles.settingRow}>
          <div className={styles.pushInfo}>
            <span className={styles.pushLabel}>Очистити кеш</span>
            <span className={styles.pushSub}>API-відповіді, дані сесії</span>
          </div>
          <button
            type="button"
            className={`${styles.pinBtn} ${cacheCleared ? styles.pinBtnDone : ''}`}
            onClick={() => {
              clearApiCaches()
              setCacheCleared(true)
              showToast('Кеш очищено', 'success')
              setTimeout(() => setCacheCleared(false), 2000)
            }}
          >
            {cacheCleared ? '✓ ГОТОВО' : 'ОЧИСТИТИ'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default MeTab

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useProfileStore } from '../../store/profileStore'
import { useUiStore } from '../../store/uiStore'
import { useFamilyStore } from '../../store/familyStore'
import { usePushSubscription } from '../../hooks/usePushSubscription'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { clearApiCaches } from '../../utils/appCache'
import { uploadToCloudinary } from '../../utils/uploadToCloudinary'
import { ALL_NAV_SECTIONS } from '../../components/layout/BottomNav'
import type { Theme, NavStyle } from '../../store/uiStore'
import { NAV_STYLE_MAX_PINNED } from '../../store/uiStore'
import styles from './ProfilePage.module.css'

const CameraIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M1.5 5.5C1.5 4.672 2.172 4 3 4h1.646L6 2h6l1.354 2H15c.828 0 1.5.672 1.5 1.5v9c0 .828-.672 1.5-1.5 1.5H3c-.828 0-1.5-.672-1.5-1.5v-9z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <circle cx="9" cy="9.5" r="2.2" stroke="currentColor" strokeWidth="1.4"/>
  </svg>
)

const CheckIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const PencilIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M9.5 2L12 4.5 5 11.5H2.5V9L9.5 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M8 3.5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
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

const MEDIA_TABS_CONFIG: { id: string; label: string; sub: string; wip?: boolean }[] = [
  { id: 'movie',  label: 'Фільми',  sub: 'Повнометражні' },
  { id: 'series', label: 'Серіали', sub: 'Серіали та шоу' },
  { id: 'anime',  label: 'Аніме',   sub: 'Аніме та манга' },
  { id: 'game',   label: 'Ігри',    sub: 'Відеоігри' },
  { id: 'book',   label: 'Книги',   sub: 'Бібліотека',    wip: true },
]

/**
 * MeTab
 * -----
 * Вкладка "Я" — профіль, безпека (пароль + PIN), вигляд (тема + навігація),
 * система (сповіщення, місто, модулі, кеш).
 */
const MeTab: React.FC = () => {
  const { activeProfile, updateProfile, changePassword, setPIN, removePIN } = useProfileStore()
  const { theme, setTheme, navStyle, setNavStyle, pinnedSections, setPinnedSections, showToast, updateAvailable } = useUiStore()
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushSubscription()
  const { isInstallable, isIOS, promptInstall } = usePwaInstall()
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  const showInstall = !isStandalone && (isInstallable || isIOS)

  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)
  const [nameInput, setNameInput]       = useState(activeProfile?.name ?? '')
  const [editingName, setEditingName]   = useState(false)
  const [savingName, setSavingName]     = useState(false)

  const usernameRef = useRef<HTMLInputElement>(null)
  const [usernameInput, setUsernameInput]     = useState(activeProfile?.username ?? '')
  const [editingUsername, setEditingUsername] = useState(false)
  const [savingUsername, setSavingUsername]   = useState(false)

  const [pwCurrent, setPwCurrent]   = useState('')
  const [pwNew, setPwNew]           = useState('')
  const [pwConfirm, setPwConfirm]   = useState('')
  const [pwError, setPwError]       = useState<string | null>(null)
  const [savingPw, setSavingPw]     = useState(false)
  const [pwOpen, setPwOpen]         = useState(false)

  const [pinStep, setPinStep]       = useState<'idle' | 'enter' | 'confirm'>('idle')
  const [pinValue, setPinValue]     = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinError, setPinError]     = useState<string | null>(null)
  const [savingPin, setSavingPin]   = useState(false)

  const [pushLoading, setPushLoading]           = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)

  const [cacheCleared, setCacheCleared] = useState(false)

  const [city, setCity] = useState(activeProfile?.city ?? '')
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { accepted, pendingSent, pendingReceived, searchResults, searchUsers, sendRequest, acceptRequest, removeLink, clearSearch } = useFamilyStore()
  const [familySearch, setFamilySearch]   = useState('')
  const [familyLoading, setFamilyLoading] = useState(false)

  const handleFamilySearch = useCallback((q: string) => {
    setFamilySearch(q)
    searchUsers(q)
  }, [searchUsers])

  const handleSendRequest = useCallback(async (targetUserId: string) => {
    setFamilyLoading(true)
    try {
      await sendRequest(targetUserId)
      setFamilySearch(''); clearSearch()
      showToast('Запит надіслано', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Помилка', 'error')
    } finally {
      setFamilyLoading(false)
    }
  }, [sendRequest, clearSearch, showToast])

  const handleFamilyAccept = useCallback(async (linkId: string) => {
    try {
      await acceptRequest(linkId)
      showToast("Сім'ю підтверджено", 'success')
    } catch {
      showToast('Помилка підтвердження', 'error')
    }
  }, [acceptRequest, showToast])

  const handleFamilyRemove = useCallback(async (linkId: string) => {
    await removeLink(linkId)
    showToast("Зв'язок видалено", 'success')
  }, [removeLink, showToast])

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

  const handleMediaTabToggle = (tabId: string) => {
    const current = activeProfile?.mediaEnabledTabs ?? ['movie', 'series', 'anime', 'game']
    const next = current.includes(tabId)
      ? current.filter(t => t !== tabId)
      : [...current, tabId]
    updateProfile({ mediaEnabledTabs: next })
  }

  if (!activeProfile) return null

  return (
    <div className={styles.tabContent}>

      {/* ── Profile hero card ── */}
      <div className={styles.heroCard}>
        <div className={styles.avatarCol}>
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
          </button>
          <div className={styles.avatarBadge} aria-hidden="true">
            {uploadingAvatar ? <div className={styles.spinner} /> : <CameraIcon />}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className={styles.fileInput} onChange={handleAvatarChange} />
        </div>

        <div className={styles.profileCol}>
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
              <span className={styles.namePencil}><PencilIcon /></span>
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
              <span className={styles.namePencil}><PencilIcon /></span>
            </button>
          )}

          {activeProfile.email && (
            <span className={styles.emailLabel}>{activeProfile.email}</span>
          )}
        </div>
      </div>

      {/* ── БЕЗПЕКА ── */}
      <div className={styles.settingsCard}>
        <div className={styles.cardTitle}>БЕЗПЕКА</div>

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
                <input type="password" className={styles.pwInput} placeholder="Поточний пароль" value={pwCurrent} onChange={e => { setPwCurrent(e.target.value); setPwError(null) }} autoComplete="current-password" />
                <input type="password" className={styles.pwInput} placeholder="Новий пароль (мін. 6 символів)" value={pwNew} onChange={e => { setPwNew(e.target.value); setPwError(null) }} autoComplete="new-password" />
                <input type="password" className={styles.pwInput} placeholder="Підтвердь новий пароль" value={pwConfirm} onChange={e => { setPwConfirm(e.target.value); setPwError(null) }} autoComplete="new-password" />
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
      </div>

      {/* ── ВИГЛЯД ── */}
      <div className={styles.settingsCard}>
        <div className={styles.cardTitle}>ВИГЛЯД</div>
        <div className={styles.cardPadded}>
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
        </div>
        <div className={styles.cardDivider} />
        <div className={styles.cardPadded}>
          <div className={styles.cardSubTitle}>НАВІГАЦІЯ</div>
          <div className={styles.navStyleGrid}>
            {([
              { id: 'classic', label: 'Класик',  hint: 'Всі розділи в рядку' },
              { id: 'pill',    label: 'Пілюля',  hint: 'Мінімальна плаваюча' },
              { id: 'hub',     label: 'Хаб',     hint: 'Головне + розкладне' },
            ] as { id: NavStyle; label: string; hint: string }[]).map(opt => (
              <button
                key={opt.id}
                type="button"
                className={`${styles.navStyleCard} ${navStyle === opt.id ? styles.navStyleCardActive : ''}`}
                onClick={() => setNavStyle(opt.id)}
                aria-pressed={navStyle === opt.id}
              >
                <div className={styles.navPreview}>
                  {opt.id === 'classic' && (
                    <div className={styles.navPreviewClassic}>
                      {[0,1,2,3,4].map(i => <span key={i} className={styles.navPreviewDot} />)}
                    </div>
                  )}
                  {opt.id === 'pill' && (
                    <div className={styles.navPreviewPill}>
                      {[0,1,2,3].map(i => <span key={i} className={styles.navPreviewDot} />)}
                    </div>
                  )}
                  {opt.id === 'hub' && (
                    <div className={styles.navPreviewPill}>
                      <span className={styles.navPreviewDot} />
                      <span className={styles.navPreviewDot} />
                      <span className={`${styles.navPreviewDot} ${styles.navPreviewHub}`} />
                      <span className={styles.navPreviewDot} />
                      <span className={styles.navPreviewDot} />
                    </div>
                  )}
                </div>
                <span className={styles.navStyleLabel}>{opt.label}</span>
                <span className={styles.navStyleHint}>{opt.hint}</span>
              </button>
            ))}
          </div>

          {navStyle !== 'classic' && (
            <div className={styles.navPinSection}>
              <p className={styles.navPinTitle}>
                ГОЛОВНЕ МЕНЮ
                <span className={styles.navPinCount}>
                  {pinnedSections.length}/{NAV_STYLE_MAX_PINNED[navStyle]}
                </span>
              </p>
              {ALL_NAV_SECTIONS.filter(s => !s.requiresF1 || (activeProfile?.f1Enabled ?? false)).map(s => {
                const isPinned = pinnedSections.includes(s.to)
                const maxPinned = NAV_STYLE_MAX_PINNED[navStyle]
                const canAdd = pinnedSections.length < maxPinned
                return (
                  <div key={s.to} className={styles.navPinRow}>
                    <s.Icon className={styles.navPinIcon} />
                    <span className={styles.navPinLabel}>{s.label}</span>
                    <button
                      type="button"
                      className={`${styles.toggle} ${isPinned ? styles.toggleOn : ''}`}
                      disabled={!isPinned && !canAdd}
                      onClick={() => {
                        if (isPinned) {
                          setPinnedSections(pinnedSections.filter(p => p !== s.to))
                        } else if (canAdd) {
                          setPinnedSections([...pinnedSections, s.to])
                        }
                      }}
                      aria-pressed={isPinned}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </div>
                )
              })}
              <p className={styles.sectionHint} style={{ marginTop: 8 }}>
                {navStyle === 'hub'
                  ? 'Незакріплені розділи відкриваються через кнопку M'
                  : 'Тільки закріплені розділи видно в меню'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── СИСТЕМА ── */}
      <div className={styles.settingsCard}>
        <div className={styles.cardTitle}>СИСТЕМА</div>

        <div className={styles.cardRow}>
          <div>
            <div className={styles.cardRowLabel}>Місто (погода)</div>
            <div className={styles.pushSub}>Для блоку "Мій день"</div>
          </div>
          <input
            className={styles.fieldInput}
            value={city}
            onChange={e => handleCityChange(e.target.value)}
            placeholder="Київ"
          />
        </div>

        <div className={styles.cardDivider} />
        <div className={styles.cardRow}>
          <div className={styles.pushInfo}>
            <span className={styles.cardRowLabel}>F1 модуль</span>
            <span className={styles.pushSub}>Календар, стендінги, прогнози</span>
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

        {isSupported && !permissionDenied && (
          <>
            <div className={styles.cardDivider} />
            <div className={styles.cardRow}>
              <div className={styles.pushInfo}>
                <span className={styles.cardRowLabel}>Push-сповіщення</span>
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
          </>
        )}
        {isSupported && permissionDenied && (
          <>
            <div className={styles.cardDivider} />
            <div className={styles.cardRow}>
              <span className={styles.pushSub}>Push-сповіщення: дозвіл відхилено — увімкни в налаштуваннях браузера.</span>
            </div>
          </>
        )}

        <div className={styles.cardDivider} />
        <div className={styles.cardRow}>
          <div className={styles.pushInfo}>
            <span className={styles.cardRowLabel}>Очистити кеш</span>
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

        {updateAvailable && (
          <>
            <div className={styles.cardDivider} />
            <div className={styles.cardRow}>
              <span className={styles.cardRowLabel}>Доступне оновлення</span>
              <button type="button" className={styles.pinBtn} onClick={() => window.location.reload()}>
                ОНОВИТИ
              </button>
            </div>
          </>
        )}

        {showInstall && (
          <>
            <div className={styles.cardDivider} />
            <div className={styles.cardRow}>
              {isIOS ? (
                <span className={styles.pushSub}>
                  Натисніть <strong>⎙ Share</strong> → <strong>«Додати на початковий екран»</strong>
                </span>
              ) : (
                <>
                  <span className={styles.cardRowLabel}>Встановити додаток</span>
                  <button type="button" className={styles.pinBtn} onClick={promptInstall}>
                    ВСТАНОВИТИ
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── МЕДІА ── */}
      <div className={styles.settingsCard}>
        <div className={styles.cardTitle}>МЕДІА</div>

        {MEDIA_TABS_CONFIG.map((t, i) => {
          const enabled = (activeProfile.mediaEnabledTabs ?? ['movie', 'series', 'anime', 'game']).includes(t.id)
          return (
            <React.Fragment key={t.id}>
              {i > 0 && <div className={styles.cardDivider} />}
              <div className={styles.cardRow}>
                <div className={styles.pushInfo}>
                  <span className={styles.cardRowLabel}>
                    {t.label}
                    {t.wip && <span className={styles.wipBadge}>В РОЗРОБЦІ</span>}
                  </span>
                  <span className={styles.pushSub}>{t.sub}</span>
                </div>
                <button
                  type="button"
                  className={`${styles.toggle} ${!t.wip && enabled ? styles.toggleOn : ''}`}
                  onClick={() => !t.wip && handleMediaTabToggle(t.id)}
                  aria-label={`${enabled ? 'Вимкнути' : 'Увімкнути'} вкладку ${t.label}`}
                  aria-pressed={!t.wip && enabled}
                  disabled={t.wip}
                >
                  <span className={styles.toggleThumb} />
                </button>
              </div>
            </React.Fragment>
          )
        })}
      </div>

      {/* ── СІМ'Я ── */}
      <div className={styles.settingsCard}>
        <div className={styles.cardTitle}>
          СІМ'Я
          {accepted.length > 0 && <span className={styles.navPinCount}>{accepted.length}</span>}
        </div>

        {pendingReceived.length > 0 && (
          <div className={styles.familyPending}>
            {pendingReceived.map(l => (
              <div key={l.linkId} className={styles.familyRequest}>
                <div className={styles.familyAvatar}>
                  {l.avatarUrl
                    ? <img src={l.avatarUrl} alt={l.name} className={styles.familyAvatarImg} />
                    : <span className={styles.familyAvatarInitial}>{l.name[0]}</span>}
                </div>
                <div className={styles.familyInfo}>
                  <span className={styles.familyName}>{l.name}</span>
                  <span className={styles.familyUsername}>@{l.username}</span>
                </div>
                <div className={styles.familyRequestBtns}>
                  <button type="button" className={styles.familyAcceptBtn} onClick={() => handleFamilyAccept(l.linkId)}>Прийняти</button>
                  <button type="button" className={styles.familyRejectBtn} onClick={() => handleFamilyRemove(l.linkId)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {accepted.length > 0 && (
          <div className={styles.familyList}>
            {accepted.map(l => (
              <div key={l.linkId} className={styles.familyMember}>
                <div className={styles.familyAvatar}>
                  {l.avatarUrl
                    ? <img src={l.avatarUrl} alt={l.name} className={styles.familyAvatarImg} />
                    : <span className={styles.familyAvatarInitial}>{l.name[0]}</span>}
                </div>
                <div className={styles.familyInfo}>
                  <span className={styles.familyName}>{l.name}</span>
                  <span className={styles.familyUsername}>@{l.username}</span>
                </div>
                <button type="button" className={styles.familyRemoveBtn} onClick={() => handleFamilyRemove(l.linkId)}>
                  <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {pendingSent.length > 0 && (
          <div className={styles.familyPendingSent}>
            {pendingSent.map(l => (
              <div key={l.linkId} className={styles.familyMember}>
                <div className={styles.familyAvatar}>
                  {l.avatarUrl
                    ? <img src={l.avatarUrl} alt={l.name} className={styles.familyAvatarImg} />
                    : <span className={styles.familyAvatarInitial}>{l.name[0]}</span>}
                </div>
                <div className={styles.familyInfo}>
                  <span className={styles.familyName}>{l.name}</span>
                  <span className={styles.familyTag}>Очікує підтвердження</span>
                </div>
                <button type="button" className={styles.familyRemoveBtn} onClick={() => handleFamilyRemove(l.linkId)}>
                  <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {accepted.length === 0 && pendingReceived.length === 0 && pendingSent.length === 0 && (
          <div className={styles.cardRow}>
            <span className={styles.pushSub}>Ще немає сімейних зв'язків. Знайди когось нижче.</span>
          </div>
        )}

        <div className={styles.cardDivider} />
        <div className={styles.cardPadded}>
          <div className={styles.familySearchWrap}>
            <input
              className={styles.familySearchInput}
              type="text"
              placeholder="Пошук по логіну..."
              value={familySearch}
              onChange={e => handleFamilySearch(e.target.value)}
            />
            {familySearch && searchResults.length > 0 && (
              <div className={styles.familySearchResults}>
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    className={styles.familySearchItem}
                    onClick={() => handleSendRequest(u.id)}
                    disabled={familyLoading}
                  >
                    <div className={styles.familyAvatar}>
                      {u.avatarUrl
                        ? <img src={u.avatarUrl} alt={u.name} className={styles.familyAvatarImg} />
                        : <span className={styles.familyAvatarInitial}>{u.name[0]}</span>}
                    </div>
                    <div className={styles.familyInfo}>
                      <span className={styles.familyName}>{u.name}</span>
                      <span className={styles.familyUsername}>@{u.username}</span>
                    </div>
                    <span className={styles.familyAddIcon}>
                      <svg width="14" height="14" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {familySearch && searchResults.length === 0 && familySearch.length >= 2 && (
              <p className={styles.familyNoResults}>Нікого не знайдено</p>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}

export default MeTab

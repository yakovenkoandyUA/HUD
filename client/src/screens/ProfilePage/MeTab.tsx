import React, { useCallback, useRef, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useProfileStore } from '../../store/profileStore'
import { useUiStore } from '../../store/uiStore'
import { useFamilyStore } from '../../store/familyStore'
import { uploadToCloudinary } from '../../utils/uploadToCloudinary'
import MeSecurity from './MeSecurity'
import MeAppearance from './MeAppearance'
import MeSystem from './MeSystem'
import MeMedia from './MeMedia'
import MeFamily from './MeFamily'
import styles from './ProfilePage.module.css'

type MeSection = 'security' | 'appearance' | 'system' | 'media' | 'family'

const SECTION_TITLES: Record<MeSection, string> = {
  security: 'БЕЗПЕКА',
  appearance: 'ВИГЛЯД',
  system: 'СИСТЕМА',
  media: 'МЕДІА',
  family: "СІМ'Я",
}

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

const BackChevronIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M12.5 16L7 10l5.5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const ChevronRightIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M6 3.5L11 8l-5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const LockIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4"/>
  </svg>
)

const PaletteIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 1.5a6.5 6.5 0 1 0 0 13c.9 0 1.4-.6 1.4-1.3 0-.35-.14-.66-.36-.9-.2-.23-.32-.5-.32-.8 0-.66.55-1.2 1.25-1.2H11.5A3 3 0 0 0 14.5 7c0-3-3-5.5-6.5-5.5z" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="5" cy="6.5" r="0.9" fill="currentColor"/>
    <circle cx="8" cy="4.5" r="0.9" fill="currentColor"/>
    <circle cx="11" cy="6.5" r="0.9" fill="currentColor"/>
  </svg>
)

const GearIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="2.3" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const FilmIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="1.5" y="3" width="13" height="10" rx="1.3" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M5 3v10M11 3v10M1.5 6.3h2.3M1.5 9.7h2.3M12.2 6.3h2.3M12.2 9.7h2.3" stroke="currentColor" strokeWidth="1.1"/>
  </svg>
)

const UsersIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="6" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M2 14c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="11.5" cy="5.5" r="1.6" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M10.3 10.7c.4-.1.8-.2 1.2-.2 1.8 0 3.3 1.1 3.3 2.9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
)

interface MenuItemConfig {
  id: MeSection
  label: string
  sub: string
  Icon: React.FC
}

const MENU_ITEMS: MenuItemConfig[] = [
  { id: 'security',   label: 'Безпека', sub: 'Пароль, PIN-код',              Icon: LockIcon },
  { id: 'appearance', label: 'Вигляд',  sub: 'Теми, стиль навігації',        Icon: PaletteIcon },
  { id: 'system',     label: 'Система', sub: 'Місто, F1, сповіщення, кеш',   Icon: GearIcon },
  { id: 'media',      label: 'Медіа',   sub: 'Фільми, серіали, ігри...',     Icon: FilmIcon },
  { id: 'family',     label: "Сім'я",   sub: 'Запити, учасники',             Icon: UsersIcon },
]

/**
 * MeTab
 * -----
 * Вкладка "Я" — hero-картка (аватар/ім'я) + меню-навігація на підекрани
 * (Безпека / Вигляд / Система / Медіа / Сім'я), кожен зі своїм бек-хедером.
 */
const MeTab: React.FC = () => {
  const { activeProfile, updateProfile } = useProfileStore()
  const { accepted, pendingReceived } = useFamilyStore()
  const { showToast } = useUiStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const section = searchParams.get('section') as MeSection | null
  const [direction, setDirection] = useState<'forward' | 'back' | null>(null)

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

  const goSection = (id: MeSection) => {
    setDirection('forward')
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('tab', 'me')
      next.set('section', id)
      return next
    })
  }

  const goBack = () => {
    setDirection('back')
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('tab', 'me')
      next.delete('section')
      return next
    })
  }

  if (!activeProfile) return null

  if (section) {
    return (
      <div key={`section-${section}`} className={`${styles.tabContent} ${styles.slideInRight}`}>
        <div className={styles.sectionHeader}>
          <button type="button" className={styles.backBtn} onClick={goBack} aria-label="Назад">
            <BackChevronIcon />
          </button>
          <span className={styles.sectionHeaderTitle}>{SECTION_TITLES[section]}</span>
          <span className={styles.headerSpacer} />
        </div>
        {section === 'security' && <MeSecurity />}
        {section === 'appearance' && <MeAppearance />}
        {section === 'system' && <MeSystem />}
        {section === 'media' && <MeMedia />}
        {section === 'family' && <MeFamily />}
      </div>
    )
  }

  const familyBadge = accepted.length + pendingReceived.length

  return (
    <div key="menu" className={`${styles.tabContent} ${direction === 'back' ? styles.slideInLeft : ''}`}>

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

      {/* ── Меню підекранів ── */}
      <div className={styles.settingsCard}>
        {MENU_ITEMS.map((item, i) => (
          <React.Fragment key={item.id}>
            {i > 0 && <div className={styles.cardDivider} />}
            <button type="button" className={styles.menuRow} onClick={() => goSection(item.id)}>
              <span className={styles.menuIcon}><item.Icon /></span>
              <span className={styles.menuRowText}>
                <span className={styles.menuRowLabel}>{item.label}</span>
                <span className={styles.menuRowSub}>{item.sub}</span>
              </span>
              {item.id === 'family' && familyBadge > 0 && (
                <span className={styles.menuBadge}>{familyBadge}</span>
              )}
              <span className={styles.menuChevron}><ChevronRightIcon /></span>
            </button>
          </React.Fragment>
        ))}
      </div>

    </div>
  )
}

export default MeTab

import React, { useCallback, useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useFamilyStore } from '@/shared/store/familyStore'
import { uploadToCloudinary } from '@/shared/utils/uploadToCloudinary'
import { authFetch } from '@/shared/services/api'
import LegalDocModal from '@/shared/components/ui/LegalDocModal'
import settingsStyles from './SettingsTab.module.css'

const LS_TERMS   = 'mimir-terms-confirmed'
const LS_PRIVACY = 'mimir-privacy-confirmed'
import MeSecurity from './MeSecurity'
import MeAppearance from './MeAppearance'
import MeSystem from './MeSystem'
import MeMedia from './MeMedia'
import MeFamily from './MeFamily'
import MeAchievements from './MeAchievements'
import { useRuneScore } from '@/features/achievements/hooks/useAchievementProgress'
import { getLevel } from '@/features/achievements/levels'
import { ACHIEVEMENTS } from '@/shared/data/achievements'
import styles from './ProfilePage.module.css'

type MeSection = 'security' | 'appearance' | 'system' | 'media' | 'family' | 'achievements'

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

const TrophyIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 1.5l1.85 3.75L14 5.85l-3 2.92.7 4.13L8 10.9l-3.7 1.99.7-4.13-3-2.92 4.15-.6L8 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
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
  { id: 'achievements', label: 'Досягнення', sub: 'Бейджі за перші кроки',   Icon: TrophyIcon },
]

/**
 * MeTab
 * -----
 * Вкладка "Профіль" — hero-картка (аватар/ім'я) + акордеон-меню підрозділів
 * (Безпека / Вигляд / Система / Медіа / Сім'я / Досягнення) + утиліти
 * (Експорт даних / Юридична інформація / Небезпечна зона).
 */
const MeTab: React.FC = () => {
  const navigate = useNavigate()
  const { activeProfile, updateProfile, logout } = useProfileStore()
  const { pendingReceived } = useFamilyStore()
  const { showToast, updateAvailable, setUpdateAvailable } = useUiStore()
  const [openSection, setOpenSection] = useState<MeSection | null>(null)

  const [legalOpen, setLegalOpen]             = useState<'terms' | 'privacy' | null>(null)
  const [termsConfirmed, setTermsConfirmed]   = useState(() => localStorage.getItem(LS_TERMS) === '1')
  const [privacyConfirmed, setPrivacyConfirmed] = useState(() => localStorage.getItem(LS_PRIVACY) === '1')

  const handleLegalConfirm = (type: 'terms' | 'privacy') => {
    if (type === 'terms') { localStorage.setItem(LS_TERMS, '1'); setTermsConfirmed(true) }
    else                  { localStorage.setItem(LS_PRIVACY, '1'); setPrivacyConfirmed(true) }
  }

  const [exporting, setExporting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showDeleteZone, setShowDeleteZone] = useState(false)

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const res = await authFetch('/api/user/export')
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const date = new Date().toISOString().slice(0, 10)
      const a = document.createElement('a')
      a.href = url
      a.download = `mimir-export-${date}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Дані успішно експортовано', 'success')
    } catch {
      showToast('Помилка експорту. Спробуйте ще раз.', 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE' || deleting) return
    setDeleting(true)
    try {
      const res = await authFetch('/api/user/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        showToast(data.error ?? 'Помилка видалення', 'error')
        return
      }
      showToast('Запит на видалення прийнято', 'info')
      logout()
      navigate('/login')
    } catch {
      showToast("Помилка з'єднання. Спробуйте ще раз.", 'error')
    } finally {
      setDeleting(false)
    }
  }

  // Check for SW updates each time MeTab mounts (background check)
  useEffect(() => {
    let cancelled = false
    const checkForUpdate = async () => {
      if (!('serviceWorker' in navigator)) return
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        if (!cancelled && reg) reg.update().catch(() => {/* silent */})
      } catch {/* silent */}
    }
    checkForUpdate()

    // Also watch for controller change in case it fires while on this tab
    const onControllerChange = () => { if (!cancelled) setUpdateAvailable(true) }
    navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange)
    return () => {
      cancelled = true
      navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange)
    }
  }, [setUpdateAvailable])
  const toggleSection = (id: MeSection) => setOpenSection(prev => prev === id ? null : id)

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

  if (!activeProfile) return null

  const familyPending = pendingReceived.length
  const runeScore = useRuneScore()
  const level = getLevel(runeScore)

  const unlockedIds = activeProfile.unlockedAchievements ?? []

  return (
    <div className={styles.tabContent}>

      {/* ── Profile hero card ── */}
      <div className={styles.heroCard}>
        <div className={styles.avatarCol}>
          <div className={styles.avatarWrap}>
            <button
              type="button"
              className={styles.avatarBtn}
              style={{ borderColor: level.color }}
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
          <span className={styles.rankPill} style={{ color: level.color, borderColor: level.color }}>
            {level.label}
          </span>
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

        <img
          src={`/achive/profile/level-${level.level}.png`}
          alt={level.label}
          className={styles.levelImg}
          draggable={false}
        />
      </div>


      {/* ── Акордеон-меню підрозділів ── */}
      {MENU_ITEMS.map(item => {
        const isOpen = openSection === item.id
        return (
          <div key={item.id} className={styles.settingsCard}>
            <button
              type="button"
              className={styles.menuRow}
              onClick={() => toggleSection(item.id)}
              aria-expanded={isOpen}
            >
              <span className={styles.menuIcon}><item.Icon /></span>
              <span className={styles.menuRowText}>
                <span className={styles.menuRowLabel}>{item.label}</span>
                <span className={styles.menuRowSub}>{item.sub}</span>
              </span>
              {item.id === 'family' && familyPending > 0 && (
                <span className={styles.menuPulseDot} aria-label={`${familyPending} запитів`} />
              )}
              {item.id === 'achievements' && (
                <span className={styles.menuAchBadge}>
                  <span className={styles.menuAchCount}>{unlockedIds.length}</span>
                  <span className={styles.menuAchTotal}>/{ACHIEVEMENTS.length}</span>
                </span>
              )}
              <span className={`${styles.menuChevron} ${isOpen ? styles.menuChevronOpen : ''}`}><ChevronRightIcon /></span>
            </button>
            <div className={`${styles.menuAccordionBody} ${isOpen ? styles.menuAccordionBodyOpen : ''}`}>
              {item.id === 'security' && <MeSecurity />}
              {item.id === 'appearance' && <MeAppearance />}
              {item.id === 'system' && <MeSystem />}
              {item.id === 'media' && <MeMedia />}
              {item.id === 'family' && <MeFamily />}
              {item.id === 'achievements' && <MeAchievements />}
            </div>
          </div>
        )
      })}

      {/* ── Update banner ── */}
      {updateAvailable && (
        <div className={styles.updateBanner}>
          <span className={styles.updateBannerDot} />
          <div className={styles.updateBannerText}>
            <span className={styles.updateBannerTitle}>Доступне оновлення</span>
            <span className={styles.updateBannerSub}>Нова версія MIMIR готова до встановлення</span>
          </div>
          <button
            type="button"
            className={styles.updateBannerBtn}
            onClick={() => window.location.reload()}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2.5A5.5 5.5 0 1 1 7 1.5"/>
              <path d="M9.5 1.5L7 4l2.5 1.5"/>
            </svg>
            ОНОВИТИ
          </button>
        </div>
      )}

      {/* ── Export ── */}
      <section className={settingsStyles.section}>
        <div className={settingsStyles.sectionHead}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v9M5 8l3 3 3-3"/><path d="M2 13h12"/>
          </svg>
          <h2 className={settingsStyles.sectionTitle}>Експорт даних</h2>
        </div>
        <p className={settingsStyles.sectionDesc}>
          Завантажте всі ваші дані у форматі JSON — спогади, фінанси, рецепти, звички, нотатки та інше. Паролі і токени не включаються.
        </p>
        <button type="button" className={settingsStyles.exportBtn} onClick={handleExport} disabled={exporting}>
          {exporting ? (
            <span className={settingsStyles.spinner} />
          ) : (
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v9M5 8l3 3 3-3"/><path d="M2 13h12"/>
            </svg>
          )}
          {exporting ? 'Підготовка...' : 'Завантажити мої дані (JSON)'}
        </button>
      </section>

      {/* ── Legal ── */}
      <section className={settingsStyles.section}>
        <div className={settingsStyles.sectionHead}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="1" width="12" height="14" rx="1.5"/><path d="M5 5h6M5 8h6M5 11h4"/>
          </svg>
          <h2 className={settingsStyles.sectionTitle}>Юридична інформація</h2>
        </div>
        <div className={settingsStyles.legalLinks}>
          <div className={settingsStyles.legalRow}>
            <button type="button" className={settingsStyles.legalLink} onClick={() => setLegalOpen('terms')}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 1.5h8M2 4.5h8M2 7.5h5"/>
              </svg>
              Умови користування
            </button>
            <button
              type="button"
              className={`${settingsStyles.legalCheck} ${termsConfirmed ? settingsStyles.legalCheckDone : ''}`}
              title={termsConfirmed ? 'Ознайомлений' : 'Прочитайте документ'}
              onClick={() => !termsConfirmed && setLegalOpen('terms')}
            >
              {termsConfirmed
                ? <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5l3 3 6-6"/></svg>
                : <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="9" height="9" rx="2"/></svg>
              }
            </button>
          </div>
          <div className={settingsStyles.legalRow}>
            <button type="button" className={settingsStyles.legalLink} onClick={() => setLegalOpen('privacy')}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 1L2 3v3c0 2.5 1.8 4.7 4 5.4C8.2 10.7 10 8.5 10 6V3L6 1z"/>
              </svg>
              Політика конфіденційності
            </button>
            <button
              type="button"
              className={`${settingsStyles.legalCheck} ${privacyConfirmed ? settingsStyles.legalCheckDone : ''}`}
              title={privacyConfirmed ? 'Ознайомлений' : 'Прочитайте документ'}
              onClick={() => !privacyConfirmed && setLegalOpen('privacy')}
            >
              {privacyConfirmed
                ? <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5l3 3 6-6"/></svg>
                : <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="9" height="9" rx="2"/></svg>
              }
            </button>
          </div>
        </div>
      </section>

      <LegalDocModal
        isOpen={legalOpen !== null}
        type={legalOpen ?? 'terms'}
        onClose={() => setLegalOpen(null)}
        onConfirm={() => { if (legalOpen) handleLegalConfirm(legalOpen) }}
      />

      {/* ── Danger zone ── */}
      <section className={`${settingsStyles.section} ${settingsStyles.dangerSection}`}>
        <div className={settingsStyles.sectionHead}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2L1.5 13h13L8 2z"/><path d="M8 6.5v3"/><circle cx="8" cy="11" r="0.7" fill="currentColor" stroke="none"/>
          </svg>
          <h2 className={`${settingsStyles.sectionTitle} ${settingsStyles.dangerTitle}`}>Небезпечна зона</h2>
        </div>
        {!showDeleteZone ? (
          <button type="button" className={settingsStyles.dangerToggleBtn} onClick={() => setShowDeleteZone(true)}>
            Видалити акаунт
          </button>
        ) : (
          <div className={settingsStyles.deleteZone}>
            <p className={settingsStyles.deleteWarning}>
              Після підтвердження акаунт буде <strong>заблоковано</strong> і позначений для видалення. Дані зберігатимуться 30 днів, після чого будуть видалені <strong>безповоротно</strong>.
            </p>
            <p className={settingsStyles.deleteWarning}>
              Для підтвердження введіть <code className={settingsStyles.deleteCode}>DELETE</code> у поле нижче:
            </p>
            <input
              type="text"
              className={settingsStyles.deleteInput}
              placeholder="DELETE"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <div className={settingsStyles.deleteActions}>
              <button
                type="button"
                className={settingsStyles.deleteCancelBtn}
                onClick={() => { setShowDeleteZone(false); setDeleteConfirm('') }}
              >
                Скасувати
              </button>
              <button
                type="button"
                className={settingsStyles.deleteConfirmBtn}
                onClick={handleDelete}
                disabled={deleteConfirm !== 'DELETE' || deleting}
              >
                {deleting ? 'Обробка...' : 'Видалити акаунт'}
              </button>
            </div>
          </div>
        )}
      </section>

    </div>
  )
}

export default MeTab

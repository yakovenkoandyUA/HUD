import React, { useCallback, useRef, useState, useEffect } from 'react'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { uploadToCloudinary } from '@/shared/utils/uploadToCloudinary'
import { useRuneScore } from '@/features/achievements/hooks/useAchievementProgress'
import { getLevel } from '@/features/achievements/levels'
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

/**
 * MeTab
 * -----
 * Вкладка "Профіль" — hero-картка (аватар/ім'я/нікнейм/email).
 * Утиліти акаунту (Експорт/Юридичне/Небезпечна зона) — на /profile/account через ProfileDrawer → Акаунт.
 */
const MeTab: React.FC = () => {
  const { activeProfile, updateProfile } = useProfileStore()
  const { showToast, setUpdateAvailable } = useUiStore()

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

    const onControllerChange = () => { if (!cancelled) setUpdateAvailable(true) }
    navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange)
    return () => {
      cancelled = true
      navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange)
    }
  }, [setUpdateAvailable])

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

  const runeScore = useRuneScore()
  const level = getLevel(runeScore)

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

        <img src="/achive/achive-hero.png" alt="" className={styles.runeImg} draggable={false} />
      </div>

    </div>
  )
}

export default MeTab

import React, { useCallback, useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { uploadToCloudinary } from '@/shared/utils/uploadToCloudinary'
import { useAchievementScore } from '@/features/achievements/hooks/useAchievementProgress'
import { getLevel, getLevelProgress } from '@/features/achievements/levels'
import AchievementsTab from '@/features/achievements'
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

const EditIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M9.5 2L12 4.5 5 11.5H2.5V9L9.5 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M8 3.5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

/**
 * MeTab
 * -----
 * Вкладка "Профіль" — hero-картка (аватар / ім'я / нікнейм).
 * Єдина кнопка редагування у верхньому-правому куті хіро-картки.
 * Рівень, прогрес, ранг — в нижній секції картки.
 */
const MeTab: React.FC = () => {
  const navigate = useNavigate()
  const { activeProfile, updateProfile } = useProfileStore()
  const { showToast, setUpdateAvailable } = useUiStore()

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

  const nameRef     = useRef<HTMLInputElement>(null)
  const usernameRef = useRef<HTMLInputElement>(null)

  const [nameInput, setNameInput]             = useState(activeProfile?.name ?? '')
  const [usernameInput, setUsernameInput]     = useState(activeProfile?.username ?? '')
  const [heroEditing, setHeroEditing]         = useState(false)
  const [savingName, setSavingName]           = useState(false)
  const [savingUsername, setSavingUsername]   = useState(false)

  useEffect(() => {
    if (heroEditing) {
      setNameInput(activeProfile?.name ?? '')
      setUsernameInput(activeProfile?.username ?? '')
      setTimeout(() => nameRef.current?.focus(), 50)
    }
  }, [heroEditing]) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!trimmed || trimmed === activeProfile?.name) return
    setSavingName(true)
    try {
      await updateProfile({ name: trimmed })
      showToast("Ім'я оновлено", 'success')
    } catch {
      showToast('Помилка збереження', 'error')
      setNameInput(activeProfile?.name ?? '')
    } finally {
      setSavingName(false)
    }
  }, [nameInput, activeProfile?.name, updateProfile, showToast])

  const saveUsername = useCallback(async () => {
    const trimmed = usernameInput.trim().toLowerCase()
    if (!trimmed || trimmed === activeProfile?.username) return
    setSavingUsername(true)
    try {
      await updateProfile({ username: trimmed })
      showToast('Нікнейм оновлено', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Помилка збереження', 'error')
      setUsernameInput(activeProfile?.username ?? '')
    } finally {
      setSavingUsername(false)
    }
  }, [usernameInput, activeProfile?.username, updateProfile, showToast])

  const handleSaveAll = useCallback(async () => {
    await Promise.allSettled([saveName(), saveUsername()])
    setHeroEditing(false)
  }, [saveName, saveUsername])

  if (!activeProfile) return null

  const score    = useAchievementScore()
  const level    = getLevel(score.earned)
  const progress = getLevelProgress(score.earned)

  return (
    <div className={styles.tabContent}>
      <div className={styles.heroCard} style={{ '--level-color': level.color } as React.CSSProperties}>

        <div className={styles.heroLeft}>
          {/* ── Top: avatar + name ── */}
          <div className={styles.identityRow}>
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
                  {activeProfile.avatarUrl
                    ? <img src={activeProfile.avatarUrl} alt={activeProfile.name} className={styles.avatarImg} />
                    : <span className={styles.avatarInitial}>{activeProfile.name[0].toUpperCase()}</span>
                  }
                </button>
                <div className={styles.avatarBadge} aria-hidden="true">
                  {uploadingAvatar ? <div className={styles.spinner} /> : <CameraIcon />}
                </div>
                <button
                  type="button"
                  className={`${styles.avatarEditBtn} ${heroEditing ? styles.avatarEditBtnActive : ''}`}
                  onClick={heroEditing ? handleSaveAll : () => setHeroEditing(true)}
                  aria-label={heroEditing ? 'Зберегти' : 'Редагувати'}
                  disabled={savingName || savingUsername}
                >
                  {heroEditing ? <CheckIcon /> : <EditIcon />}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className={styles.fileInput} onChange={handleAvatarChange} />
              </div>

              {heroEditing ? (
                <div className={styles.profileColEditing}>
                  <input
                    ref={nameRef}
                    type="text"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') usernameRef.current?.focus() }}
                    className={styles.heroNameInput}
                    maxLength={32}
                    disabled={savingName}
                    placeholder="Ім'я"
                  />
                  <div className={styles.heroUsernameInputRow}>
                    <span className={styles.heroUsernameAt}>@</span>
                    <input
                      ref={usernameRef}
                      type="text"
                      value={usernameInput}
                      onChange={e => setUsernameInput(e.target.value.toLowerCase())}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveAll(); if (e.key === 'Escape') setHeroEditing(false) }}
                      className={styles.heroUsernameInput}
                      maxLength={30}
                      disabled={savingUsername}
                      autoCapitalize="none"
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.profileColStatic}>
                  <span className={styles.profileName}>{activeProfile.name}</span>
                  <span className={styles.profileUsername}>@{activeProfile.username}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          className={styles.monolithBtn}
          style={{ '--level-color': level.color } as React.CSSProperties}
          onClick={() => navigate('/profile/levels')}
          aria-label="Шлях рівнів"
        >
          <img
            src="/achivement/monolite-noBg.png"
            alt=""
            className={styles.monolithBtnImg}
            draggable={false}
          />
          <span className={styles.monolithBtnLabel} style={{ color: level.color, borderColor: level.color }}>
            {level.label}
          </span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={styles.monolithBtnChevron} aria-hidden="true">
            <path d="M4.5 2.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className={styles.heroProgressBar} aria-hidden="true">
          <div className={styles.heroProgressFill} style={{ width: `${progress}%` }} />
        </div>

      </div>

      <AchievementsTab />
    </div>
  )
}

export default MeTab

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../../store/profileStore'
import { useUiStore } from '../../store/uiStore'
import { useCategoryStore } from '../../store/categoryStore'
import { useFamilyStore } from '../../store/familyStore'
import { authFetch } from '../../services/api'
import { uploadToCloudinary } from '../../utils/uploadToCloudinary'
import Modal from '../../components/ui/Modal'
import type { Category } from '../../types'
import styles from './ProfilePage.module.css'

/**
 * ProfilePage
 * -----------
 * Сторінка профілю: аватар, ім'я (inline edit) та управління категоріями витрат.
 * Категорії відображаються 3-колонковим гридом (CatCard).
 * Тап на CatCard → bottom sheet: toggle активності + управління підкатегоріями.
 * При деактивації категорії з транзакціями — відкривається bottom sheet міграції.
 *
 * Props: none
 */

// ── SVG icons ────────────────────────────────────────────────────────────────

const BackIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M12.5 16L7 10l5.5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

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

const PlusIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

const XSmallIcon: React.FC = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
    <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

// ── Component ────────────────────────────────────────────────────────────────

const ProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const { activeProfile, updateProfile, setPIN, removePIN } = useProfileStore()
  const { showToast } = useUiStore()
  const { categories, fetchCategories, addCategory, removeCategory, toggleActive } = useCategoryStore()
  const { accepted, pendingSent, pendingReceived, searchResults, fetchFamily, searchUsers, sendRequest, acceptRequest, removeLink, clearSearch } = useFamilyStore()

  const [nameInput, setNameInput]         = useState(activeProfile?.name ?? '')
  const [editingName, setEditingName]     = useState(false)
  const [savingName, setSavingName]       = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // PIN management
  const [pinStep, setPinStep]     = useState<'idle' | 'enter' | 'confirm'>('idle')
  const [pinValue, setPinValue]   = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinError, setPinError]   = useState<string | null>(null)
  const [savingPin, setSavingPin] = useState(false)

  // Family
  const [familySearch, setFamilySearch] = useState('')
  const [familyLoading, setFamilyLoading] = useState(false)

  const [addingCat, setAddingCat]     = useState(false)
  const [newCatValue, setNewCatValue] = useState('')
  const [savingCat, setSavingCat]     = useState(false)

  const [migrateOpen, setMigrateOpen] = useState(false)
  const [migrateFrom, setMigrateFrom] = useState<Category | null>(null)
  const [migrating, setMigrating]     = useState(false)

  const [subModalCat, setSubModalCat]   = useState<Category | null>(null)
  const [newSubValue, setNewSubValue]   = useState('')
  const [savingSub, setSavingSub]       = useState(false)
  const subAddRef                       = useRef<HTMLInputElement>(null)

  const fileRef   = useRef<HTMLInputElement>(null)
  const nameRef   = useRef<HTMLInputElement>(null)
  const newCatRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchCategories() }, [fetchCategories])
  useEffect(() => { fetchFamily() }, [fetchFamily])

  useEffect(() => {
    if (editingName) nameRef.current?.focus()
  }, [editingName])

  useEffect(() => {
    if (addingCat) newCatRef.current?.focus()
  }, [addingCat])

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
      showToast('Ім\'я оновлено', 'success')
    } catch {
      showToast('Помилка збереження', 'error')
      setNameInput(activeProfile?.name ?? '')
    } finally {
      setSavingName(false)
      setEditingName(false)
    }
  }, [nameInput, activeProfile?.name, updateProfile, showToast])

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter')  saveName()
    if (e.key === 'Escape') { setNameInput(activeProfile?.name ?? ''); setEditingName(false) }
  }

  const saveNewCat = useCallback(async () => {
    const trimmed = newCatValue.trim()
    if (!trimmed) { setAddingCat(false); return }
    setSavingCat(true)
    try {
      const res = await authFetch('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: trimmed }),
      })
      if (res.ok) {
        const created: Category = await res.json()
        addCategory(created)
        setNewCatValue('')
        setAddingCat(false)
      }
    } catch {
      showToast('Помилка збереження', 'error')
    } finally {
      setSavingCat(false)
    }
  }, [newCatValue, addCategory, showToast])

  const handleNewCatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter')  saveNewCat()
    if (e.key === 'Escape') { setNewCatValue(''); setAddingCat(false) }
  }

  const deleteCat = useCallback(async (id: string) => {
    removeCategory(id)
    authFetch(`/api/categories/${id}`, { method: 'DELETE' }).catch(() => {})
  }, [removeCategory])

  // ── Toggle with migration check ───────────────────────────────────────────

  const optimisticToggle = useCallback(async (cat: Category) => {
    toggleActive(cat._id)
  }, [toggleActive])

  const handleToggle = useCallback(async (cat: Category) => {
    if (cat.isActive) {
      // Check if any transactions use this category
      try {
        const res = await authFetch(`/api/transactions/count?category=${encodeURIComponent(cat.name)}`)
        if (res.ok) {
          const { count } = await res.json()
          if (count > 0) {
            setMigrateFrom(cat)
            setMigrateOpen(true)
            return
          }
        }
      } catch { /* proceed with simple toggle on error */ }
    }
    optimisticToggle(cat)
  }, [optimisticToggle])

  const handleMigrate = useCallback(async (toName: string | null) => {
    if (!migrateFrom) return
    setMigrating(true)
    try {
      const res = await authFetch('/api/transactions/migrate-category', {
        method: 'PATCH',
        body: JSON.stringify({ from: migrateFrom.name, to: toName }),
      })
      if (!res.ok) throw new Error()
      toggleActive(migrateFrom._id)
      showToast('Транзакції перенесено', 'success')
    } catch {
      showToast('Помилка міграції', 'error')
    } finally {
      setMigrating(false)
      setMigrateOpen(false)
      setMigrateFrom(null)
    }
  }, [migrateFrom, toggleActive, showToast])

  const handleAddSub = useCallback(async () => {
    const name = newSubValue.trim()
    if (!name || savingSub || !subModalCat) return
    setSavingSub(true)
    try {
      const res = await authFetch('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name, parentId: subModalCat._id }),
      })
      if (res.ok) {
        const created: Category = await res.json()
        addCategory(created)
        setNewSubValue('')
        subAddRef.current?.focus()
      }
    } catch {
      showToast('Помилка збереження', 'error')
    } finally {
      setSavingSub(false)
    }
  }, [newSubValue, savingSub, subModalCat, addCategory, showToast])

  const handleDeleteSub = useCallback(async (subId: string) => {
    removeCategory(subId)
    authFetch(`/api/categories/${subId}`, { method: 'DELETE' }).catch(() => {})
  }, [removeCategory])

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
          setPinValue('')
          setPinConfirm('')
          setPinStep('enter')
        } else {
          handleSavePIN(next)
        }
      }
    }
  }

  const handlePinDelete = () => {
    if (pinStep === 'enter') setPinValue(p => p.slice(0, -1))
    else if (pinStep === 'confirm') setPinConfirm(p => p.slice(0, -1))
    setPinError(null)
  }

  const handleSavePIN = async (pin: string) => {
    setSavingPin(true)
    try {
      await setPIN(pin)
      showToast('PIN встановлено', 'success')
      setPinStep('idle')
      setPinValue('')
      setPinConfirm('')
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

  const handleFamilySearch = useCallback((q: string) => {
    setFamilySearch(q)
    searchUsers(q)
  }, [searchUsers])

  const handleSendRequest = useCallback(async (targetUserId: string) => {
    setFamilyLoading(true)
    try {
      await sendRequest(targetUserId)
      setFamilySearch('')
      clearSearch()
      showToast('Запит надіслано', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Помилка', 'error')
    } finally {
      setFamilyLoading(false)
    }
  }, [sendRequest, clearSearch, showToast])

  const handleAccept = useCallback(async (linkId: string) => {
    try {
      await acceptRequest(linkId)
      showToast('Сімʼю підтверджено', 'success')
    } catch {
      showToast('Помилка підтвердження', 'error')
    }
  }, [acceptRequest, showToast])

  const handleRemove = useCallback(async (linkId: string) => {
    await removeLink(linkId)
    showToast('Звʼязок видалено', 'success')
  }, [removeLink, showToast])

  if (!activeProfile) return null

  const topLevelCats     = categories.filter(c => !c.parentId)
  const defaultCats      = topLevelCats.filter(c => c.isDefault)
  const customCats       = topLevelCats.filter(c => !c.isDefault)
  const activeCount      = topLevelCats.filter(c => c.isActive).length
  const migrationTargets = topLevelCats.filter(c => c.isActive && c._id !== migrateFrom?._id)
  const subCatsOfModal   = subModalCat
    ? categories.filter(c => c.parentId === subModalCat._id)
    : []

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className={styles.headerTitle}>ПРОФІЛЬ</span>
        <div className={styles.headerSpacer} />
      </div>

      <div className={styles.content}>
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
                <span className={styles.avatarInitial}>
                  {activeProfile.name[0].toUpperCase()}
                </span>
              )}
              <div className={styles.cameraOverlay}>
                {uploadingAvatar ? <div className={styles.spinner} /> : <CameraIcon />}
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className={styles.fileInput}
              onChange={handleAvatarChange}
            />
          </div>

          {editingName ? (
            <div className={styles.nameEditRow}>
              <input
                ref={nameRef}
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onBlur={saveName}
                onKeyDown={handleNameKeyDown}
                className={styles.nameInput}
                maxLength={32}
                disabled={savingName}
              />
              <button
                type="button"
                className={styles.nameConfirmBtn}
                onClick={saveName}
                disabled={savingName}
              >
                <CheckIcon />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.nameBtn}
              onClick={() => { setNameInput(activeProfile.name); setEditingName(true) }}
            >
              {activeProfile.name}
              <span className={styles.namePencil}>✎</span>
            </button>
          )}

          <span className={styles.username}>@{activeProfile.username}</span>
        </div>

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
                  <button
                    type="button"
                    className={`${styles.pinBtn} ${styles.pinBtnDanger}`}
                    onClick={handleRemovePIN}
                    disabled={savingPin}
                  >
                    Видалити PIN
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.pinSetup}>
              <p className={styles.pinSetupLabel}>
                {pinStep === 'enter' ? 'Введи новий PIN' : 'Підтвердь PIN'}
              </p>
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

        {/* ── Family ── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>СІМ'Я</span>
            {accepted.length > 0 && <span className={styles.sectionCount}>{accepted.length}</span>}
          </div>

          {/* Pending received */}
          {pendingReceived.length > 0 && (
            <div className={styles.familyPending}>
              {pendingReceived.map(l => (
                <div key={l.linkId} className={styles.familyRequest}>
                  <div className={styles.familyAvatar}>
                    {l.avatarUrl
                      ? <img src={l.avatarUrl} alt={l.name} className={styles.familyAvatarImg} />
                      : <span className={styles.familyAvatarInitial}>{l.name[0]}</span>
                    }
                  </div>
                  <div className={styles.familyInfo}>
                    <span className={styles.familyName}>{l.name}</span>
                    <span className={styles.familyUsername}>@{l.username}</span>
                  </div>
                  <div className={styles.familyRequestBtns}>
                    <button type="button" className={styles.familyAcceptBtn} onClick={() => handleAccept(l.linkId)}>
                      Прийняти
                    </button>
                    <button type="button" className={styles.familyRejectBtn} onClick={() => handleRemove(l.linkId)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Accepted members */}
          {accepted.length > 0 && (
            <div className={styles.familyList}>
              {accepted.map(l => (
                <div key={l.linkId} className={styles.familyMember}>
                  <div className={styles.familyAvatar}>
                    {l.avatarUrl
                      ? <img src={l.avatarUrl} alt={l.name} className={styles.familyAvatarImg} />
                      : <span className={styles.familyAvatarInitial}>{l.name[0]}</span>
                    }
                  </div>
                  <div className={styles.familyInfo}>
                    <span className={styles.familyName}>{l.name}</span>
                    <span className={styles.familyUsername}>@{l.username}</span>
                  </div>
                  <button type="button" className={styles.familyRemoveBtn} onClick={() => handleRemove(l.linkId)} aria-label="Видалити">
                    <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pending sent */}
          {pendingSent.length > 0 && (
            <div className={styles.familyPendingSent}>
              {pendingSent.map(l => (
                <div key={l.linkId} className={styles.familyMember}>
                  <div className={styles.familyAvatar}>
                    {l.avatarUrl
                      ? <img src={l.avatarUrl} alt={l.name} className={styles.familyAvatarImg} />
                      : <span className={styles.familyAvatarInitial}>{l.name[0]}</span>
                    }
                  </div>
                  <div className={styles.familyInfo}>
                    <span className={styles.familyName}>{l.name}</span>
                    <span className={styles.familyTag}>Очікує підтвердження</span>
                  </div>
                  <button type="button" className={styles.familyRemoveBtn} onClick={() => handleRemove(l.linkId)}>
                    <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search */}
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
                        : <span className={styles.familyAvatarInitial}>{u.name[0]}</span>
                      }
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
        </section>

        {/* ── Categories ── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>БАЗОВІ КАТЕГОРІЇ</span>
            <span className={styles.sectionCount}>{defaultCats.filter(c => c.isActive).length}/{defaultCats.length}</span>
          </div>
          <div className={styles.catGrid}>
            {defaultCats.map(cat => (
              <CatCard
                key={cat._id}
                cat={cat}
                onToggle={() => setSubModalCat(cat)}
              />
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>МОЇ КАТЕГОРІЇ</span>
            <span className={styles.sectionCount}>{customCats.filter(c => c.isActive).length}/{customCats.length}</span>
          </div>
          <div className={styles.catGrid}>
            {customCats.map(cat => (
              <CatCard
                key={cat._id}
                cat={cat}
                onToggle={() => setSubModalCat(cat)}
                onDelete={() => deleteCat(cat._id)}
              />
            ))}

            {/* Add new */}
            {addingCat ? (
              <div className={styles.addCatCard}>
                <input
                  ref={newCatRef}
                  type="text"
                  value={newCatValue}
                  onChange={e => setNewCatValue(e.target.value)}
                  onBlur={() => { if (!newCatValue.trim()) setAddingCat(false) }}
                  onKeyDown={handleNewCatKeyDown}
                  className={styles.addCatInput}
                  placeholder="Назва"
                  maxLength={24}
                  disabled={savingCat}
                />
                <button
                  type="button"
                  className={styles.addCatSaveBtn}
                  onClick={saveNewCat}
                  disabled={savingCat || !newCatValue.trim()}
                >
                  <CheckIcon />
                </button>
              </div>
            ) : (
              <button type="button" className={styles.addCatBtn} onClick={() => setAddingCat(true)}>
                <PlusIcon />
                <span>Нова</span>
              </button>
            )}
          </div>
        </section>

        <div className={styles.totalActive}>
          <span>{activeCount} активних категорій</span>
        </div>
      </div>

      {/* ── SubCategory modal ── */}
      <Modal
        isOpen={!!subModalCat}
        onClose={() => { setSubModalCat(null); setNewSubValue('') }}
        title={subModalCat?.name ?? ''}
        draggable
      >
        {subModalCat && (
          <div className={styles.subModalBody}>
            {/* Category header with toggle */}
            <div
              className={`${styles.subModalCatHeader} ${subModalCat.isActive ? styles.subModalCatHeaderActive : ''}`}
              style={{ '--cat-color': subModalCat.color } as React.CSSProperties}
            >
              <div className={styles.subModalCatIcon}>
                <i className={`ti ${subModalCat.icon}`} />
              </div>
              <span className={styles.subModalCatName}>{subModalCat.name}</span>
              <button
                type="button"
                className={`${styles.subModalToggleBtn} ${subModalCat.isActive ? styles.subModalToggleBtnActive : ''}`}
                style={{ '--cat-color': subModalCat.color } as React.CSSProperties}
                onClick={() => {
                  const cat = subModalCat
                  if (!cat.isActive) {
                    // Activating — just toggle, update local state
                    optimisticToggle(cat)
                    setSubModalCat(prev => prev ? { ...prev, isActive: true } : null)
                  } else {
                    // Deactivating — may trigger migration modal; close sub modal first
                    setSubModalCat(null)
                    setNewSubValue('')
                    handleToggle(cat)
                  }
                }}
              >
                {subModalCat.isActive ? 'Активна' : 'Вимкнена'}
              </button>
            </div>

            {/* Subcategories */}
            <div className={styles.subModalSection}>
              <span className={styles.subModalSectionTitle}>Підкатегорії</span>
              {subCatsOfModal.length === 0 ? (
                <p className={styles.subEmpty}>Немає підкатегорій</p>
              ) : (
                <div className={styles.subList}>
                  {subCatsOfModal.map(sub => (
                    <div key={sub._id} className={styles.subItem}>
                      <span className={styles.subItemName}>{sub.name}</span>
                      <button
                        type="button"
                        className={styles.subItemDel}
                        onClick={() => handleDeleteSub(sub._id)}
                        aria-label={`Видалити ${sub.name}`}
                      >
                        <XSmallIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add sub */}
              <div className={styles.subAddRow}>
                <input
                  ref={subAddRef}
                  type="text"
                  value={newSubValue}
                  onChange={e => setNewSubValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSub() } }}
                  className={styles.subAddInput}
                  placeholder="Нова підкатегорія..."
                  maxLength={24}
                  disabled={savingSub}
                />
                <button
                  type="button"
                  className={styles.subAddBtn}
                  onClick={handleAddSub}
                  disabled={savingSub || !newSubValue.trim()}
                  aria-label="Додати підкатегорію"
                >
                  <PlusIcon />
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Migration sheet ── */}
      <Modal
        isOpen={migrateOpen}
        onClose={() => { if (!migrating) { setMigrateOpen(false); setMigrateFrom(null) } }}
        title="Перенести транзакції"
        draggable
      >
        <div className={styles.migrateBody}>
          <p className={styles.migrateHint}>
            Категорія <strong>{migrateFrom?.name}</strong> використовується в транзакціях.
            Перенести їх в:
          </p>
          <div className={styles.migrateList}>
            {migrationTargets.map(cat => (
              <button
                key={cat._id}
                type="button"
                className={styles.migrateItem}
                style={{ '--cat-color': cat.color } as React.CSSProperties}
                onClick={() => handleMigrate(cat.name)}
                disabled={migrating}
              >
                <div className={styles.migrateItemIcon}>
                  <i className={`ti ${cat.icon}`} />
                </div>
                <span className={styles.migrateItemName}>{cat.name}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.migrateNone}
            onClick={() => handleMigrate(null)}
            disabled={migrating}
          >
            Залишити без категорії
          </button>
        </div>
      </Modal>
    </div>
  )
}

// ── CatCard ──────────────────────────────────────────────────────────────────

/**
 * CatCard
 * -------
 * Картка категорії витрат для 3-колонкового гриду.
 * Активна — кольоровий border; неактивна — dimmed.
 * Для кастомних категорій показує кнопку видалення.
 *
 * Props:
 * @prop {Category}       cat       — категорія
 * @prop {() => void}     onToggle  — toggle isActive
 * @prop {() => void}     [onDelete]— видалити (тільки custom)
 */
interface CatCardProps {
  cat: Category
  onToggle: () => void
  onDelete?: () => void
}

const CatCard: React.FC<CatCardProps> = ({ cat, onToggle, onDelete }) => (
  <div
    className={`${styles.catCard} ${cat.isActive ? styles.catCardActive : styles.catCardInactive}`}
    style={{ '--cat-color': cat.color } as React.CSSProperties}
    onClick={onToggle}
    role="button"
    tabIndex={0}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
    aria-pressed={cat.isActive}
    aria-label={cat.name}
  >
    {onDelete && (
      <button
        type="button"
        className={styles.catCardDel}
        onClick={e => { e.stopPropagation(); onDelete() }}
        aria-label={`Видалити ${cat.name}`}
      >
        <XSmallIcon />
      </button>
    )}
    <div className={styles.catCardIcon}>
      <i className={`ti ${cat.icon}`} />
    </div>
    <span className={styles.catCardName}>{cat.name}</span>
    <div className={styles.catCardCheck}>
      {cat.isActive && <CheckIcon />}
    </div>
  </div>
)

export default ProfilePage

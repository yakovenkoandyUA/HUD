import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../../store/profileStore'
import { useUiStore } from '../../store/uiStore'
import { useCategoryStore } from '../../store/categoryStore'
import { authFetch } from '../../services/api'
import { uploadToCloudinary } from '../../utils/uploadToCloudinary'
import type { Category } from '../../types'
import styles from './ProfilePage.module.css'

/**
 * ProfilePage
 * -----------
 * Сторінка профілю: аватар, ім'я (inline edit) та управління категоріями витрат.
 * Категорії беруться з useCategoryStore: базові (isDefault) — тільки toggle isActive;
 * кастомні — toggle + видалення.
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

// const TrashIcon: React.FC = () => (
//   <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
//     <path d="M2 3.5h10M5 3.5V2.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M3.5 3.5l.8 8h5.4l.8-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
//   </svg>
// )

// ── Toggle switch ─────────────────────────────────────────────────────────────
interface ToggleProps { on: boolean; onToggle: () => void }
const Toggle: React.FC<ToggleProps> = ({ on, onToggle }) => (
  <button
    type="button"
    className={`${styles.toggle} ${on ? styles.toggleOn : ''}`}
    onClick={onToggle}
    aria-label={on ? 'Вимкнути' : 'Увімкнути'}
  />
)

// ── Component ────────────────────────────────────────────────────────────────

const ProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const { activeProfile, updateProfile } = useProfileStore()
  const { showToast } = useUiStore()
  const { categories, fetchCategories, addCategory, removeCategory, toggleActive } = useCategoryStore()

  const [nameInput, setNameInput]         = useState(activeProfile?.name ?? '')
  const [editingName, setEditingName]     = useState(false)
  const [savingName, setSavingName]       = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [addingCat, setAddingCat]   = useState(false)
  const [newCatValue, setNewCatValue] = useState('')
  const [savingCat, setSavingCat]   = useState(false)

  const fileRef   = useRef<HTMLInputElement>(null)
  const nameRef   = useRef<HTMLInputElement>(null)
  const newCatRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchCategories() }, [fetchCategories])

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

  if (!activeProfile) return null

  const defaultCats = categories.filter(c => c.isDefault)
  const customCats  = categories.filter(c => !c.isDefault)

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

        {/* ── Categories ── */}
        <section className={styles.section}>
          <span className={styles.sectionTitle}>КАТЕГОРІЇ ВИТРАТ</span>

          {/* Default categories */}
          {defaultCats.map(cat => (
            <CatRow
              key={cat._id}
              cat={cat}
              onToggle={() => toggleActive(cat._id)}
              onDelete={null}
            />
          ))}

          {/* Custom categories */}
          {customCats.map(cat => (
            <CatRow
              key={cat._id}
              cat={cat}
              onToggle={() => toggleActive(cat._id)}
              onDelete={() => deleteCat(cat._id)}
            />
          ))}

          {/* Add new */}
          {addingCat ? (
            <div className={styles.addCatRow}>
              <input
                ref={newCatRef}
                type="text"
                value={newCatValue}
                onChange={e => setNewCatValue(e.target.value)}
                onBlur={() => { if (!newCatValue.trim()) setAddingCat(false) }}
                onKeyDown={handleNewCatKeyDown}
                className={styles.addCatInput}
                placeholder="Назва категорії"
                maxLength={32}
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
              Додати категорію
            </button>
          )}
        </section>
      </div>
    </div>
  )
}

// ── Category row ──────────────────────────────────────────────────────────────
interface CatRowProps {
  cat: Category
  onToggle: () => void
  onDelete: (() => void) | null
}

const CatRow: React.FC<CatRowProps> = ({ cat, onToggle, onDelete }) => (
  <div className={`${styles.catRow} ${!cat.isActive ? styles.catRowInactive : ''}`}>
    <div
      className={styles.catIconWrap}
      style={{ '--cat-color': cat.color } as React.CSSProperties}
    >
      <i className={`ti ${cat.icon}`} />
    </div>
    <span className={styles.catName}>{cat.name}</span>
    <div className={styles.catActions}>
      <Toggle on={cat.isActive} onToggle={onToggle} />
      {onDelete && (
        <button
          type="button"
          className={styles.deleteCatBtn}
          onClick={onDelete}
          aria-label={`Видалити ${cat.name}`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 3.5h10M5 3.5V2.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M3.5 3.5l.8 8h5.4l.8-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  </div>
)

export default ProfilePage

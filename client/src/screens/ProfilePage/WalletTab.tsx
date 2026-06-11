import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useProfileStore } from '../../store/profileStore'
import { useUiStore } from '../../store/uiStore'
import { useCategoryStore } from '../../store/categoryStore'
import { authFetch } from '../../services/api'
import Modal from '../../components/ui/Modal'
import type { Category } from '../../types'
import styles from './ProfilePage.module.css'

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

/**
 * WalletTab
 * ---------
 * Вкладка "Гаманець" — день зарплати та управління категоріями витрат.
 */
const WalletTab: React.FC = () => {
  const { activeProfile, updateProfile } = useProfileStore()
  const { showToast } = useUiStore()
  const { categories, fetchCategories, addCategory, removeCategory, toggleActive } = useCategoryStore()

  // Salary day
  const [salaryDay, setSalaryDay]   = useState(activeProfile?.salaryDay ?? 1)
  const [savingSalary, setSavingSalary] = useState(false)
  const salaryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Categories
  const [addingCat, setAddingCat]   = useState(false)
  const [newCatValue, setNewCatValue] = useState('')
  const [savingCat, setSavingCat]   = useState(false)
  const newCatRef = useRef<HTMLInputElement>(null)

  const [migrateOpen, setMigrateOpen] = useState(false)
  const [migrateFrom, setMigrateFrom] = useState<Category | null>(null)
  const [migrating, setMigrating]   = useState(false)

  const [subModalCat, setSubModalCat]   = useState<Category | null>(null)
  const [newSubValue, setNewSubValue]   = useState('')
  const [savingSub, setSavingSub]       = useState(false)
  const subAddRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchCategories() }, [fetchCategories])
  useEffect(() => { if (addingCat) newCatRef.current?.focus() }, [addingCat])

  const handleSalaryDayChange = (val: number) => {
    const clamped = Math.min(31, Math.max(1, val))
    setSalaryDay(clamped)
    if (salaryDebounceRef.current) clearTimeout(salaryDebounceRef.current)
    salaryDebounceRef.current = setTimeout(async () => {
      setSavingSalary(true)
      try {
        await updateProfile({ salaryDay: clamped })
        showToast('Збережено', 'success')
      } catch {
        showToast('Помилка збереження', 'error')
      } finally {
        setSavingSalary(false)
      }
    }, 800)
  }

  const saveNewCat = useCallback(async () => {
    const trimmed = newCatValue.trim()
    if (!trimmed) { setAddingCat(false); return }
    setSavingCat(true)
    try {
      const res = await authFetch('/api/categories', { method: 'POST', body: JSON.stringify({ name: trimmed }) })
      if (res.ok) {
        const created: Category = await res.json()
        addCategory(created)
        setNewCatValue(''); setAddingCat(false)
      }
    } catch {
      showToast('Помилка збереження', 'error')
    } finally {
      setSavingCat(false)
    }
  }, [newCatValue, addCategory, showToast])

  const deleteCat = useCallback((id: string) => {
    removeCategory(id)
    authFetch(`/api/categories/${id}`, { method: 'DELETE' }).catch(() => {})
  }, [removeCategory])

  const optimisticToggle = useCallback((cat: Category) => { toggleActive(cat._id) }, [toggleActive])

  const handleToggle = useCallback(async (cat: Category) => {
    if (cat.isActive) {
      try {
        const res = await authFetch(`/api/transactions/count?category=${encodeURIComponent(cat.name)}`)
        if (res.ok) {
          const { count } = await res.json() as { count: number }
          if (count > 0) { setMigrateFrom(cat); setMigrateOpen(true); return }
        }
      } catch { /* proceed */ }
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
      setMigrating(false); setMigrateOpen(false); setMigrateFrom(null)
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

  const handleDeleteSub = useCallback((subId: string) => {
    removeCategory(subId)
    authFetch(`/api/categories/${subId}`, { method: 'DELETE' }).catch(() => {})
  }, [removeCategory])

  if (!activeProfile) return null

  const topLevelCats     = categories.filter(c => !c.parentId)
  const defaultCats      = topLevelCats.filter(c => c.isDefault)
  const customCats       = topLevelCats.filter(c => !c.isDefault)
  const activeCount      = topLevelCats.filter(c => c.isActive).length
  const migrationTargets = topLevelCats.filter(c => c.isActive && c._id !== migrateFrom?._id)
  const subCatsOfModal   = subModalCat ? categories.filter(c => c.parentId === subModalCat._id) : []

  return (
    <div className={styles.tabContent}>
      {/* ── Salary day ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>ДЕНЬ ЗАРПЛАТИ</span>
          {savingSalary && <span className={styles.sectionTag}>Зберігаю...</span>}
        </div>
        <p className={styles.sectionHint}>
          Від цього числа рахується щоденний бюджет до наступної зарплати.
        </p>
        <div className={styles.salaryRow}>
          <button
            type="button"
            className={styles.salaryStepBtn}
            onClick={() => handleSalaryDayChange(salaryDay - 1)}
            disabled={salaryDay <= 1}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className={styles.salaryValue}>
            <span className={styles.salaryNum}>{salaryDay}</span>
            <span className={styles.salaryUnit}>число місяця</span>
          </div>
          <button
            type="button"
            className={styles.salaryStepBtn}
            onClick={() => handleSalaryDayChange(salaryDay + 1)}
            disabled={salaryDay >= 31}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </section>

      {/* ── Default categories ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>БАЗОВІ КАТЕГОРІЇ</span>
          <span className={styles.sectionCount}>{defaultCats.filter(c => c.isActive).length}/{defaultCats.length}</span>
        </div>
        <div className={styles.catGrid}>
          {defaultCats.map(cat => (
            <CatCard key={cat._id} cat={cat} onToggle={() => setSubModalCat(cat)} />
          ))}
        </div>
      </section>

      {/* ── Custom categories ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>МОЇ КАТЕГОРІЇ</span>
          <span className={styles.sectionCount}>{customCats.filter(c => c.isActive).length}/{customCats.length}</span>
        </div>
        <div className={styles.catGrid}>
          {customCats.map(cat => (
            <CatCard key={cat._id} cat={cat} onToggle={() => setSubModalCat(cat)} onDelete={() => deleteCat(cat._id)} />
          ))}
          {addingCat ? (
            <div className={styles.addCatCard}>
              <input
                ref={newCatRef}
                type="text"
                value={newCatValue}
                onChange={e => setNewCatValue(e.target.value)}
                onBlur={() => { if (!newCatValue.trim()) setAddingCat(false) }}
                onKeyDown={e => { if (e.key === 'Enter') saveNewCat(); if (e.key === 'Escape') { setNewCatValue(''); setAddingCat(false) } }}
                className={styles.addCatInput}
                placeholder="Назва"
                maxLength={24}
                disabled={savingCat}
              />
              <button type="button" className={styles.addCatSaveBtn} onClick={saveNewCat} disabled={savingCat || !newCatValue.trim()}>
                <CheckIcon />
              </button>
            </div>
          ) : (
            <button type="button" className={styles.addCatBtn} onClick={() => setAddingCat(true)}>
              <PlusIcon /><span>Нова</span>
            </button>
          )}
        </div>
      </section>

      <div className={styles.totalActive}><span>{activeCount} активних категорій</span></div>

      {/* ── SubCategory modal ── */}
      <Modal isOpen={!!subModalCat} onClose={() => { setSubModalCat(null); setNewSubValue('') }} title={subModalCat?.name ?? ''} draggable>
        {subModalCat && (
          <div className={styles.subModalBody}>
            <div
              className={`${styles.subModalCatHeader} ${subModalCat.isActive ? styles.subModalCatHeaderActive : ''}`}
              style={{ '--cat-color': subModalCat.color } as React.CSSProperties}
            >
              <div className={styles.subModalCatIcon}><i className={`ti ${subModalCat.icon}`} /></div>
              <span className={styles.subModalCatName}>{subModalCat.name}</span>
              <button
                type="button"
                className={`${styles.subModalToggleBtn} ${subModalCat.isActive ? styles.subModalToggleBtnActive : ''}`}
                style={{ '--cat-color': subModalCat.color } as React.CSSProperties}
                onClick={() => {
                  const cat = subModalCat
                  if (!cat.isActive) {
                    optimisticToggle(cat)
                    setSubModalCat(prev => prev ? { ...prev, isActive: true } : null)
                  } else {
                    setSubModalCat(null); setNewSubValue('')
                    handleToggle(cat)
                  }
                }}
              >
                {subModalCat.isActive ? 'Активна' : 'Вимкнена'}
              </button>
            </div>
            <div className={styles.subModalSection}>
              <span className={styles.subModalSectionTitle}>Підкатегорії</span>
              {subCatsOfModal.length === 0 ? (
                <p className={styles.subEmpty}>Немає підкатегорій</p>
              ) : (
                <div className={styles.subList}>
                  {subCatsOfModal.map(sub => (
                    <div key={sub._id} className={styles.subItem}>
                      <span className={styles.subItemName}>{sub.name}</span>
                      <button type="button" className={styles.subItemDel} onClick={() => handleDeleteSub(sub._id)}>
                        <XSmallIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                <button type="button" className={styles.subAddBtn} onClick={handleAddSub} disabled={savingSub || !newSubValue.trim()}>
                  <PlusIcon />
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Migration modal ── */}
      <Modal isOpen={migrateOpen} onClose={() => { if (!migrating) { setMigrateOpen(false); setMigrateFrom(null) } }} title="Перенести транзакції" draggable>
        <div className={styles.migrateBody}>
          <p className={styles.migrateHint}>
            Категорія <strong>{migrateFrom?.name}</strong> використовується в транзакціях. Перенести їх в:
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
                <div className={styles.migrateItemIcon}><i className={`ti ${cat.icon}`} /></div>
                <span className={styles.migrateItemName}>{cat.name}</span>
              </button>
            ))}
          </div>
          <button type="button" className={styles.migrateNone} onClick={() => handleMigrate(null)} disabled={migrating}>
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
 * Картка категорії витрат (3-колонковий грид).
 *
 * Props:
 * @prop {Category}   cat       — категорія
 * @prop {() => void} onToggle  — відкрити SubCategory modal
 * @prop {() => void} [onDelete]— видалити (тільки custom)
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
      <button type="button" className={styles.catCardDel} onClick={e => { e.stopPropagation(); onDelete() }} aria-label={`Видалити ${cat.name}`}>
        <XSmallIcon />
      </button>
    )}
    <div className={styles.catCardIcon}><i className={`ti ${cat.icon}`} /></div>
    <span className={styles.catCardName}>{cat.name}</span>
    <div className={styles.catCardCheck}>{cat.isActive && <CheckIcon />}</div>
  </div>
)

export default WalletTab

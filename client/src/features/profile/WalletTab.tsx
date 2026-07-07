import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useCategoryStore } from '@/features/finance/store/categoryStore'
import { useBankStore } from '@/features/finance/store/bankStore'
import { authFetch } from '@/shared/services/api'
import Modal from '@/shared/components/ui/Modal'
import { INCOME_CATEGORIES } from '@/features/finance/constants'
import type { Category } from '@/shared/types'
import styles from './ProfilePage.module.css'

// Category names that belong to income, not expense
const INCOME_NAMES = new Set(['інвестиції', 'заощадження'])

const CAT_PALETTE = [
  '#22C55E', '#EAB308', '#8B5CF6', '#06B6D4', '#78716C',
  '#EF4444', '#D946EF', '#10B981', '#F472B6', '#3B82F6',
  '#38BDF8', '#F97316', '#6366F1', '#0369A1', '#FB923C', '#9CA3AF',
]

const ICON_OPTIONS = [
  'ti-shopping-cart', 'ti-coffee', 'ti-building', 'ti-home', 'ti-bolt',
  'ti-pill', 'ti-sparkles', 'ti-barbell', 'ti-shirt', 'ti-car',
  'ti-plane', 'ti-movie', 'ti-book', 'ti-heart-handshake', 'ti-dots',
  'ti-briefcase', 'ti-device-laptop', 'ti-gift', 'ti-pig-money', 'ti-music',
  'ti-phone', 'ti-camera', 'ti-activity-heartbeat', 'ti-bus', 'ti-bike',
  'ti-scissors', 'ti-leaf', 'ti-paw', 'ti-tool', 'ti-ticket',
  'ti-map', 'ti-school', 'ti-star', 'ti-wallet', 'ti-tag',
]

const ANALYST_STYLES: { id: string; emoji: string; label: string }[] = [
  { id: 'standard',   emoji: '📊', label: 'Стандартний' },
  { id: 'coach',      emoji: '💪', label: 'Тренер' },
  { id: 'yoda',       emoji: '🟢', label: 'Йода' },
  { id: 'kozak',      emoji: '⚔️', label: 'Козак' },
  { id: 'motivator',  emoji: '🚀', label: 'Мотиватор' },
  { id: 'accountant', emoji: '🔢', label: 'Бухгалтер' },
]

function pickColor(usedColors: string[]): string {
  const available = CAT_PALETTE.filter(c => !usedColors.includes(c))
  const pool = available.length > 0 ? available : CAT_PALETTE
  return pool[Math.floor(Math.random() * pool.length)]
}

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
 * Вкладка "Гаманець" — рахунки банків, день зарплати, категорії витрат.
 */
const WalletTab: React.FC = () => {
  const { activeProfile, updateProfile } = useProfileStore()
  const { showToast } = useUiStore()
  const { categories, fetchCategories, addCategory, removeCategory, toggleActive } = useCategoryStore()
  const {
    connection, loading: bankLoading, syncing,
    fetchStatus, disconnect, sync,
    authPending, authAcceptUrl, authTokenRequestId,
    cancelMonoAuth, pollMonoAuth,
  } = useBankStore()

  // Salary day
  const [salaryDay, setSalaryDay]   = useState(activeProfile?.salaryDay ?? 1)
  const [savingSalary, setSavingSalary] = useState(false)
  const salaryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Categories
  const [addingCat, setAddingCat]   = useState(false)
  const [newCatValue, setNewCatValue] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('ti-tag')
  const [newCatColor, setNewCatColor] = useState('#9CA3AF')
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [savingCat, setSavingCat]   = useState(false)
  const newCatRef = useRef<HTMLInputElement>(null)

  const [catTab, setCatTab] = useState<'expense' | 'income'>('expense')

  const [migrateOpen, setMigrateOpen] = useState(false)
  const [migrateFrom, setMigrateFrom] = useState<Category | null>(null)
  const [migrating, setMigrating]   = useState(false)

  const [subModalCat, setSubModalCat]   = useState<Category | null>(null)
  const [newSubValue, setNewSubValue]   = useState('')
  const [savingSub, setSavingSub]       = useState(false)
  const subAddRef = useRef<HTMLInputElement>(null)

  // Manual token fallback
  const [showManual, setShowManual] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [connecting, setConnecting] = useState(false)
  const { connect } = useBankStore()

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { fetchStatus() }, [fetchStatus])
  useEffect(() => { fetchCategories() }, [fetchCategories])
  useEffect(() => { if (addingCat) newCatRef.current?.focus() }, [addingCat])

  // Start polling when tokenRequestId is set
  useEffect(() => {
    if (!authTokenRequestId) {
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null }
      return
    }
    let cancelled = false
    const poll = async () => {
      if (cancelled) return
      const done = await pollMonoAuth(authTokenRequestId)
      if (done && !cancelled) {
        showToast('Monobank підключено', 'success')
      }
    }
    pollTimerRef.current = setInterval(poll, 2000)
    return () => {
      cancelled = true
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null }
    }
  }, [authTokenRequestId, pollMonoAuth, showToast])


  const handleConnect = useCallback(async () => {
    if (!tokenInput.trim() || connecting) return
    setConnecting(true)
    try {
      await connect(tokenInput.trim())
      setTokenInput('')
      setShowManual(false)
      showToast('Monobank підключено', 'success')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Помилка підключення', 'error')
    } finally {
      setConnecting(false)
    }
  }, [tokenInput, connecting, connect, showToast])

  const handleDisconnect = useCallback(async () => {
    await disconnect()
    showToast('Рахунок відключено', 'success')
  }, [disconnect, showToast])

  const handleSync = useCallback(async () => {
    try {
      const { imported } = await sync()
      showToast(imported > 0 ? `Імпортовано ${imported} транзакцій` : 'Нових транзакцій немає', 'success')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Помилка синхронізації', 'error')
    }
  }, [sync, showToast])

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
    if (!trimmed) { setAddingCat(false); setIconPickerOpen(false); return }
    setSavingCat(true)
    try {
      const res = await authFetch('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: trimmed, icon: newCatIcon, color: newCatColor }),
      })
      if (res.ok) {
        const created: Category = await res.json()
        addCategory(created)
        setNewCatValue(''); setAddingCat(false); setIconPickerOpen(false)
      }
    } catch {
      showToast('Помилка збереження', 'error')
    } finally {
      setSavingCat(false)
    }
  }, [newCatValue, newCatIcon, newCatColor, addCategory, showToast])

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
  const expenseCats      = topLevelCats.filter(c => !INCOME_NAMES.has(c.name.toLowerCase()))
  const defaultCats      = expenseCats.filter(c => c.isDefault)
  const customCats       = expenseCats.filter(c => !c.isDefault)
  const activeCount      = expenseCats.filter(c => c.isActive).length
  const migrationTargets = expenseCats.filter(c => c.isActive && c._id !== migrateFrom?._id)
  const subCatsOfModal   = subModalCat ? categories.filter(c => c.parentId === subModalCat._id) : []

  const formatLastSync = (iso: string | null) => {
    if (!iso) return null
    const d = new Date(iso)
    const today = new Date()
    const isToday = d.toDateString() === today.toDateString()
    const time = d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
    return isToday ? `сьогодні ${time}` : d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }) + ` ${time}`
  }

  return (
    <div className={styles.tabContent}>

      {/* ── Bank accounts ── */}
      <div className={styles.settingsCard}>
        <div className={styles.cardTitle}>РАХУНКИ</div>

        {bankLoading ? (
          <div className={styles.cardRow}><span className={styles.pushSub}>Завантаження...</span></div>
        ) : connection ? (
          <div className={styles.cardRow}>
            <div className={styles.bankCardLeft}>
              <div className={styles.bankCardDot} />
              <div>
                <span className={styles.cardRowLabel}>Monobank</span>
                <span className={styles.pushSub}>{connection.accountName}</span>
                {connection.lastSync && (
                  <span className={styles.pushSub}>Sync: {formatLastSync(connection.lastSync)}</span>
                )}
              </div>
            </div>
            <div className={styles.bankCardActions}>
              <button
                type="button"
                className={styles.bankSyncBtn}
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? '...' : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                  </svg>
                )}
              </button>
              <button type="button" className={styles.bankDisconnectBtn} onClick={handleDisconnect}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        ) : authPending && authAcceptUrl ? (
          <div className={styles.cardPadded}>
            <div className={styles.monoAuthCard}>
              <div className={styles.monoAuthTop}>
                <div className={styles.monoAuthSpinner} />
                <span className={styles.monoAuthWait}>Очікую підтвердження в Monobank...</span>
              </div>
              <a
                href={authAcceptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.monoAuthOpenBtn}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                  <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                Відкрити Monobank
              </a>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(authAcceptUrl)}`}
                alt="QR"
                className={styles.monoAuthQr}
              />
              <p className={styles.monoAuthQrHint}>або відскануйте QR у застосунку</p>
              <button type="button" className={styles.monoAuthCancelBtn} onClick={cancelMonoAuth}>
                Скасувати
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.cardPadded}>
            {!showManual ? (
              <button type="button" className={styles.bankAddBtn} onClick={() => setShowManual(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="2" width="14" height="20" rx="2"/>
                  <line x1="12" y1="18" x2="12" y2="18" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                <span>Підключити Monobank</span>
              </button>
            ) : (
              <div className={styles.bankConnectForm}>
                <div className={styles.bankConnectSteps}>
                  <span className={styles.bankConnectStep}>1. Відкрий Monobank API</span>
                  <span className={styles.bankConnectStep}>2. Активуй токен (копіюється тільки раз!)</span>
                  <span className={styles.bankConnectStep}>3. Встав сюди:</span>
                </div>
                <a
                  href="https://api.monobank.ua"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.bankApiLink}
                >
                  Відкрити api.monobank.ua
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
                <div className={styles.bankConnectRow}>
                  <input
                    type="text"
                    className={styles.bankTokenInput}
                    placeholder="u_xxxxxxxxxxxxxxxxxxxx"
                    value={tokenInput}
                    onChange={e => setTokenInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleConnect() }}
                    disabled={connecting}
                    autoFocus
                  />
                  <button type="button" className={styles.bankConnectBtn} onClick={handleConnect} disabled={connecting || !tokenInput.trim()}>
                    {connecting ? '...' : <CheckIcon />}
                  </button>
                  <button type="button" className={styles.bankCancelBtn} onClick={() => { setShowManual(false); setTokenInput('') }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Salary day ── */}
      <div className={styles.settingsCard}>
        <div className={styles.cardTitle}>
          ДЕНЬ ЗАРПЛАТИ
          {savingSalary && <span className={styles.pushSub} style={{ marginLeft: 8, textTransform: 'none', fontFamily: 'var(--font-ui)' }}>Зберігаю...</span>}
        </div>
        <div className={styles.cardRow}>
          <div>
            <div className={styles.cardRowLabel}>Число місяця</div>
            <div className={styles.pushSub}>Від цього числа рахується денний бюджет</div>
          </div>
          <div className={styles.salaryStepperCompact}>
            <button
              type="button"
              className={styles.salaryStepCompactBtn}
              onClick={() => handleSalaryDayChange(salaryDay - 1)}
              disabled={salaryDay <= 1}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <span className={styles.salaryNumCompact}>{salaryDay}</span>
            <button
              type="button"
              className={styles.salaryStepCompactBtn}
              onClick={() => handleSalaryDayChange(salaryDay + 1)}
              disabled={salaryDay >= 31}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── AI Analyst style ── */}
      <div className={styles.settingsCard}>
        <div className={styles.cardTitle}>СТИЛЬ АНАЛІТИКА</div>
        <div className={styles.pushSub} style={{ marginBottom: 12 }}>
          Вибери манеру в якій AI подає місячний звіт
        </div>
        <div className={styles.styleGrid}>
          {ANALYST_STYLES.map(s => (
            <button
              key={s.id}
              type="button"
              className={`${styles.styleChip} ${(activeProfile?.reportStyle ?? 'standard') === s.id ? styles.styleChipActive : ''}`}
              onClick={async () => {
                if ((activeProfile?.reportStyle ?? 'standard') === s.id) return
                await updateProfile({ reportStyle: s.id })
              }}
            >
              <span className={styles.styleEmoji}>{s.emoji}</span>
              <span className={styles.styleLabel}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Categories ── */}
      <div className={styles.settingsCard}>
        {/* Tab switcher */}
        <div className={styles.catTabBar}>
          <button
            type="button"
            className={`${styles.catTabBtn} ${catTab === 'expense' ? styles.catTabBtnActive : ''}`}
            onClick={() => setCatTab('expense')}
          >
            Витрати
          </button>
          <button
            type="button"
            className={`${styles.catTabBtn} ${catTab === 'income' ? styles.catTabBtnActive : ''}`}
            onClick={() => setCatTab('income')}
          >
            Поповнення
          </button>
        </div>

        {catTab === 'expense' ? (
          <>
            <div className={styles.cardTitle}>
              БАЗОВІ
              <span className={styles.navPinCount}>{defaultCats.filter(c => c.isActive).length}/{defaultCats.length}</span>
            </div>
            <div className={styles.cardPadded}>
              <div className={styles.catGrid}>
                {defaultCats.map(cat => (
                  <CatCard key={cat._id} cat={cat} onToggle={() => setSubModalCat(cat)} />
                ))}
              </div>
            </div>

            {customCats.length > 0 || !addingCat ? (
              <>
                <div className={styles.cardDivider} />
                <div className={styles.cardTitle}>
                  МОЇ
                  <span className={styles.navPinCount}>{customCats.filter(c => c.isActive).length}/{customCats.length}</span>
                </div>
              </>
            ) : null}
            <div className={styles.cardPadded}>
              <div className={styles.catGrid}>
                {customCats.map(cat => (
                  <CatCard key={cat._id} cat={cat} onToggle={() => setSubModalCat(cat)} onDelete={() => deleteCat(cat._id)} />
                ))}
                {addingCat ? (
                  <div className={styles.addCatCard}>
                    <div className={styles.addCatRow}>
                      <div className={styles.addCatIconWrap}>
                        <button
                          type="button"
                          className={styles.addCatIconBtn}
                          style={{ '--cat-color': newCatColor } as React.CSSProperties}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => setIconPickerOpen(v => !v)}
                          aria-label="Вибрати іконку"
                        >
                          <i className={`ti ${newCatIcon}`} />
                        </button>
                      </div>
                      <input
                        ref={newCatRef}
                        type="text"
                        value={newCatValue}
                        onChange={e => setNewCatValue(e.target.value)}
                        onBlur={() => { if (!newCatValue.trim() && !iconPickerOpen) setAddingCat(false) }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); saveNewCat() }
                          if (e.key === 'Escape') { setNewCatValue(''); setAddingCat(false); setIconPickerOpen(false) }
                        }}
                        className={styles.addCatInput}
                        placeholder="Назва категорії"
                        maxLength={24}
                        disabled={savingCat}
                      />
                      <button type="button" className={styles.addCatSaveBtn} onMouseDown={e => e.preventDefault()} onClick={saveNewCat} disabled={savingCat || !newCatValue.trim()}>
                        <CheckIcon />
                      </button>
                      <button type="button" className={styles.addCatCancelBtn} onMouseDown={e => e.preventDefault()} onClick={() => { setAddingCat(false); setNewCatValue(''); setIconPickerOpen(false) }}>
                        <XSmallIcon />
                      </button>
                    </div>
                    {iconPickerOpen && (
                      <div className={styles.iconPicker}>
                        {ICON_OPTIONS.map(icon => (
                          <button
                            key={icon}
                            type="button"
                            className={`${styles.iconPickerBtn} ${newCatIcon === icon ? styles.iconPickerBtnActive : ''}`}
                            style={newCatIcon === icon ? { '--cat-color': newCatColor } as React.CSSProperties : undefined}
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => { setNewCatIcon(icon); setIconPickerOpen(false) }}
                            aria-label={icon}
                          >
                            <i className={`ti ${icon}`} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.addCatBtn}
                    onClick={() => {
                      const usedColors = categories.filter(c => !c.parentId).map(c => c.color)
                      setNewCatColor(pickColor(usedColors))
                      setNewCatIcon('ti-tag')
                      setAddingCat(true)
                    }}
                  >
                    <PlusIcon /><span>Нова</span>
                  </button>
                )}
              </div>
            </div>
            <div className={styles.totalActive}><span>{activeCount} активних категорій</span></div>
          </>
        ) : (
          <>
            <div className={styles.cardPadded}>
              <p className={styles.pushSub} style={{ marginBottom: 8 }}>
                Ці категорії доступні при поповненні балансу. Вони завжди активні.
              </p>
              <div className={styles.catGrid}>
                {INCOME_CATEGORIES.map(cat => (
                  <div
                    key={cat.id}
                    className={`${styles.catCard} ${styles.catCardActive}`}
                    style={{ '--cat-color': cat.color } as React.CSSProperties}
                  >
                    <div className={styles.catCardIcon}><i className={`ti ${cat.icon}`} /></div>
                    <span className={styles.catCardName}>{cat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

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
 * Pill-чіп категорії витрат. Активна — кольорова, неактивна — сіра.
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
    <div className={styles.catCardIcon}><i className={`ti ${cat.icon}`} /></div>
    <span className={styles.catCardName}>{cat.name}</span>
    {onDelete && (
      <button type="button" className={styles.catCardDel} onClick={e => { e.stopPropagation(); onDelete() }} aria-label={`Видалити ${cat.name}`}>
        <XSmallIcon />
      </button>
    )}
  </div>
)

export default WalletTab

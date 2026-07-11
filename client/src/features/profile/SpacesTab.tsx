import React, { useEffect, useRef, useState } from 'react'
import { useSpacesStore } from '@/features/memories/store/spacesStore'
import type { Space, SpaceType } from '@/features/memories/store/spacesStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { usePlan } from '@/shared/hooks/usePlan'
import UpgradePrompt from '@/shared/components/ui/UpgradePrompt'
import PillSelector from '@/shared/components/ui/PillSelector'
import { SPACE_TEMPLATES } from './spaceTemplates'
import styles from './SpacesTab.module.css'

const TYPE_OPTIONS: { value: SpaceType; label: string }[] = [
  { value: 'personal', label: 'Особистий' },
  { value: 'shared',   label: 'Спільний'  },
  { value: 'trip',     label: 'Поїздка'   },
  { value: 'family',   label: "Сім'я"     },
  { value: 'friends',  label: 'Друзі'     },
  { value: 'hobby',    label: 'Хобі'      },
  { value: 'sports',   label: 'Спорт'     },
  { value: 'project',  label: 'Проект'    },
  { value: 'vehicle',  label: 'Авто'      },
  { value: 'home',     label: 'Дім'       },
  { value: 'pet',      label: 'Улюбленець'},
]

const COLORS = [
  '#9b59b6', '#3498db', '#2ecc71', '#e74c3c',
  '#f39c12', '#1abc9c', '#e91e8c', '#607d8b',
]

/**
 * SpacesTab
 * ---------
 * Список просторів юзера + створення/редагування/управління учасниками.
 * Простір = іменований контекст (поїздка, хобі, сім'я тощо) до якого
 * прив'язуються спогади і плани.
 */
const SpacesTab: React.FC = () => {
  const {
    spaces, archivedSpaces, loading,
    fetchSpaces, fetchArchived, createSpace, deleteSpace,
    addMember, removeMember, archiveSpace, unarchiveSpace,
  } = useSpacesStore()
  const { activeProfile } = useProfileStore()
  const { showToast } = useUiStore()
  const { limits, can, isAtLimit } = usePlan()

  // ── Sheets state ──
  const [createOpen, setCreateOpen] = useState(false)
  const [createStep, setCreateStep] = useState<'template' | 'form'>('template')
  const [detailSpace, setDetailSpace] = useState<Space | null>(null)

  // ── Create form ──
  const [newName, setNewName]   = useState('')
  const [newType, setNewType]   = useState<SpaceType>('shared')
  const [newColor, setNewColor] = useState(COLORS[0])
  const [creating, setCreating] = useState(false)

  // ── Detail / members ──
  const [memberInput, setMemberInput]   = useState('')
  const [addingMember, setAddingMember] = useState(false)

  // ── Archived accordion ──
  const [archivedOpen, setArchivedOpen] = useState(false)
  const archivedFetchedRef = useRef(false)

  // ── Swipe to dismiss ──
  const createOverlayRef = useRef<HTMLDivElement>(null)
  const detailOverlayRef = useRef<HTMLDivElement>(null)
  const createSheetRef = useSwipeToDismiss(() => setCreateOpen(false), { enabled: createOpen, overlayRef: createOverlayRef })
  const detailSheetRef = useSwipeToDismiss(() => setDetailSpace(null),  { enabled: !!detailSpace, overlayRef: detailOverlayRef })

  useEffect(() => { fetchSpaces() }, [fetchSpaces])

  // keep detailSpace in sync when store updates
  useEffect(() => {
    if (!detailSpace) return
    const updated = spaces.find(s => s.id === detailSpace.id)
    if (updated) setDetailSpace(updated)
  }, [spaces, detailSpace])

  const openCreate = () => {
    setNewName(''); setNewType('shared'); setNewColor(COLORS[0])
    setCreateStep('template')
    setCreateOpen(true)
  }

  const pickTemplate = (tpl: typeof SPACE_TEMPLATES[number] | null) => {
    if (tpl) {
      setNewName(tpl.defaultName)
      setNewType(tpl.type)
      setNewColor(tpl.color)
    }
    setCreateStep('form')
  }

  const toggleArchived = () => {
    const next = !archivedOpen
    setArchivedOpen(next)
    if (next && !archivedFetchedRef.current) {
      archivedFetchedRef.current = true
      fetchArchived()
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    let cancelled = false
    const submit = async () => {
      setCreating(true)
      try {
        await createSpace({ name: newName.trim(), type: newType, color: newColor })
        if (!cancelled) { setCreateOpen(false); showToast('Простір створено', 'success') }
      } catch {
        if (!cancelled) showToast('Помилка створення', 'error')
      } finally {
        if (!cancelled) setCreating(false)
      }
    }
    submit()
    return () => { cancelled = true }
  }

  const handleAddMember = async () => {
    if (!detailSpace || !memberInput.trim()) return
    let cancelled = false
    const submit = async () => {
      setAddingMember(true)
      try {
        await addMember(detailSpace.id, memberInput.trim())
        if (!cancelled) { setMemberInput(''); showToast('Учасника додано', 'success') }
      } catch (err) {
        if (!cancelled) showToast(err instanceof Error ? err.message : 'Не знайдено', 'error')
      } finally {
        if (!cancelled) setAddingMember(false)
      }
    }
    submit()
    return () => { cancelled = true }
  }

  const handleRemoveMember = async (spaceId: string, userId: string) => {
    let cancelled = false
    const submit = async () => {
      try {
        await removeMember(spaceId, userId)
        if (!cancelled) showToast('Видалено', 'success')
      } catch {
        if (!cancelled) showToast('Помилка', 'error')
      }
    }
    submit()
    return () => { cancelled = true }
  }

  const handleDelete = async (space: Space) => {
    let cancelled = false
    const submit = async () => {
      try {
        await deleteSpace(space.id)
        if (!cancelled) { setDetailSpace(null); showToast('Простір видалено', 'success') }
      } catch {
        if (!cancelled) showToast('Помилка', 'error')
      }
    }
    submit()
    return () => { cancelled = true }
  }

  const handleArchive = async (space: Space) => {
    let cancelled = false
    const submit = async () => {
      try {
        await archiveSpace(space.id)
        if (!cancelled) {
          setDetailSpace(null)
          showToast('Простір архівовано', 'success')
          // refresh archived list if open
          if (archivedOpen) fetchArchived()
        }
      } catch {
        if (!cancelled) showToast('Помилка архівування', 'error')
      }
    }
    submit()
    return () => { cancelled = true }
  }

  const handleUnarchive = async (spaceId: string) => {
    let cancelled = false
    const submit = async () => {
      try {
        await unarchiveSpace(spaceId)
        if (!cancelled) showToast('Простір відновлено', 'success')
      } catch {
        if (!cancelled) showToast('Помилка', 'error')
      }
    }
    submit()
    return () => { cancelled = true }
  }

  const myId = activeProfile?.id ?? ''

  return (
    <div className={styles.root}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <span className={styles.title}>
          ПРОСТОРИ
          {limits.maxSpaces !== -1 && (
            <span className={styles.titleCount}> {spaces.length}/{limits.maxSpaces}</span>
          )}
        </span>
        {isAtLimit('maxSpaces', spaces.length) ? (
          <UpgradePrompt limitKey="maxSpaces" currentCount={spaces.length} compact />
        ) : (
          <button type="button" className={styles.addBtn} onClick={openCreate} aria-label="Створити простір">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>
      {!can('sharedSpaces') && (
        <p className={styles.sharedHint}>Спільні простори доступні з плану Shared Life</p>
      )}

      {/* ── Empty state ── */}
      {!loading && spaces.length === 0 && (
        <div className={styles.empty}>
          <p className={styles.emptyText}>Просторів ще немає.</p>
          <p className={styles.emptySub}>Створи перший — поїздку, хобі або спільний з партнером.</p>
          <button type="button" className={styles.emptyBtn} onClick={openCreate}>Створити простір</button>
        </div>
      )}

      {/* ── Spaces list ── */}
      <div className={styles.list}>
        {spaces.map(space => (
          <button
            key={space.id}
            type="button"
            className={styles.spaceCard}
            onClick={() => { setMemberInput(''); setDetailSpace(space) }}
          >
            <span className={styles.spaceColor} style={{ background: space.color }} />
            <span className={styles.spaceInfo}>
              <span className={styles.spaceName}>{space.name}</span>
              <span className={styles.spaceMeta}>
                {TYPE_OPTIONS.find(t => t.value === space.type)?.label ?? space.type}
                {' · '}
                {space.members.length} {space.members.length === 1 ? 'учасник' : 'учасники'}
              </span>
            </span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={styles.spaceChevron}>
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ))}
      </div>

      {/* ── Archived accordion ── */}
      <button type="button" className={styles.archivedToggle} onClick={toggleArchived}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <rect x="1" y="4" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M1 6.5h12" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M4 1.5h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M5.5 3h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <span>Архів</span>
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
          className={`${styles.archivedChevron} ${archivedOpen ? styles.archivedChevronOpen : ''}`}
        >
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className={`${styles.archivedList} ${archivedOpen ? styles.archivedListOpen : ''}`}>
        {archivedSpaces.length === 0 ? (
          <p className={styles.archivedEmpty}>Архівованих просторів немає</p>
        ) : (
          archivedSpaces.map(space => (
            <div key={space.id} className={styles.archivedCard}>
              <span className={styles.spaceColor} style={{ background: space.color }} />
              <span className={styles.spaceInfo}>
                <span className={styles.spaceName}>{space.name}</span>
                <span className={styles.spaceMeta}>
                  {TYPE_OPTIONS.find(t => t.value === space.type)?.label ?? space.type}
                </span>
              </span>
              <button
                type="button"
                className={styles.unarchiveBtn}
                onClick={() => handleUnarchive(space.id)}
                aria-label="Відновити простір"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 11V3M4 6l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* ══ Create Sheet ══ */}
      {createOpen && (
        <div className={styles.overlay} ref={createOverlayRef} onClick={() => setCreateOpen(false)}>
          <div className={styles.sheet} ref={createSheetRef} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />

            {createStep === 'template' ? (
              <>
                <h2 className={styles.sheetTitle}>Який простір?</h2>
                <div className={styles.templateGrid}>
                  {SPACE_TEMPLATES.map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      className={styles.templateCard}
                      onClick={() => pickTemplate(tpl)}
                    >
                      <span className={styles.templateDot} style={{ background: tpl.color }} />
                      <span className={styles.templateLabel}>{tpl.label}</span>
                      <span className={styles.templateDesc}>{tpl.description}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`${styles.templateCard} ${styles.templateCardBlank}`}
                    onClick={() => pickTemplate(null)}
                  >
                    <span className={styles.templateDotBlank}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                      </svg>
                    </span>
                    <span className={styles.templateLabel}>Порожній</span>
                    <span className={styles.templateDesc}>Почати з нуля</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.formBack}>
                  <button type="button" className={styles.formBackBtn} onClick={() => setCreateStep('template')}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <h2 className={styles.sheetTitle} style={{ margin: 0 }}>Новий простір</h2>
                </div>

                <label className={styles.fieldLabel}>НАЗВА</label>
                <input
                  className={styles.input}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Наприклад, Japan Trip 2027…"
                  maxLength={60}
                  autoFocus
                />

                <label className={styles.fieldLabel}>ТИП</label>
                <PillSelector
                  options={TYPE_OPTIONS}
                  value={newType}
                  onChange={setNewType}
                  className={styles.typePicker}
                />

                <label className={styles.fieldLabel}>КОЛІР</label>
                <div className={styles.colorRow}>
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`${styles.colorDot} ${newColor === c ? styles.colorDotOn : ''}`}
                      style={{ background: c }}
                      onClick={() => setNewColor(c)}
                      aria-label={c}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                >
                  {creating ? 'Створюємо…' : 'Створити'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ Detail Sheet ══ */}
      {detailSpace && (
        <div className={styles.overlay} ref={detailOverlayRef} onClick={() => setDetailSpace(null)}>
          <div className={styles.sheet} ref={detailSheetRef} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />

            <div className={styles.detailHeader}>
              <span className={styles.detailColor} style={{ background: detailSpace.color }} />
              <div>
                <h2 className={styles.sheetTitle} style={{ marginBottom: 2 }}>{detailSpace.name}</h2>
                <span className={styles.detailType}>
                  {TYPE_OPTIONS.find(t => t.value === detailSpace.type)?.label ?? detailSpace.type}
                </span>
              </div>
            </div>

            {/* Members */}
            <label className={styles.fieldLabel} style={{ marginTop: 20 }}>УЧАСНИКИ</label>
            <div className={styles.memberList}>
              {detailSpace.members.map(m => (
                <div key={m.userId} className={styles.memberRow}>
                  <div className={styles.memberAvatar}>
                    {m.avatarUrl
                      ? <img src={m.avatarUrl} alt={m.name} className={styles.memberAvatarImg} />
                      : <span className={styles.memberInitial}>{m.name[0]?.toUpperCase()}</span>
                    }
                  </div>
                  <div className={styles.memberInfo}>
                    <span className={styles.memberName}>{m.name}</span>
                    <span className={styles.memberUsername}>@{m.username}</span>
                  </div>
                  {m.role === 'owner'
                    ? <span className={styles.ownerBadge}>власник</span>
                    : (detailSpace.ownerId === myId || m.userId === myId) && (
                        <button
                          type="button"
                          className={styles.removeBtn}
                          onClick={() => handleRemoveMember(detailSpace.id, m.userId)}
                          aria-label="Видалити"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                          </svg>
                        </button>
                      )
                  }
                </div>
              ))}
            </div>

            {/* Add member (owner only) */}
            {detailSpace.ownerId === myId && (
              <>
                <label className={styles.fieldLabel} style={{ marginTop: 16 }}>ДОДАТИ УЧАСНИКА</label>
                <div className={styles.addMemberRow}>
                  <input
                    className={styles.input}
                    value={memberInput}
                    onChange={e => setMemberInput(e.target.value)}
                    placeholder="username"
                    onKeyDown={e => { if (e.key === 'Enter') handleAddMember() }}
                  />
                  <button
                    type="button"
                    className={styles.addMemberBtn}
                    onClick={handleAddMember}
                    disabled={addingMember || !memberInput.trim()}
                  >
                    {addingMember ? '…' : 'Додати'}
                  </button>
                </div>
              </>
            )}

            {/* Archive + Delete (owner only) */}
            {detailSpace.ownerId === myId && (
              <div className={styles.ownerActions}>
                <button
                  type="button"
                  className={styles.archiveBtn}
                  onClick={() => handleArchive(detailSpace)}
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                    <rect x="1" y="4.5" width="13" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M1 7.5h13" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M4.5 1.5h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M6 3h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  Архівувати
                </button>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(detailSpace)}
                >
                  Видалити
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SpacesTab

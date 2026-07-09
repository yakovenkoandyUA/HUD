import React, { useEffect, useRef, useState } from 'react'
import { useSpacesStore } from '@/features/memories/store/spacesStore'
import type { Space, SpaceType } from '@/features/memories/store/spacesStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { usePlan } from '@/shared/hooks/usePlan'
import UpgradePrompt from '@/shared/components/ui/UpgradePrompt'
import PillSelector from '@/shared/components/ui/PillSelector'
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
  const { spaces, loading, fetchSpaces, createSpace, deleteSpace, addMember, removeMember } = useSpacesStore()
  const { activeProfile } = useProfileStore()
  const { showToast } = useUiStore()
  const { limits, can, isAtLimit } = usePlan()

  // ── Sheets state ──
  const [createOpen, setCreateOpen] = useState(false)
  const [detailSpace, setDetailSpace] = useState<Space | null>(null)

  // ── Create form ──
  const [newName, setNewName]   = useState('')
  const [newType, setNewType]   = useState<SpaceType>('shared')
  const [newColor, setNewColor] = useState(COLORS[0])
  const [creating, setCreating] = useState(false)

  // ── Detail / members ──
  const [memberInput, setMemberInput]   = useState('')
  const [addingMember, setAddingMember] = useState(false)

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
    setCreateOpen(true)
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

      {/* ══ Create Sheet ══ */}
      {createOpen && (
        <div className={styles.overlay} ref={createOverlayRef} onClick={() => setCreateOpen(false)}>
          <div className={styles.sheet} ref={createSheetRef} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h2 className={styles.sheetTitle}>Новий простір</h2>

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

            {/* Delete (owner only) */}
            {detailSpace.ownerId === myId && (
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={() => handleDelete(detailSpace)}
              >
                Видалити простір
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SpacesTab

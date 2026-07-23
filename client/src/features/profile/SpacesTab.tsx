import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSpacesStore } from '@/features/memories/store/spacesStore'
import type { Space, SpaceType, VehicleProfile, PetProfile, TripProfile } from '@/features/memories/store/spacesStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { usePlan } from '@/shared/hooks/usePlan'
import UpgradePrompt from '@/shared/components/ui/UpgradePrompt'
import PillSelector from '@/shared/components/ui/PillSelector'
import { authFetch } from '@/shared/services/api'
import { useFamilyStore } from '@/shared/store/familyStore'
import { SPACE_TEMPLATES } from './spaceTemplates'
import { SPACE_TYPE_CONFIG } from '@/features/spaces/data/spaceTypes'
import styles from './SpacesTab.module.css'


const MODULES = [
  { id: 'finance', label: 'Фінанси' },
  { id: 'tasks',   label: 'Квести'  },
]

const DEFAULT_MODULES: Partial<Record<SpaceType, string[]>> = {
  trip:    ['finance'],
  vehicle: ['finance', 'tasks'],
  home:    ['finance', 'tasks'],
  pet:     ['finance', 'tasks'],
  sports:  ['tasks'],
}

const TYPE_OPTIONS: { value: SpaceType; label: string }[] = [
  { value: 'trip',    label: 'Поїздка'    },
  { value: 'vehicle', label: 'Авто'       },
  { value: 'home',    label: 'Дім'        },
  { value: 'pet',     label: 'Улюбленець' },
  { value: 'sports',  label: 'Спорт'      },
]

const PET_SPECIES = [
  { value: 'dog',    label: 'Собака' },
  { value: 'cat',    label: 'Кіт'    },
  { value: 'bird',   label: 'Птах'   },
  { value: 'rabbit', label: 'Кролик' },
  { value: 'other',  label: 'Інший'  },
] as const

const TRIP_STATUS = [
  { value: 'planning',  label: 'Планується' },
  { value: 'ongoing',   label: 'Зараз'      },
  { value: 'completed', label: 'Завершена'  },
] as const

// '' = default (uses theme accent)
const COLORS = [
  '', '#7c3aed', '#2563eb', '#0ea5e9', '#059669',
  '#d97706', '#f97316', '#e11d48', '#db2777', '#475569',
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
    fetchSpaces, fetchArchived, createSpace, updateSpace, deleteSpace,
    addMember, removeMember, archiveSpace, unarchiveSpace,
    setVehicleProfile, setPetProfile, setTripProfile,
  } = useSpacesStore()
  const navigate = useNavigate()
  const { activeProfile } = useProfileStore()
  const { showToast } = useUiStore()
  const { limits, can, isAtLimit } = usePlan()
  const family = useFamilyStore(s => s.accepted)
  const fetchFamily = useFamilyStore(s => s.fetchFamily)

  // ── Sheets state ──
  const [createOpen, setCreateOpen] = useState(false)
  const [createStep, setCreateStep] = useState<'template' | 'form'>('template')
  const [detailSpace, setDetailSpace] = useState<Space | null>(null)

  // ── Create form ──
  const [newName, setNewName]           = useState('')
  const [newType, setNewType]           = useState<SpaceType>('trip')
  const [newColor, setNewColor]         = useState(COLORS[0])
  const [newModules, setNewModules]     = useState<string[]>([])
  const [newMembers, setNewMembers]     = useState<string[]>([])
  const [creating, setCreating]         = useState(false)
  const [fromTemplate, setFromTemplate] = useState(false)

  // ── Vehicle profile fields (create) ──
  const [vehicleMake,  setVehicleMake]  = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehicleYear,  setVehicleYear]  = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')

  // ── Pet profile fields (create) ──
  const [petName,    setPetName]    = useState('')
  const [petSpecies, setPetSpecies] = useState('')
  const [petBreed,   setPetBreed]   = useState('')

  // ── Detail / members ──
  const [memberInput, setMemberInput]   = useState('')
  const [addingMember, setAddingMember] = useState(false)

  // ── Inline name edit ──
  const [editingName, setEditingName] = useState(false)
  const [nameInput,   setNameInput]   = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  // ── Notes (description) ──
  const [notesInput, setNotesInput] = useState('')

  // ── Vehicle profile edit (detail) ──
  const [vMake,  setVMake]  = useState('')
  const [vModel, setVModel] = useState('')
  const [vYear,  setVYear]  = useState('')
  const [vPlate, setVPlate] = useState('')

  // ── Pet profile edit (detail) ──
  const [pName,    setPName]    = useState('')
  const [pSpecies, setPSpecies] = useState('')
  const [pBreed,   setPBreed]   = useState('')

  // ── Trip profile edit (detail) ──
  const [tDest,   setTDest]   = useState('')
  const [tStatus, setTStatus] = useState<'planning' | 'booked' | 'ongoing' | 'completed'>('planning')

  // ── Archived accordion ──
  const [archivedOpen, setArchivedOpen] = useState(false)
  const archivedFetchedRef = useRef(false)

  // ── Swipe to dismiss ──
  const createOverlayRef = useRef<HTMLDivElement>(null)
  const detailOverlayRef = useRef<HTMLDivElement>(null)
  const createSheetRef = useSwipeToDismiss(() => setCreateOpen(false), { enabled: createOpen, overlayRef: createOverlayRef })
  const detailSheetRef = useSwipeToDismiss(() => setDetailSpace(null),  { enabled: !!detailSpace, overlayRef: detailOverlayRef })

  useEffect(() => { fetchSpaces() }, [fetchSpaces])
  useEffect(() => { fetchFamily() }, [fetchFamily])

  // keep detailSpace in sync when store updates
  useEffect(() => {
    if (!detailSpace) return
    const updated = spaces.find(s => s.id === detailSpace.id)
    if (updated) setDetailSpace(updated)
  }, [spaces, detailSpace])

  const resetProfileFields = () => {
    setVehicleMake(''); setVehicleModel(''); setVehicleYear(''); setVehiclePlate('')
    setPetName(''); setPetSpecies(''); setPetBreed('')
  }

  const openCreate = () => {
    setNewName(''); setNewType('trip'); setNewColor(COLORS[0])
    setNewModules([]); setNewMembers([])
    setFromTemplate(false)
    resetProfileFields()
    setCreateStep('template')
    setCreateOpen(true)
  }

  const pickTemplate = (tpl: typeof SPACE_TEMPLATES[number] | null) => {
    if (tpl) {
      setNewName(tpl.defaultName)
      setNewType(tpl.type)
      setNewColor(tpl.color)
      setNewModules(DEFAULT_MODULES[tpl.type] ?? [])
      setFromTemplate(true)
    } else {
      setNewModules([])
      setFromTemplate(false)
    }
    setNewMembers([])
    resetProfileFields()
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
    if (!newName.trim() || creating) return
    setCreating(true)
    try {
      const space = await createSpace({ name: newName.trim(), type: newType, color: newColor, modules: newModules })
      if (newMembers.length > 0) {
        await Promise.allSettled(newMembers.map(username => addMember(space.id, username)))
      }

      if (newType === 'vehicle') {
        const body: Record<string, unknown> = {}
        if (vehicleMake.trim())  body.make        = vehicleMake.trim()
        if (vehicleModel.trim()) body.model       = vehicleModel.trim()
        const yr = parseInt(vehicleYear)
        if (!isNaN(yr) && yr > 1900) body.year   = yr
        if (vehiclePlate.trim()) body.plateNumber = vehiclePlate.trim().toUpperCase()
        if (Object.keys(body).length) {
          authFetch(`/api/spaces/${space.id}/vehicle/profile`, {
            method: 'PATCH',
            body: JSON.stringify(body),
          }).catch(() => {})
        }
      }

      if (newType === 'pet') {
        const body: Record<string, unknown> = {}
        if (petName.trim())  body.name    = petName.trim()
        if (petSpecies)      body.species = petSpecies
        if (petBreed.trim()) body.breed   = petBreed.trim()
        if (Object.keys(body).length) {
          authFetch(`/api/spaces/${space.id}/pet/profile`, {
            method: 'PATCH',
            body: JSON.stringify(body),
          }).catch(() => {})
        }
      }

      setCreateOpen(false)
      showToast('Простір створено', 'success')
    } catch {
      showToast('Помилка створення', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleSaveName = async () => {
    if (!detailSpace || !nameInput.trim() || nameInput.trim() === detailSpace.name) {
      setEditingName(false)
      return
    }
    let cancelled = false
    const run = async () => {
      try {
        await updateSpace(detailSpace.id, { name: nameInput.trim() })
        if (!cancelled) showToast('Назву змінено', 'success')
      } catch {
        if (!cancelled) showToast('Помилка збереження', 'error')
      } finally {
        if (!cancelled) setEditingName(false)
      }
    }
    run()
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

  const openDetail = (space: Space) => {
    setMemberInput('')
    setNotesInput(space.notes ?? '')
    if (space.vehicleProfile) {
      setVMake(space.vehicleProfile.make ?? '')
      setVModel(space.vehicleProfile.model ?? '')
      setVYear(space.vehicleProfile.year != null ? String(space.vehicleProfile.year) : '')
      setVPlate(space.vehicleProfile.plateNumber ?? '')
    }
    if (space.petProfile) {
      setPName(space.petProfile.name ?? '')
      setPSpecies(space.petProfile.species ?? '')
      setPBreed(space.petProfile.breed ?? '')
    }
    if (space.tripProfile) {
      setTDest(space.tripProfile.destination ?? '')
      setTStatus(space.tripProfile.status ?? 'planning')
    }
    setDetailSpace(space)
  }

  const handleSaveNotes = () => {
    if (!detailSpace || notesInput === (detailSpace.notes ?? '')) return
    let cancelled = false
    const run = async () => {
      try {
        await updateSpace(detailSpace.id, { notes: notesInput })
      } catch {
        if (!cancelled) showToast('Помилка збереження', 'error')
      }
    }
    run()
    return () => { cancelled = true }
  }

  const handleSaveVehicleProfile = () => {
    if (!detailSpace) return
    const cur = detailSpace.vehicleProfile
    const body: Record<string, unknown> = {}
    if (vMake.trim()  !== (cur?.make          ?? '')) body.make        = vMake.trim()
    if (vModel.trim() !== (cur?.model         ?? '')) body.model       = vModel.trim()
    const yr = parseInt(vYear)
    if (!isNaN(yr) && yr !== cur?.year)               body.year        = yr
    if (vPlate.trim() !== (cur?.plateNumber   ?? '')) body.plateNumber = vPlate.trim().toUpperCase()
    if (!Object.keys(body).length) return
    let cancelled = false
    const run = async () => {
      try {
        const res = await authFetch(`/api/spaces/${detailSpace.id}/vehicle/profile`, {
          method: 'PATCH', body: JSON.stringify(body),
        })
        if (res.ok && !cancelled) {
          const updated: VehicleProfile = await res.json()
          setVehicleProfile(detailSpace.id, updated)
          showToast('Збережено', 'success')
        }
      } catch {
        if (!cancelled) showToast('Помилка збереження', 'error')
      }
    }
    run()
    return () => { cancelled = true }
  }

  const handleSavePetProfile = () => {
    if (!detailSpace) return
    const cur = detailSpace.petProfile
    const body: Record<string, unknown> = {}
    if (pName.trim()  !== (cur?.name    ?? '')) body.name    = pName.trim()
    if (pSpecies      !== (cur?.species ?? '')) body.species = pSpecies
    if (pBreed.trim() !== (cur?.breed   ?? '')) body.breed   = pBreed.trim()
    if (!Object.keys(body).length) return
    let cancelled = false
    const run = async () => {
      try {
        const res = await authFetch(`/api/spaces/${detailSpace.id}/pet/profile`, {
          method: 'PATCH', body: JSON.stringify(body),
        })
        if (res.ok && !cancelled) {
          const updated: PetProfile = await res.json()
          setPetProfile(detailSpace.id, updated)
          showToast('Збережено', 'success')
        }
      } catch {
        if (!cancelled) showToast('Помилка збереження', 'error')
      }
    }
    run()
    return () => { cancelled = true }
  }

  const handleSaveTripProfile = () => {
    if (!detailSpace) return
    const cur = detailSpace.tripProfile
    const body: Record<string, unknown> = {}
    if (tDest.trim() !== (cur?.destination ?? '')) body.destination = tDest.trim()
    if (tStatus      !== (cur?.status      ?? 'planning')) body.status = tStatus
    if (!Object.keys(body).length) return
    let cancelled = false
    const run = async () => {
      try {
        const res = await authFetch(`/api/spaces/${detailSpace.id}/trip/profile`, {
          method: 'PATCH', body: JSON.stringify(body),
        })
        if (res.ok && !cancelled) {
          const updated: TripProfile = await res.json()
          setTripProfile(detailSpace.id, updated)
          showToast('Збережено', 'success')
        }
      } catch {
        if (!cancelled) showToast('Помилка збереження', 'error')
      }
    }
    run()
    return () => { cancelled = true }
  }

  return (
		<div className={styles.root}>
			{/* ── Header ── */}
			<div className={styles.header}>
				<span className={styles.title}>
					ПРОСТОРИ
					{limits.maxSpaces !== -1 && (
						<span className={styles.titleCount}>
							{' '}
							{spaces.length}/{limits.maxSpaces}
						</span>
					)}
				</span>
				{isAtLimit('maxSpaces', spaces.length) ? (
					<UpgradePrompt limitKey="maxSpaces" currentCount={spaces.length} compact />
				) : (
					<button type="button" className={styles.addBtn} onClick={openCreate} aria-label="Створити простір">
						<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
							<path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
						</svg>
					</button>
				)}
			</div>
			{!can('sharedSpaces') && <p className={styles.sharedHint}>Спільні простори доступні з плану Shared Life</p>}

			{/* ── Empty state ── */}
			{!loading && spaces.length === 0 && (
				<div className={styles.empty}>
					<p className={styles.emptyText}>Просторів ще немає.</p>
					<p className={styles.emptySub}>Створи перший — поїздку, хобі або спільний з партнером.</p>
					<button type="button" className={styles.emptyBtn} onClick={openCreate}>
						Створити простір
					</button>
				</div>
			)}

			{/* ── Spaces list ── */}
			<div className={styles.list}>
				{spaces.map(space => {
					const cfg = SPACE_TYPE_CONFIG[space.type]
					const typeColor = cfg?.color ?? '#888'

					return (
						<button
							key={space.id}
							type="button"
							className={styles.spaceCard}
							style={{ '--space-color': space.color, '--type-color': typeColor } as React.CSSProperties}
							onClick={() => openDetail(space)}
						>
							<div className={styles.spaceIconZone}>{cfg && <img src={cfg.iconSrc} alt="" className={cfg.isCover ? styles.spaceIconImgCover : styles.spaceIconImg} draggable={false} />}</div>
							<div className={styles.spaceInfo}>
								<span className={styles.spaceName}>{space.name}</span>
							</div>
						</button>
					)
				})}
			</div>

			{/* ── Archived accordion ── */}
			<button type="button" className={styles.archivedToggle} onClick={toggleArchived}>
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
					<rect x="1" y="4" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
					<path d="M1 6.5h12" stroke="currentColor" strokeWidth="1.4" />
					<path d="M4 1.5h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
					<path d="M5.5 3h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
				</svg>
				<span>Архів</span>
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className={`${styles.archivedChevron} ${archivedOpen ? styles.archivedChevronOpen : ''}`}>
					<path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</button>

			<div className={`${styles.archivedList} ${archivedOpen ? styles.archivedListOpen : ''}`}>
				{archivedSpaces.length === 0 ? (
					<p className={styles.archivedEmpty}>Архівованих просторів немає</p>
				) : (
					archivedSpaces.map(space => (
						<div key={space.id} className={styles.archivedCard}>
							<span className={styles.spaceColorDot} style={{ background: space.color }} />
							<span className={styles.spaceInfo}>
								<span className={styles.spaceName}>{space.name}</span>
								<span className={styles.spaceType}>{TYPE_OPTIONS.find(t => t.value === space.type)?.label ?? space.type}</span>
							</span>
							<button type="button" className={styles.unarchiveBtn} onClick={() => handleUnarchive(space.id)} aria-label="Відновити простір">
								<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
									<path d="M7 11V3M4 6l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</button>
						</div>
					))
				)}
			</div>

			{/* ══ Create Sheet ══ */}
			{createOpen && (
				<div className={styles.overlay} ref={createOverlayRef} onClick={() => setCreateOpen(false)}>
					<div
						className={styles.sheet}
						ref={createSheetRef}
						onClick={e => e.stopPropagation()}
						onAnimationEnd={e => {
							e.currentTarget.style.animation = 'none'
						}}
					>
						<div className={styles.sheetHandle} />

						{createStep === 'template' ? (
							<>
								<h2 className={styles.sheetTitle}>Який простір?</h2>
								<div className={styles.templateGrid}>
									{SPACE_TEMPLATES.map(tpl => {
										const cfg = SPACE_TYPE_CONFIG[tpl.type]
										return (
											<button key={tpl.id} type="button" className={styles.templateCard} style={{ '--type-color': cfg?.color ?? '#888' } as React.CSSProperties} onClick={() => pickTemplate(tpl)}>
												<div className={styles.templateIconZone}>
													{cfg && (
														<img
															src={cfg.iconSrc}
															alt=""
															aria-hidden="true"
															className={cfg.isCover ? styles.templateIconImgCover : undefined}
															width={cfg.isCover ? undefined : 70}
															height={cfg.isCover ? undefined : 70}
														/>
													)}
												</div>
												<div className={styles.templateCardBody}>
													<span className={styles.templateLabel}>{tpl.label}</span>
												</div>
											</button>
										)
									})}
									<button
										type="button"
										className={`${styles.templateCard} ${styles.templateCardBlank}`}
										style={{ '--type-color': '#71717a' } as React.CSSProperties}
										onClick={() => pickTemplate(null)}
									>
										<div className={styles.templateIconZone}>
											<img src="/space-identifiers-transparent/space_personal.png" alt="" aria-hidden="true" className={styles.templateIconImgCover} />
										</div>
										<div className={styles.templateCardBody}>
											<span className={styles.templateLabel}>Свій простір</span>
										</div>
									</button>
								</div>
							</>
						) : (
							<>
								<div className={styles.formBack}>
									<button type="button" className={styles.formBackBtn} onClick={() => setCreateStep('template')}>
										<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
											<path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
										</svg>
									</button>
									<h2 className={styles.sheetTitle} style={{ margin: 0 }}>
										Новий простір
									</h2>
								</div>

								<label className={styles.fieldLabel}>НАЗВА</label>
								<input className={styles.input} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Наприклад, Japan Trip 2027…" maxLength={60} autoFocus />

								{!fromTemplate && (
									<>
										<label className={styles.fieldLabel}>ТИП</label>
										<PillSelector options={TYPE_OPTIONS} value={newType} onChange={v => setNewType(v as SpaceType)} className={styles.typePicker} />
									</>
								)}

								<label className={styles.fieldLabel}>КОЛІР</label>
								<div className={styles.colorRow}>
									{COLORS.map(c => (
										<button key={c || 'default'} type="button" className={`${styles.colorDot} ${c === '' ? styles.colorDotDefault : ''} ${newColor === c ? styles.colorDotOn : ''}`} style={c ? { background: c } : undefined} onClick={() => setNewColor(c)} aria-label={c || 'За замовчуванням'} />
									))}
								</div>

								{/* ── Модулі ── */}
								<hr className={styles.profileDivider} />
								<p className={styles.profileSectionLabel}>МОДУЛІ</p>
								<div className={styles.chipRow}>
									{MODULES.map(mod => (
										<button
											key={mod.id}
											type="button"
											className={`${styles.chip} ${newModules.includes(mod.id) ? styles.chipOn : ''}`}
											onClick={() => setNewModules(prev => (prev.includes(mod.id) ? prev.filter(m => m !== mod.id) : [...prev, mod.id]))}
										>
											{mod.label}
										</button>
									))}
								</div>

								{/* ── Учасники (family) ── */}
								{family.length > 0 && (
									<>
										<p className={styles.profileSectionLabel}>УЧАСНИКИ</p>
										<div className={styles.familyPickRow}>
											{family.map(m => {
												const on = newMembers.includes(m.username)
												return (
													<button
														key={m.id}
														type="button"
														className={`${styles.familyPickChip} ${on ? styles.familyPickChipOn : ''}`}
														onClick={() => setNewMembers(prev => (prev.includes(m.username) ? prev.filter(u => u !== m.username) : [...prev, m.username]))}
													>
														<div className={styles.memberAvatar} style={{ width: 28, height: 28 }}>
															{m.avatarUrl ? (
																<img src={m.avatarUrl} alt={m.name} className={styles.memberAvatarImg} />
															) : (
																<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{m.name[0]?.toUpperCase()}</span>
															)}
														</div>
														<span className={styles.familyPickName}>{m.name}</span>
														{on && (
															<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
																<path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
														)}
													</button>
												)
											})}
										</div>
									</>
								)}

								{/* ── Авто: додаткові поля ── */}
								{newType === 'vehicle' && (
									<>
										<hr className={styles.profileDivider} />
										<p className={styles.profileSectionLabel}>ПРО АВТОМОБІЛЬ</p>
										<div className={styles.fieldGrid2}>
											<input className={styles.input} value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} placeholder="Марка" maxLength={40} />
											<input className={styles.input} value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder="Модель" maxLength={40} />
											<input
												className={styles.input}
												value={vehicleYear}
												onChange={e => setVehicleYear(e.target.value)}
												placeholder="Рік"
												type="number"
												min={1900}
												max={new Date().getFullYear() + 1}
											/>
											<input className={styles.input} value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)} placeholder="Держ. номер" maxLength={10} />
										</div>
									</>
								)}

								{/* ── Улюбленець: додаткові поля ── */}
								{newType === 'pet' && (
									<>
										<hr className={styles.profileDivider} />
										<p className={styles.profileSectionLabel}>ПРО УЛЮБЛЕНЦЯ</p>
										<input className={styles.input} value={petName} onChange={e => setPetName(e.target.value)} placeholder="Ім'я тварини" maxLength={40} />
										<div className={styles.chipRow}>
											{(
												[
													{ value: 'dog', label: 'Собака' },
													{ value: 'cat', label: 'Кіт' },
													{ value: 'bird', label: 'Птах' },
													{ value: 'rabbit', label: 'Кролик' },
													{ value: 'other', label: 'Інший' },
												] as const
											).map(s => (
												<button
													key={s.value}
													type="button"
													className={`${styles.chip} ${petSpecies === s.value ? styles.chipOn : ''}`}
													onClick={() => setPetSpecies(petSpecies === s.value ? '' : s.value)}
												>
													{s.label}
												</button>
											))}
										</div>
										<input className={styles.input} value={petBreed} onChange={e => setPetBreed(e.target.value)} placeholder="Порода (опційно)" maxLength={40} />
									</>
								)}

								<button type="button" className={styles.primaryBtn} onClick={handleCreate} disabled={creating || !newName.trim()}>
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
					<div
						className={styles.sheet}
						ref={detailSheetRef}
						onClick={e => e.stopPropagation()}
						onAnimationEnd={e => {
							e.currentTarget.style.animation = 'none'
						}}
					>
						<div className={styles.sheetHandle} />

						<div className={styles.detailHeader}>
							<span className={styles.detailColor} style={{ background: detailSpace.color }} />
							<div className={styles.detailTitleWrap}>
								{editingName ? (
									<input
										ref={nameInputRef}
										className={styles.nameInput}
										value={nameInput}
										onChange={e => setNameInput(e.target.value)}
										onBlur={handleSaveName}
										onKeyDown={e => {
											if (e.key === 'Enter') {
												e.preventDefault()
												handleSaveName()
											}
											if (e.key === 'Escape') setEditingName(false)
										}}
										autoFocus
										maxLength={60}
									/>
								) : (
									<div className={styles.nameRow}>
										<h2 className={styles.sheetTitle} style={{ marginBottom: 0 }}>
											{detailSpace.name}
										</h2>
										{detailSpace.ownerId === myId && (
											<button
												type="button"
												className={styles.editNameBtn}
												onClick={() => {
													setEditingName(true)
													setNameInput(detailSpace.name)
												}}
												aria-label="Редагувати назву"
											>
												<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
													<path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13l-3 1 1-3 8.5-8.5z" />
												</svg>
											</button>
										)}
										<button
											type="button"
											className={styles.openSpaceBtn}
											onClick={() => {
												setDetailSpace(null)
												navigate(`/spaces/${detailSpace.id}`)
											}}
											aria-label="Відкрити простір"
										>
											<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
												<path d="M5 2h7v7M12 2L6 8" />
												<path d="M8 5H2v7h7V8" />
											</svg>
										</button>
									</div>
								)}
								<span className={styles.detailType}>{TYPE_OPTIONS.find(t => t.value === detailSpace.type)?.label ?? detailSpace.type}</span>
								{(detailSpace.memoriesCount > 0 || detailSpace.openTasksCount > 0 || detailSpace.notesCount > 0) && (
									<div className={styles.detailMetrics}>
										{detailSpace.memoriesCount > 0 && (
											<span className={styles.detailMetricBadge}>
												{detailSpace.memoriesCount} {detailSpace.memoriesCount === 1 ? 'спогад' : 'спогади'}
											</span>
										)}
										{detailSpace.openTasksCount > 0 && (
											<span className={styles.detailMetricBadge}>
												{detailSpace.openTasksCount} {detailSpace.openTasksCount === 1 ? 'задача' : 'задачі'}
											</span>
										)}
										{detailSpace.notesCount > 0 && (
											<span className={styles.detailMetricBadge}>
												{detailSpace.notesCount} {detailSpace.notesCount === 1 ? 'нотатка' : 'нотатки'}
											</span>
										)}
									</div>
								)}
							</div>
						</div>

						{/* Color (owner only) */}
						{detailSpace.ownerId === myId && (
							<>
								<label className={styles.fieldLabel} style={{ marginTop: 20 }}>
									КОЛІР
								</label>
								<div className={styles.colorRow}>
									{COLORS.map(c => (
										<button
											key={c || 'default'}
											type="button"
											className={`${styles.colorDot} ${c === '' ? styles.colorDotDefault : ''} ${detailSpace.color === c ? styles.colorDotOn : ''}`}
											style={c ? { background: c } : undefined}
											onClick={() => updateSpace(detailSpace.id, { color: c })}
											aria-label={c || 'За замовчуванням'}
										/>
									))}
								</div>
							</>
						)}

						{/* Notes / description (owner only) */}
						{detailSpace.ownerId === myId && (
							<>
								<label className={styles.fieldLabel} style={{ marginTop: 16 }}>
									ОПИС
								</label>
								<textarea
									className={styles.notesArea}
									value={notesInput}
									onChange={e => setNotesInput(e.target.value)}
									onBlur={handleSaveNotes}
									placeholder="Короткий опис простору…"
									rows={2}
									maxLength={300}
								/>
							</>
						)}

						{/* Vehicle profile */}
						{detailSpace.type === 'vehicle' && (
							<>
								<hr className={styles.profileDivider} />
								<p className={styles.profileSectionLabel}>ПРО АВТОМОБІЛЬ</p>
								<div className={styles.fieldGrid2}>
									<input className={styles.input} value={vMake} onChange={e => setVMake(e.target.value)} onBlur={handleSaveVehicleProfile} placeholder="Марка" maxLength={40} />
									<input className={styles.input} value={vModel} onChange={e => setVModel(e.target.value)} onBlur={handleSaveVehicleProfile} placeholder="Модель" maxLength={40} />
									<input
										className={styles.input}
										value={vYear}
										onChange={e => setVYear(e.target.value)}
										onBlur={handleSaveVehicleProfile}
										placeholder="Рік"
										type="number"
										min={1900}
										max={new Date().getFullYear() + 1}
									/>
									<input className={styles.input} value={vPlate} onChange={e => setVPlate(e.target.value)} onBlur={handleSaveVehicleProfile} placeholder="Держ. номер" maxLength={10} />
								</div>
							</>
						)}

						{/* Pet profile */}
						{detailSpace.type === 'pet' && (
							<>
								<hr className={styles.profileDivider} />
								<p className={styles.profileSectionLabel}>ПРО УЛЮБЛЕНЦЯ</p>
								<input className={styles.input} value={pName} onChange={e => setPName(e.target.value)} onBlur={handleSavePetProfile} placeholder="Ім'я тварини" maxLength={40} />
								<div className={styles.chipRow}>
									{PET_SPECIES.map(s => (
										<button
											key={s.value}
											type="button"
											className={`${styles.chip} ${pSpecies === s.value ? styles.chipOn : ''}`}
											onClick={() => {
												setPSpecies(pSpecies === s.value ? '' : s.value)
												setTimeout(handleSavePetProfile, 0)
											}}
										>
											{s.label}
										</button>
									))}
								</div>
								<input className={styles.input} value={pBreed} onChange={e => setPBreed(e.target.value)} onBlur={handleSavePetProfile} placeholder="Порода (опційно)" maxLength={40} />
							</>
						)}

						{/* Trip profile */}
						{detailSpace.type === 'trip' && (
							<>
								<hr className={styles.profileDivider} />
								<p className={styles.profileSectionLabel}>ДЕТАЛІ ПОЇЗДКИ</p>
								<input className={styles.input} value={tDest} onChange={e => setTDest(e.target.value)} onBlur={handleSaveTripProfile} placeholder="Куди їдемо?" maxLength={80} />
								<div className={styles.chipRow} style={{ marginBottom: 16 }}>
									{TRIP_STATUS.map(s => (
										<button
											key={s.value}
											type="button"
											className={`${styles.chip} ${tStatus === s.value ? styles.chipOn : ''}`}
											onClick={() => {
												setTStatus(s.value)
												setTimeout(handleSaveTripProfile, 0)
											}}
										>
											{s.label}
										</button>
									))}
								</div>
							</>
						)}

						{/* Members */}
						<label className={styles.fieldLabel} style={{ marginTop: 4 }}>
							УЧАСНИКИ
						</label>
						<div className={styles.memberList}>
							{detailSpace.members.map(m => (
								<div key={m.userId} className={styles.memberRow}>
									<div className={styles.memberAvatar}>
										{m.avatarUrl ? <img src={m.avatarUrl} alt={m.name} className={styles.memberAvatarImg} /> : <span className={styles.memberInitial}>{m.name[0]?.toUpperCase()}</span>}
									</div>
									<div className={styles.memberInfo}>
										<span className={styles.memberName}>{m.name}</span>
										<span className={styles.memberUsername}>@{m.username}</span>
									</div>
									{m.role === 'owner' ? (
										<span className={styles.ownerBadge}>власник</span>
									) : (
										(detailSpace.ownerId === myId || m.userId === myId) && (
											<button type="button" className={styles.removeBtn} onClick={() => handleRemoveMember(detailSpace.id, m.userId)} aria-label="Видалити">
												<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
													<path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
												</svg>
											</button>
										)
									)}
								</div>
							))}
						</div>

						{/* Add member (owner only) */}
						{detailSpace.ownerId === myId && (
							<>
								<label className={styles.fieldLabel} style={{ marginTop: 16 }}>
									ДОДАТИ УЧАСНИКА
								</label>
								<div className={styles.addMemberRow}>
									<input
										className={styles.input}
										value={memberInput}
										onChange={e => setMemberInput(e.target.value)}
										placeholder="username"
										onKeyDown={e => {
											if (e.key === 'Enter') handleAddMember()
										}}
									/>
									<button type="button" className={styles.addMemberBtn} onClick={handleAddMember} disabled={addingMember || !memberInput.trim()}>
										{addingMember ? '…' : 'Додати'}
									</button>
								</div>
							</>
						)}

						{/* Archive + Delete (owner only) */}
						{detailSpace.ownerId === myId && (
							<div className={styles.ownerActions}>
								<button type="button" className={styles.archiveBtn} onClick={() => handleArchive(detailSpace)}>
									<svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
										<rect x="1" y="4.5" width="13" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
										<path d="M1 7.5h13" stroke="currentColor" strokeWidth="1.4" />
										<path d="M4.5 1.5h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
										<path d="M6 3h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
									</svg>
									Архівувати
								</button>
								<button type="button" className={styles.deleteBtn} onClick={() => handleDelete(detailSpace)}>
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

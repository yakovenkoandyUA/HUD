import React, { useEffect, useState } from 'react'
import { useModalHistory } from '../../../hooks/useModalHistory'
import { useSwipeToDismiss } from '../../../hooks/useSwipeToDismiss'
import { useImageUpload } from '../../../hooks/useImageUpload'
import { useUiStore } from '../../../store/uiStore'
import { useFamilyStore } from '../../../store/familyStore'
import { useSpacesStore } from '../../../store/spacesStore'
import CustomDatePicker from '../../ui/CustomDatePicker'
import LocationSearch from '../LocationSearch'
import Button from '../../ui/Button'
import UnsplashPicker from '../UnsplashPicker'
import type { PlanLocation } from '../../../store/plansStore'
import styles from './AddMemoryModal.module.css'

/**
 * AddMemoryModal
 * --------------
 * Модалка створення нової події-спогаду.
 *
 * Props:
 * @prop {boolean}                                        isOpen   — чи відкрита модалка
 * @prop {() => void}                                     onClose  — закриття
 * @prop {(data: AddMemoryData) => void}                  onCreate — підтвердження зі даними
 */
export interface AddMemoryData {
  title: string
  location?: string
  lat?: number | null
  lng?: number | null
  date: string
  dateEnd?: string | null
  isTrip?: boolean
  coverUrl: string
  coverAttribution?: string
  notes?: string
  tags?: string[]
  withProfiles?: string[]
  spaceId?: string | null
}

interface AddMemoryModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: AddMemoryData) => void
}

const today = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const formatDisplayDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}.${m}.${y}` : iso
}

const AddMemoryModal: React.FC<AddMemoryModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useModalHistory(onClose, isOpen)
  const sheetRef = useSwipeToDismiss(onClose, { enabled: mounted })

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 340)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const [title, setTitle]       = useState('')
  const [location, setLocation] = useState<PlanLocation>({ name: null, address: null, lat: null, lng: null })
  const [date, setDate]           = useState(today())
  const [dateEnd, setDateEnd]     = useState<string | null>(null)
  const [isTrip, setIsTrip]       = useState(false)
  const [coverUrl, setCoverUrl]             = useState('')
  const [coverAttribution, setCoverAttribution] = useState('')
  const [showUnsplash, setShowUnsplash]     = useState(false)
  const [notes, setNotes]                   = useState('')
  const [tags, setTags]           = useState<string[]>([])
  const [showPicker, setShowPicker]       = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)
  const [withProfiles, setWithProfiles]   = useState<string[]>([])
  const [spaceId, setSpaceId]             = useState<string | null>(null)

  const { showToast } = useUiStore()
  const { accepted, fetchFamily } = useFamilyStore()
  const { spaces, fetchSpaces } = useSpacesStore()
  useEffect(() => { if (isOpen && spaces.length === 0) fetchSpaces() }, [isOpen, spaces.length, fetchSpaces])
  useEffect(() => { if (isOpen && accepted.length === 0) fetchFamily() }, [isOpen, accepted.length, fetchFamily])
  const { trigger: triggerCover, uploading: coverUploading, inputElement: coverInput } =
    useImageUpload('mimir/memories/covers', (url) => {
      setCoverUrl(url)
      showToast('Обкладинку завантажено', 'success')
    })

  const toggleCompanion = (id: string) =>
    setWithProfiles(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const reset = () => {
    setTitle('')
    setLocation({ name: null, address: null, lat: null, lng: null })
    setDate(today())
    setDateEnd(null)
    setIsTrip(false)
    setCoverUrl('')
    setCoverAttribution('')
    setNotes('')
    setTags([])
    setWithProfiles([])
    setSpaceId(null)
    setShowPicker(false)
    setShowUnsplash(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = e.currentTarget.value.trim().toLowerCase().replace(/\s+/g, '')
      if (val && !tags.includes(val)) setTags(prev => [...prev, val])
      e.currentTarget.value = ''
    }
  }

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag))

  const handleCreate = () => {
    if (!title.trim() || !date) return
    onCreate({
      title:            title.trim(),
      location:         location.address || location.name || undefined,
      lat:              location.lat,
      lng:              location.lng,
      date,
      dateEnd:          isTrip ? (dateEnd || null) : null,
      isTrip,
      coverUrl,
      coverAttribution: coverAttribution || undefined,
      notes:            notes.trim() || undefined,
      tags:             tags.length ? tags : undefined,
      withProfiles:     withProfiles.length ? withProfiles : undefined,
      spaceId:          spaceId || null,
    })
    reset()
  }

  if (!mounted) return null

  return (
		<>
		<div className={`${styles.overlay} ${visible ? styles.overlayVisible : styles.overlayHidden}`} onClick={handleClose}>
			<div ref={sheetRef} className={`${styles.sheet} ${visible ? styles.sheetVisible : styles.sheetHidden}`} onClick={e => e.stopPropagation()}>
				{/* coverInput всередині sheet — stopPropagation не дає клікам спливти до overlay */}
				{coverInput}
				<div className={styles.handle} />

				<div className={styles.header}>
					<span className={styles.headerTitle}>НОВА ПОДІЯ</span>
					<button type="button" className={styles.closeBtn} onClick={handleClose}>
						<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
							<path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
						</svg>
					</button>
				</div>

				<div className={styles.body}>
					{/* Cover photo zone */}
					{coverUrl ? (
						<div className={styles.coverZone}>
							<img src={coverUrl} alt="" className={styles.coverImg} />
							<div className={styles.coverOverlayActions}>
								<button
									type="button"
									className={styles.coverActionChip}
									onClick={triggerCover}
									aria-label="Завантажити нове фото"
								>
									{coverUploading ? (
										<span className={styles.coverSpinner} />
									) : (
										<svg width="13" height="13" viewBox="0 0 18 18" fill="none" aria-hidden="true">
											<rect x="1" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
											<circle cx="9" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
											<path d="M6 4l1.5-2h3L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
										</svg>
									)}
									<span>Завантажити</span>
								</button>
								<button
									type="button"
									className={styles.coverActionChip}
									onClick={() => setShowUnsplash(true)}
									aria-label="Знайти в Unsplash"
								>
									<svg width="13" height="13" viewBox="0 0 15 15" fill="none" aria-hidden="true">
										<circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
										<path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
									</svg>
									<span>Unsplash</span>
								</button>
							</div>
						</div>
					) : (
						<div className={styles.coverZone}>
							{coverUploading ? (
								<div className={styles.coverEmpty}>
									<span className={styles.coverSpinner} />
								</div>
							) : (
								<div className={styles.coverActions}>
									<button type="button" className={styles.coverActionBtn} onClick={triggerCover}>
										<svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden="true">
											<rect x="1" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
											<circle cx="9" cy="10" r="3" stroke="currentColor" strokeWidth="1.3" />
											<path d="M6 4l1.5-2h3L12 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
										</svg>
										<span>Завантажити</span>
									</button>
									<div className={styles.coverDivider} />
									<button type="button" className={styles.coverActionBtn} onClick={() => setShowUnsplash(true)}>
										<svg width="20" height="20" viewBox="0 0 15 15" fill="none" aria-hidden="true">
											<circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.3" />
											<path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
										</svg>
										<span>Unsplash</span>
									</button>
								</div>
							)}
						</div>
					)}
					<div className={styles.field}>
						<label className={styles.label}>НАЗВА</label>
						<input className={styles.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="Назва події..." />
					</div>

					<div className={styles.row}>
						<div className={`${styles.field} ${styles.fieldLocation}`}>
							<label className={styles.label}>
								МІСЦЕ <span className={styles.optional}>(необов'язково)</span>
							</label>
							<LocationSearch initial={location.address ?? ''} onSelect={setLocation} />
						</div>

						<div className={`${styles.field} ${styles.fieldDate}`}>
							<label className={styles.label}>ДАТА</label>
							<button type="button" className={styles.dateBtn} onClick={() => setShowPicker(true)}>
								{date ? formatDisplayDate(date) : 'Вибрати'}
							</button>
						</div>
					</div>

					{/* Кінець події — animated toggle */}
					<div className={`${styles.tripRow} ${isTrip ? styles.tripRowVisible : ''}`}>
						<span className={styles.tripRowLabel}>КІНЕЦЬ ПОДІЇ</span>
						<button type="button" className={styles.dateBtn} onClick={() => setShowEndPicker(true)}>
							{dateEnd ? formatDisplayDate(dateEnd) : 'Кінцева дата'}
						</button>
						<button
							type="button"
							className={styles.dateClear}
							onClick={() => { setIsTrip(false); setDateEnd(null) }}
							aria-label="Прибрати кінець події"
						>
							<svg width="10" height="10" viewBox="0 0 10 10" fill="none">
								<path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
							</svg>
						</button>
					</div>

					<div className={`${styles.tripAddBtnWrap} ${isTrip ? '' : styles.tripAddBtnWrapVisible}`}>
						<button type="button" className={styles.tripAddBtn} onClick={() => setIsTrip(true)}>
							<svg width="11" height="11" viewBox="0 0 11 11" fill="none">
								<path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
							</svg>
							Додати кінець події
						</button>
					</div>

					{showPicker && <CustomDatePicker value={date} onChange={setDate} onClose={() => setShowPicker(false)} />}
					{showEndPicker && <CustomDatePicker value={dateEnd ?? date} onChange={setDateEnd} onClose={() => setShowEndPicker(false)} />}

					<div className={styles.field}>
						<label className={styles.label}>
							НОТАТКИ <span className={styles.optional}>(необов'язково)</span>
						</label>
						<textarea className={styles.textarea} placeholder="Що запам'яталось..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
					</div>

					<div className={styles.field}>
						<label className={styles.label}>
							ТЕГИ <span className={styles.optional}>(Enter або кома)</span>
						</label>
						<div className={styles.tagsWrap}>
							{tags.map(tag => (
								<span key={tag} className={styles.tag}>
									#{tag}
									<button type="button" className={styles.tagRemove} onClick={() => removeTag(tag)}>
										×
									</button>
								</span>
							))}
							<input className={styles.tagInput} placeholder="+ додати тег" onKeyDown={handleTagKeyDown} />
						</div>
					</div>

					{spaces.length > 0 && (
						<div className={styles.field}>
							<label className={styles.label}>ПРОСТІР <span className={styles.optional}>(необов'язково)</span></label>
							<div className={styles.spacePicker}>
								{spaces.map(s => (
									<button
										key={s.id}
										type="button"
										className={styles.spaceChip}
										style={spaceId === s.id ? { borderColor: s.color, color: s.color } : undefined}
										onClick={() => setSpaceId(prev => prev === s.id ? null : s.id)}
									>
										<span className={styles.spaceDot} style={{ background: s.color }} />
										{s.name}
									</button>
								))}
							</div>
						</div>
					)}

					{accepted.length > 0 && (
						<div className={styles.field}>
							<label className={styles.label}>З КИМ</label>
							<div className={styles.companions}>
								{accepted.map(m => {
									const active = withProfiles.includes(m.id)
									return (
										<button
											key={m.id}
											type="button"
											className={`${styles.companion} ${active ? styles.companionActive : ''}`}
											onClick={() => toggleCompanion(m.id)}
										>
											{m.avatarUrl
												? <img src={m.avatarUrl} alt="" className={styles.companionAvatar} />
												: <span className={styles.companionInitial}>{m.name[0]?.toUpperCase()}</span>
											}
											<span className={styles.companionName}>{m.name.split(' ')[0]}</span>
											{active && (
												<svg className={styles.companionCheck} width="10" height="10" viewBox="0 0 10 10" fill="none">
													<path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
												</svg>
											)}
										</button>
									)
								})}
							</div>
						</div>
					)}

					<Button fullWidth disabled={!title.trim() || !date} onClick={handleCreate}>
						СТВОРИТИ
					</Button>
				</div>
			</div>
		</div>

		<UnsplashPicker
			isOpen={showUnsplash}
			onClose={() => setShowUnsplash(false)}
			onSelect={(url, attribution) => {
				setCoverUrl(url)
				setCoverAttribution(attribution)
			}}
		/>
		</>
	)
}

export default AddMemoryModal

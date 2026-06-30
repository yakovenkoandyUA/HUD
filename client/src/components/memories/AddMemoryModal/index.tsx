import React, { useEffect, useState } from 'react'
import { useModalHistory } from '../../../hooks/useModalHistory'
import { useSwipeToDismiss } from '../../../hooks/useSwipeToDismiss'
import { useImageUpload } from '../../../hooks/useImageUpload'
import { useUiStore } from '../../../store/uiStore'
import CustomDatePicker from '../../ui/CustomDatePicker'
import LocationSearch from '../LocationSearch'
import Button from '../../ui/Button'
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
  notes?: string
  tags?: string[]
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
  const [coverUrl, setCoverUrl]   = useState('')
  const [notes, setNotes]         = useState('')
  const [tags, setTags]           = useState<string[]>([])
  const [showPicker, setShowPicker]       = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)

  const { showToast } = useUiStore()
  const { trigger: triggerCover, uploading: coverUploading, inputElement: coverInput } =
    useImageUpload('mimir/memories/covers', (url) => {
      setCoverUrl(url)
      showToast('Обкладинку завантажено', 'success')
    })

  const reset = () => {
    setTitle('')
    setLocation({ name: null, address: null, lat: null, lng: null })
    setDate(today())
    setDateEnd(null)
    setIsTrip(false)
    setCoverUrl('')
    setNotes('')
    setTags([])
    setShowPicker(false)
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
      title:    title.trim(),
      location: location.address || location.name || undefined,
      lat:      location.lat,
      lng:      location.lng,
      date,
      dateEnd:  isTrip ? (dateEnd || null) : null,
      isTrip,
      coverUrl,
      notes:    notes.trim() || undefined,
      tags:     tags.length ? tags : undefined,
    })
    reset()
  }

  if (!mounted) return null

  return (
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
					<button type="button" className={`${styles.coverZone} ${coverUrl ? styles.coverZoneFilled : ''}`} onClick={triggerCover} aria-label="Додати обкладинку">
						{coverUploading ? (
							<span className={styles.coverSpinner} />
						) : coverUrl ? (
							<>
								<img src={coverUrl} alt="" className={styles.coverImg} />
								<div className={styles.coverOverlay}>
									<svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
										<rect x="1" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
										<circle cx="9" cy="10" r="3" stroke="currentColor" strokeWidth="1.4" />
										<path d="M6 4l1.5-2h3L12 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
									<span>Змінити обкладинку</span>
								</div>
							</>
						) : (
							<div className={styles.coverEmpty}>
								<svg width="24" height="24" viewBox="0 0 18 18" fill="none" aria-hidden="true">
									<rect x="1" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
									<circle cx="9" cy="10" r="3" stroke="currentColor" strokeWidth="1.3" />
									<path d="M6 4l1.5-2h3L12 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
								<span>Додати обкладинку</span>
							</div>
						)}
					</button>
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

					<Button fullWidth disabled={!title.trim() || !date} onClick={handleCreate}>
						СТВОРИТИ
					</Button>
				</div>
			</div>
		</div>
	)
}

export default AddMemoryModal

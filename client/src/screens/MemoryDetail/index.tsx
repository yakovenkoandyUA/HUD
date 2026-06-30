import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import CustomDatePicker from '../../components/ui/CustomDatePicker'
import { useParams, useNavigate } from 'react-router-dom'
import PhotoViewerModal from '../../components/memories/PhotoViewerModal'
import ImageUploadButton from '../../components/ui/ImageUploadButton'
import LocationSearch from '../../components/memories/LocationSearch'
import MemoryCard from '../../components/memories/MemoryCard'
import Modal from '../../components/ui/Modal'
import { useMemoriesStore } from '../../store/memoriesStore'
import { useUiStore } from '../../store/uiStore'
import { useFinanceStore } from '../../store/financeStore'
import { uploadToCloudinary } from '../../utils/uploadToCloudinary'
import { generateMemoryPosterBlob } from '../../utils/generateMemoryPoster'
import { useLongPress } from '../../hooks/useLongPress'
import { useModalHistory } from '../../hooks/useModalHistory'
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss'
import type { Memory, MemoryPhoto, MemoryPlace } from '../../types/memory'
import type { PlanLocation } from '../../store/plansStore'
import styles from './MemoryDetail.module.css'

const MONTHS_UA_SHORT = [
  'Січ', 'Лют', 'Бер', 'Квіт', 'Трав', 'Черв',
  'Лип', 'Серп', 'Вер', 'Жовт', 'Лист', 'Груд',
]

function formatMemoryDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS_UA_SHORT[m - 1]} ${y}`
}

// ── Photo item with long-press menu ──────────────────────────────────────────

/**
 * PhotoItem
 * ---------
 * Фото в masonry grid з підтримкою довгого тапу для контекстного меню.
 *
 * Props:
 * @prop {MemoryPhoto}   photo          — дані фото
 * @prop {() => void}    onTap          — тап для перегляду
 * @prop {() => void}    onSetCover     — зробити обкладинкою
 * @prop {() => void}    onDelete       — видалити фото
 */
interface PhotoItemProps {
  photo: MemoryPhoto
  onTap: () => void
  onSetCover: () => void
  onDelete: () => void
}

const PhotoItem: React.FC<PhotoItemProps> = ({ photo, onTap, onSetCover, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [loaded, setLoaded]     = useState(false)

  const longPress = useLongPress(() => setMenuOpen(true))

  return (
    <div className={styles.photoItem} {...longPress}>
      {!loaded && <div className={styles.photoSkeleton} />}
      <img
        src={photo.url}
        alt={photo.caption ?? ''}
        className={`${styles.photoImg} ${loaded ? styles.photoImgLoaded : ''}`}
        onLoad={() => setLoaded(true)}
        loading="lazy"
        onClick={() => { if (!menuOpen) onTap() }}
      />

      {photo.addedByName && (
        <div className={styles.photoAttrBadge}>{photo.addedByName}</div>
      )}

      {menuOpen && (
        <>
          <div
            className={styles.menuBackdrop}
            onClick={() => setMenuOpen(false)}
          />
          <div className={styles.menu}>
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => { onSetCover(); setMenuOpen(false) }}
            >
              Зробити обкладинкою
            </button>
            <div className={styles.menuDivider} />
            <button
              type="button"
              className={`${styles.menuItem} ${styles.menuItemDanger}`}
              onClick={() => { onDelete(); setMenuOpen(false) }}
            >
              Видалити
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Edit memory modal ─────────────────────────────────────────────────────────

/**
 * EditMemoryModal
 * ---------------
 * Inline модалка редагування обкладинки / назви / місця події.
 */
interface EditMemoryModalProps {
  title: string
  location: string
  lat: number | null
  lng: number | null
  date: string
  dateEnd: string | null
  isTrip: boolean
  coverUrl: string
  onSave: (title: string, location: PlanLocation, date: string, dateEnd: string | null, isTrip: boolean) => void
  onChangeCover: (url: string) => void
  onClose: () => void
}

const EDIT_CLOSE_MS = 260

const formatDisplayDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}.${m}.${y}` : iso
}

const EditMemoryModal: React.FC<EditMemoryModalProps> = ({
  title: initTitle, location: initLoc, lat: initLat, lng: initLng,
  date: initDate, dateEnd: initDateEnd, isTrip: initIsTrip,
  coverUrl, onSave, onChangeCover, onClose,
}) => {
  const [title, setTitle]         = useState(initTitle)
  const [location, setLocation]   = useState<PlanLocation>({
    name: null, address: initLoc || null, lat: initLat, lng: initLng,
  })
  const [date, setDate]           = useState(initDate)
  const [dateEnd, setDateEnd]     = useState<string | null>(initDateEnd)
  const [isTrip, setIsTrip]       = useState(initIsTrip)
  const [showPicker, setShowPicker]       = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, EDIT_CLOSE_MS)
  }

  useModalHistory(handleClose, visible)
  const sheetRef = useSwipeToDismiss(onClose, { enabled: visible })

  return (
    <>
    <div
      className={`${styles.editOverlay} ${visible ? styles.editOverlayVisible : styles.editOverlayHidden}`}
      onClick={handleClose}
    >
      <div
        ref={sheetRef}
        className={`${styles.editSheet} ${visible ? styles.editSheetVisible : styles.editSheetHidden}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.editHandle} />
        <div className={styles.editHeader}>
          <span className={styles.editTitle}>РЕДАГУВАТИ</span>
          <button type="button" className={styles.editClose} onClick={handleClose}>×</button>
        </div>
        <div className={styles.editBody}>
          <label className={styles.editLabel}>ОБКЛАДИНКА</label>
          <ImageUploadButton
            currentUrl={coverUrl}
            folder="mimir/memories/covers"
            onUpload={onChangeCover}
            placeholder="Обкладинка"
            variant="wide"
          />
          <label className={styles.editLabel}>НАЗВА</label>
          <input
            className={styles.editInput}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <label className={styles.editLabel}>МІСЦЕ</label>
          <LocationSearch initial={initLoc} onSelect={setLocation} />
          <label className={styles.editLabel}>ДАТА</label>
          <div className={styles.editDateRange}>
            <button
              type="button"
              className={styles.editDateBtn}
              onClick={() => setShowPicker(true)}
            >
              {formatDisplayDate(date)}
            </button>
            <button
              type="button"
              className={`${styles.editDateBtn} ${!dateEnd ? styles.editDateBtnEmpty : ''}`}
              onClick={() => setShowEndPicker(true)}
            >
              {dateEnd ? formatDisplayDate(dateEnd) : 'Кінець події'}
              {dateEnd && (
                <span
                  className={styles.editDateClear}
                  role="button"
                  aria-label="Прибрати кінець події"
                  onClick={e => { e.stopPropagation(); setDateEnd(null); setIsTrip(false) }}
                >
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </span>
              )}
            </button>
          </div>
          <button
            type="button"
            className={styles.editSave}
            disabled={!title.trim()}
            onClick={() => { onSave(title.trim(), location, date, isTrip ? dateEnd : null, isTrip); handleClose() }}
          >
            ЗБЕРЕГТИ
          </button>
        </div>
      </div>
    </div>
    {showPicker && (
      <CustomDatePicker value={date} onChange={setDate} onClose={() => setShowPicker(false)} />
    )}
    {showEndPicker && (
      <CustomDatePicker value={dateEnd ?? date} onChange={d => { setDateEnd(d); setIsTrip(true) }} onClose={() => setShowEndPicker(false)} />
    )}
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * MemoryDetailScreen
 * ------------------
 * Сторінка окремої події-спогаду — masonry grid фото,
 * завантаження кількох фото, перегляд, редагування, видалення.
 */
const MemoryDetailScreen: React.FC = () => {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const { memories, fetchMemories, addPhoto, deletePhoto, setCover, updatePhoto, updateMemory, deleteMemory, fetchRelated } =
    useMemoriesStore()
  const { showToast } = useUiStore()
  const { transactions } = useFinanceStore()

  const memory = memories.find(m => m.id === id)
  const [related, setRelated] = useState<Memory[]>([])

  // Deep-link entry (e.g. from Timeline) can land here before memoriesStore was ever populated.
  useEffect(() => {
    if (memories.length === 0) fetchMemories()
  }, [memories.length, fetchMemories])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetchRelated(id).then(r => { if (!cancelled) setRelated(r) })
    return () => { cancelled = true }
  }, [id, fetchRelated])

  const [viewerIndex, setViewerIndex]   = useState<number | null>(null)
  const [uploading, setUploading]       = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const [menuOpen, setMenuOpen]         = useState(false)
  const [showEdit, setShowEdit]         = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [sharing, setSharing]           = useState(false)

  const [editingNotes, setEditingNotes] = useState(false)
  const [localNotes, setLocalNotes]     = useState('')
  const [addingTag, setAddingTag]       = useState(false)
  const [addingPlace, setAddingPlace]   = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null)

  const handleFilesChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length || !id) return

    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    if (!imageFiles.length) return

    setUploading(true)
    setUploadProgress({ done: 0, total: imageFiles.length })

    for (let i = 0; i < imageFiles.length; i++) {
      try {
        const url = await uploadToCloudinary(imageFiles[i], `mimir/memories/${id}`)
        addPhoto(id, { url })
        if (i === 0 && !memory?.coverUrl) {
          setCover(id, url)
        }
      } catch {
        // continue with next file
      }
      setUploadProgress({ done: i + 1, total: imageFiles.length })
    }

    setUploading(false)
    setUploadProgress(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [id, memory, addPhoto, setCover])

  const handleDeleteMemory = () => {
    deleteMemory(id!)
    navigate(-1)
  }

  const handleSaveNotes = async (notes: string) => {
    setEditingNotes(false)
    updateMemory(id!, { notes })
  }

  const handleCancelNotes = () => {
    setEditingNotes(false)
    setLocalNotes(memory?.notes ?? '')
  }

  const handleAddTag = (tag: string) => {
    if (!tag || !memory) return
    const trimmed = tag.trim().toLowerCase().replace(/\s+/g, '')
    if (!trimmed) return
    const current = memory.tags ?? []
    if (current.includes(trimmed)) return
    const updated = [...current, trimmed]
    updateMemory(id!, { tags: updated })
  }

  const handleRemoveTag = (tag: string) => {
    if (!memory) return
    const updated = (memory.tags ?? []).filter(t => t !== tag)
    updateMemory(id!, { tags: updated })
  }

  const handleAddPlace = (loc: PlanLocation) => {
    if (!memory || loc.lat == null || loc.lng == null) return
    const place: MemoryPlace = {
      id: crypto.randomUUID(),
      name: loc.name || loc.address || 'Заклад',
      address: loc.address ?? undefined,
      lat: loc.lat,
      lng: loc.lng,
    }
    updateMemory(id!, { places: [...(memory.places ?? []), place] })
    setAddingPlace(false)
  }

  const handleRemovePlace = (placeId: string) => {
    if (!memory) return
    const updated = (memory.places ?? []).filter(p => p.id !== placeId)
    updateMemory(id!, { places: updated })
  }

  useEffect(() => {
    if (!editingNotes) return
    const el = notesTextareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const fits = el.scrollHeight <= 160
    el.style.height = `${fits ? el.scrollHeight : 160}px`
    el.style.overflowY = fits ? 'hidden' : 'auto'
  }, [editingNotes, localNotes])

  const formattedDate = useMemo(
    () => memory ? formatMemoryDate(memory.date) : '',
    [memory]
  )

  const handleShare = useCallback(async () => {
    if (!memory || sharing) return
    setSharing(true)

    const shareUrl = `${window.location.origin}/memories/${memory.id}`

    try {
      const blob = await generateMemoryPosterBlob(memory, formattedDate)
      const file = new File([blob], `memory-${memory.id}.png`, { type: 'image/png' })
      const canShareFile = navigator.canShare && navigator.canShare({ files: [file] })
      if (navigator.share && canShareFile) {
        try {
          await navigator.share({
            files: [file],
            title: memory.title,
            text: `${memory.title} · ${formattedDate}\n${shareUrl}`,
            url: shareUrl,
          })
        } catch { /* user cancelled or not supported */ }
      } else {
        // download fallback + copy link
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${memory.title.toLowerCase().replace(/\s+/g, '-')}.png`
        a.click()
        URL.revokeObjectURL(url)

        try {
          await navigator.clipboard.writeText(shareUrl)
          showToast('Посилання на спогад скопійовано', 'success')
        } catch { /* clipboard unavailable — image download still happened */ }
      }
    } finally {
      setSharing(false)
    }
  }, [memory, sharing, formattedDate, showToast])

  if (!memory) {
    return (
      <div className={styles.screen}>
        <div className={styles.notFound}>Подію не знайдено</div>
      </div>
    )
  }

  return (
		<div className={styles.screen}>
			{/* ── Header ── */}
			<div className={styles.header}>
				<button type="button" className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Назад">
					←
				</button>

				<div className={styles.headerMeta}>
					<h1 className={styles.headerTitle}>{memory.title.toUpperCase()}</h1>
					<p className={styles.headerSub}>
						{memory.location && (
							<span className={styles.headerLocation} title={memory.location}>
								{memory.location}
							</span>
						)}
						<span className={styles.headerMetaRight}>
							{formatMemoryDate(memory.date)}
							{memory.photos.length > 0 && (
								<span className={styles.headerPhotoCount}>
									<svg width="11" height="11" viewBox="0 0 14 14" fill="none">
										<rect x="1.5" y="2.5" width="11" height="9" rx="1.3" stroke="currentColor" strokeWidth="1.2" />
										<circle cx="4.7" cy="5.5" r="1" fill="currentColor" />
										<path d="M2 9.5l3-3 2 2 2.5-3 2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
									{memory.photos.length} фото
								</span>
							)}
						</span>
					</p>
				</div>

				{memory.ownerName && (
					<div className={styles.ownerBadge} title={memory.ownerName}>
						{memory.ownerAvatarUrl ? <img src={memory.ownerAvatarUrl} alt={memory.ownerName} className={styles.ownerAvatar} /> : <span className={styles.ownerInitial}>{memory.ownerName[0]}</span>}
					</div>
				)}

				<button type="button" className={styles.menuBtn} onClick={() => setMenuOpen(v => !v)} aria-label="Меню">
					⋮
				</button>

				{menuOpen && (
					<>
						<div className={styles.dropBackdrop} onClick={() => setMenuOpen(false)} />
						<div className={styles.dropdown}>
							<button
								type="button"
								className={styles.dropItem}
								onClick={() => {
									setShowEdit(true)
									setMenuOpen(false)
								}}
							>
								Редагувати подію
							</button>
							<div className={styles.dropDivider} />
							<button
								type="button"
								className={`${styles.dropItem} ${styles.dropItemDanger}`}
								onClick={() => {
									setShowDeleteConfirm(true)
									setMenuOpen(false)
								}}
							>
								Видалити подію
							</button>
						</div>
					</>
				)}
			</div>

			{/* ── Subheader: note + tags/places (sticky under header) ── */}
			<div className={styles.subheader}>
				{/* Note row */}
				{memory.notes ? (
					<button
						type="button"
						className={styles.noteCard}
						onClick={() => { setLocalNotes(memory.notes ?? ''); setEditingNotes(true) }}
					>
						<p className={styles.notesText}>{memory.notes}</p>
						<svg className={styles.noteEditIcon} width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
							<path d="M9.5 1.5L12.5 4.5L4.5 12.5H1.5V9.5L9.5 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
						</svg>
					</button>
				) : (
					<button
						type="button"
						className={styles.noteCardEmpty}
						onClick={() => { setLocalNotes(''); setEditingNotes(true) }}
					>
						<svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
							<path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
						</svg>
						Додати нотатку
					</button>
				)}

				{/* Tags + places chips */}
				<div className={styles.metaChipsRow}>
					{(memory.tags ?? []).map(tag => (
						<span key={tag} className={styles.tag}>
							<span className={styles.tagHash}>#</span>
							{tag}
							<button type="button" className={styles.tagRemove} onClick={() => handleRemoveTag(tag)}>×</button>
						</span>
					))}
					{addingTag ? (
						<span className={styles.tagInputWrap}>
							<span className={styles.tagInputPrefix}>#</span>
							<input
								className={styles.tagInput}
								placeholder="тег"
								autoFocus
								onBlur={() => setAddingTag(false)}
								onKeyDown={e => {
									if (e.key === 'Enter' || e.key === ',') {
										e.preventDefault()
										handleAddTag(e.currentTarget.value)
										e.currentTarget.value = ''
									}
								}}
							/>
						</span>
					) : (
						<button type="button" className={styles.addTagBtn} onClick={() => setAddingTag(true)}>
							<svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
								<path d="M4.5 1v7M1 4.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
							</svg>
							тег
						</button>
					)}

					<span className={styles.chipsDivider} />

					{(memory.places ?? []).map(place => (
						<span key={place.id} className={styles.placeChip}>
							<svg className={styles.placeIcon} width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
								<path d="M5 0.5a3 3 0 0 1 3 3c0 2.3-3 6-3 6S2 5.8 2 3.5a3 3 0 0 1 3-3Z" stroke="currentColor" strokeWidth="1.1" />
								<circle cx="5" cy="3.5" r="1.1" fill="currentColor" />
							</svg>
							{place.name}
							<button type="button" className={styles.placeRemove} onClick={() => handleRemovePlace(place.id)}>×</button>
						</span>
					))}
					<button type="button" className={styles.addPlaceBtn} onClick={() => setAddingPlace(true)}>
						<svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
							<path d="M4.5 1v7M1 4.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
						</svg>
						заклад
					</button>
				</div>
			</div>

			{/* ── Bottom action bar: ФОТО + ПОДІЛИТИСЬ ── */}
			<div className={styles.bottomBar}>
				<input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFilesChange} />
				<button type="button" className={styles.btnPhoto} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
					{uploading && uploadProgress ? (
						`${uploadProgress.done}/${uploadProgress.total}...`
					) : (
						<>
							<svg width="13" height="13" viewBox="0 0 13 13" fill="none">
								<path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
							</svg>
							ФОТО
						</>
					)}
				</button>
				<button type="button" className={styles.btnShare} onClick={handleShare} disabled={sharing}>
					{sharing ? '...' : (
						<>
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<circle cx="18" cy="5" r="3" />
								<circle cx="6" cy="12" r="3" />
								<circle cx="18" cy="19" r="3" />
								<line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
								<line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
							</svg>
							ПОДІЛИТИСЬ
						</>
					)}
				</button>
			</div>

			{/* ── Trip expenses ── */}
			{memory.isTrip &&
				(() => {
					const tripTxs = transactions.filter(t => t.type === 'expense' && t.tripMemoryId === memory.id)
					if (tripTxs.length === 0) return null
					const total = tripTxs.reduce((s, t) => s + t.amount, 0)
					return (
						<div className={styles.tripExpenses}>
							<div className={styles.tripExpensesHeader}>
								<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
									<path d="M2 7h10M8 4l4 3-4 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
								<span className={styles.tripExpensesLabel}>ВИТРАТИ В ПОЇЗДЦІ</span>
								<span className={styles.tripExpensesTotal}>{total.toLocaleString('uk-UA')} ₴</span>
							</div>
							<div className={styles.tripExpensesList}>
								{tripTxs.slice(0, 5).map(t => (
									<div key={t.id} className={styles.tripExpenseItem}>
										<span className={styles.tripExpenseDesc}>{t.description}</span>
										<span className={styles.tripExpenseAmt}>−{t.amount} ₴</span>
									</div>
								))}
								{tripTxs.length > 5 && <span className={styles.tripExpensesMore}>ще {tripTxs.length - 5} транзакцій</span>}
							</div>
						</div>
					)
				})()}

			{/* ── Related memories ── */}
			{related.length > 0 && (
				<div className={styles.relatedRow}>
					<span className={styles.relatedLabel}>ПОВ'ЯЗАНІ СПОГАДИ</span>
					<div className={styles.relatedScroll}>
						{related.map(r => (
							<div key={r.id} className={styles.relatedItem}>
								<MemoryCard memory={r} onClick={() => navigate(`/memories/${r.id}`)} />
							</div>
						))}
					</div>
				</div>
			)}

			{/* ── Photos masonry grid ── */}
			{memory.photos.length === 0 ? (
				<div className={styles.emptyPhotos}>
					<span className={styles.emptyIcon}>📷</span>
					<p className={styles.emptyText}>Поки немає фотографій</p>
					<p className={styles.emptyHint}>Натисни «+ Додати фото» вище</p>
				</div>
			) : (
				<div className={styles.photoGrid}>
					{[0, 1, 2].map(col => (
						<div className={styles.photoColumn} key={col}>
							{memory.photos
								.filter((_, i) => i % 3 === col)
								.map(photo => {
									const i = memory.photos.indexOf(photo)
									return <PhotoItem key={photo.id} photo={photo} onTap={() => setViewerIndex(i)} onSetCover={() => setCover(id!, photo.url)} onDelete={() => deletePhoto(id!, photo.id)} />
								})}
						</div>
					))}
				</div>
			)}

			{/* ── Add place modal ── */}
			<Modal isOpen={addingPlace} onClose={() => setAddingPlace(false)} title="Додати заклад" draggable>
				<LocationSearch onSelect={handleAddPlace} inlineResults />
			</Modal>

			{/* ── Notes modal ── */}
			<Modal isOpen={editingNotes} onClose={handleCancelNotes} title="Нотатка" draggable>
				<div className={styles.notesEditWrap}>
					<textarea ref={notesTextareaRef} className={styles.notesTextarea} value={localNotes} onChange={e => setLocalNotes(e.target.value)} autoFocus rows={1} />
					<div className={styles.notesEditActions}>
						<button type="button" className={styles.notesCancelBtn} onClick={handleCancelNotes}>
							Скасувати
						</button>
						<button type="button" className={styles.notesDoneBtn} onClick={() => handleSaveNotes(localNotes)}>
							Готово
						</button>
					</div>
				</div>
			</Modal>

			{/* ── Photo viewer ── */}
			{viewerIndex !== null && (
				<PhotoViewerModal
					photos={memory.photos}
					initialIndex={viewerIndex}
					onClose={() => setViewerIndex(null)}
					onDelete={photoId => {
						const newIndex = Math.min(viewerIndex, memory.photos.length - 2)
						deletePhoto(id!, photoId)
						if (memory.photos.length <= 1) {
							setViewerIndex(null)
						} else {
							setViewerIndex(newIndex >= 0 ? newIndex : 0)
						}
					}}
					onCaption={(photoId, caption) => updatePhoto(id!, photoId, { caption })}
				/>
			)}

			{/* ── Edit modal ── */}
			{showEdit && (
				<EditMemoryModal
					title={memory.title}
					location={memory.location ?? ''}
					lat={memory.lat ?? null}
					lng={memory.lng ?? null}
					date={memory.date}
					dateEnd={memory.dateEnd ?? null}
					isTrip={memory.isTrip ?? false}
					coverUrl={memory.coverUrl ?? ''}
					onSave={(title, location, date, dateEnd, isTrip) =>
						updateMemory(id!, {
							title,
							location: location.address || location.name || undefined,
							lat: location.lat,
							lng: location.lng,
							date,
							dateEnd,
							isTrip,
						})
					}
					onChangeCover={url => setCover(id!, url)}
					onClose={() => setShowEdit(false)}
				/>
			)}

			{/* ── Delete confirm ── */}
			{showDeleteConfirm && (
				<div className={styles.confirmOverlay} onClick={() => setShowDeleteConfirm(false)}>
					<div className={styles.confirmSheet} onClick={e => e.stopPropagation()}>
						<p className={styles.confirmText}>Видалити «{memory.title}»?</p>
						<p className={styles.confirmHint}>Всі фотографії залишаться в Cloudinary.</p>
						<div className={styles.confirmActions}>
							<button type="button" className={styles.confirmCancel} onClick={() => setShowDeleteConfirm(false)}>
								Скасувати
							</button>
							<button type="button" className={styles.confirmDelete} onClick={handleDeleteMemory}>
								Видалити
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default MemoryDetailScreen

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import { useParams, useNavigate } from 'react-router-dom'
import PhotoViewerModal from './components/memories/PhotoViewerModal'
import LocationSearch from './components/memories/LocationSearch'
import UnsplashPicker from './components/memories/UnsplashPicker'
import { useImageUpload } from '@/shared/hooks/useImageUpload'
import MemoryCard from './components/memories/MemoryCard'
import Modal from '@/shared/components/ui/Modal'
import { useMemoriesStore } from '@/features/memories/store/memoriesStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useFinanceStore } from '@/features/finance/store/financeStore'
import { useFamilyStore } from '@/shared/store/familyStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { uploadToCloudinary } from '@/shared/utils/uploadToCloudinary'
import { generateMemoryPosterBlob } from './utils/generateMemoryPoster'
import { useLongPress } from '@/shared/hooks/useLongPress'
import { useModalHistory } from '@/shared/hooks/useModalHistory'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import type { Memory, MemoryPhoto, MemoryPlace } from './types/memory'
import type { PlanLocation } from '@/features/memories/store/plansStore'
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
 * Builds per-photo grid column spans using count-aware editorial rules.
 *
 * n=1 : featured full-width (span 2)
 * n=2 : both portrait/square → side-by-side (span 1); ≥1 landscape detected → both full-width (span 2)
 * n=3 : featured full-width (span 2); supporting photos always side-by-side (span 1)
 * n=4 : balanced 2×2 (all span 1); landscape photo breaks to span 2
 * n≥5 : featured span 2; landscape span 2; portrait/square span 1
 *
 * Unknown ratio (not yet loaded) is treated as portrait for safety.
 */
function buildLayouts(
  photos: MemoryPhoto[],
  ratios: Record<string, number>,
  featuredIndex: number,
): Array<1 | 2> {
  const n = photos.length
  const r = (i: number): number | undefined => ratios[photos[i]?.id]
  const isL = (i: number): boolean => (r(i) ?? 0) >= 1.2

  if (n === 1) return [2]

  if (n === 2) {
    const anyLandscape = isL(0) || isL(1)
    return anyLandscape ? [2, 2] : [1, 1]
  }

  if (n === 3) {
    // fixed editorial: hero + pair below — supporting photos always side-by-side
    return photos.map((_, i): 1 | 2 => (i === featuredIndex ? 2 : 1))
  }

  if (n === 4) {
    return photos.map((_, i): 1 | 2 => (isL(i) ? 2 : 1))
  }

  // n≥5: featured span 2, landscape span 2, rest span 1
  return photos.map((_, i): 1 | 2 => (i === featuredIndex || isL(i) ? 2 : 1))
}

/**
 * PhotoItem
 * ---------
 * Плитка в editorial collage / masonry grid.
 * Визначає aspect ratio після завантаження через naturalWidth/naturalHeight.
 * Займає span 1 або span 2 CSS Grid колонки залежно від орієнтації.
 *
 * Props:
 * @prop {MemoryPhoto}                          photo            — дані фото
 * @prop {1 | 2}                                span             — кількість grid-колонок
 * @prop {number | undefined}                   ratio            — виявлений aspect ratio (width/height)
 * @prop {() => void}                           onTap            — тап для перегляду (lightbox)
 * @prop {() => void}                           [onSetCover]     — зробити обкладинкою
 * @prop {() => void}                           [onDelete]       — видалити фото
 * @prop {(photoId: string, r: number) => void} onRatioDetected  — коллбек після визначення ratio
 */
interface PhotoItemProps {
  photo: MemoryPhoto
  span: 1 | 2
  ratio: number | undefined
  onTap: () => void
  onSetCover?: () => void
  onDelete?: () => void
  onRatioDetected: (photoId: string, ratio: number) => void
}

const PhotoItem: React.FC<PhotoItemProps> = ({ photo, span, ratio, onTap, onSetCover, onDelete, onRatioDetected }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [loaded, setLoaded]     = useState(false)

  const hasMenu   = !!(onSetCover || onDelete)
  const longPress = useLongPress(() => { if (hasMenu) setMenuOpen(true) })

  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setLoaded(true)
    const { naturalWidth, naturalHeight } = e.currentTarget
    if (naturalWidth && naturalHeight) {
      onRatioDetected(photo.id, naturalWidth / naturalHeight)
    }
  }, [photo.id, onRatioDetected])

  return (
    <div
      className={`${styles.photoItem} ${span === 2 ? styles.photoSpan2 : styles.photoSpan1}`}
      style={{ aspectRatio: span === 2 ? Math.max(ratio ?? 1, 1) : (ratio ?? 0.8) }}
      {...longPress}
    >
      {!loaded && <div className={styles.photoSkeleton} />}
      <img
        src={photo.url}
        alt={photo.caption ?? ''}
        className={`${styles.photoImg} ${loaded ? styles.photoImgLoaded : ''}`}
        onLoad={handleLoad}
        loading="lazy"
        onClick={() => { if (!menuOpen) onTap() }}
      />

      {photo.addedByName && (
        <div className={styles.photoAttrBadge}>{photo.addedByName}</div>
      )}

      {menuOpen && hasMenu && (
        <>
          <div className={styles.menuBackdrop} onClick={() => setMenuOpen(false)} />
          <div className={styles.menu}>
            {onSetCover && (
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => { onSetCover(); setMenuOpen(false) }}
              >
                Зробити обкладинкою
              </button>
            )}
            {onSetCover && onDelete && <div className={styles.menuDivider} />}
            {onDelete && (
              <button
                type="button"
                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                onClick={() => { onDelete(); setMenuOpen(false) }}
              >
                Видалити
              </button>
            )}
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
  withProfiles: string[]
  onSave: (title: string, location: PlanLocation, date: string, dateEnd: string | null, isTrip: boolean, withProfiles: string[]) => void
  onChangeCover: (url: string, attribution?: string) => void
  onClose: () => void
}

const EDIT_CLOSE_MS = 260

const formatDisplayDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return y && m && d ? `${d}.${m}.${y}` : iso
}

const EditMemoryModal: React.FC<EditMemoryModalProps> = ({
  title: initTitle, location: initLoc, lat: initLat, lng: initLng,
  date: initDate, dateEnd: initDateEnd, isTrip: initIsTrip,
  coverUrl, withProfiles: initWithProfiles, onSave, onChangeCover, onClose,
}) => {
  const [title, setTitle]         = useState(initTitle)
  const [location, setLocation]   = useState<PlanLocation>({
    name: null, address: initLoc || null, lat: initLat, lng: initLng,
  })
  const [date, setDate]           = useState(initDate)
  const [dateEnd, setDateEnd]     = useState<string | null>(initDateEnd)
  const [isTrip, setIsTrip]       = useState(initIsTrip)
  const [withProfiles, setWithProfiles] = useState<string[]>(initWithProfiles)
  const [showPicker, setShowPicker]       = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)
  const [showUnsplash, setShowUnsplash]   = useState(false)
  const [visible, setVisible] = useState(false)

  const { accepted: familyAccepted, fetchFamily } = useFamilyStore()

  const { trigger: triggerCover, uploading: coverUploading, inputElement: coverInput } =
    useImageUpload('mimir/memories/covers', (url) => onChangeCover(url))

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (familyAccepted.length === 0) await fetchFamily()
      if (!cancelled) requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    }
    load()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCompanion = (uid: string) =>
    setWithProfiles(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid])

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
        {coverInput}
        <div className={styles.editHandle} />
        <div className={styles.editHeader}>
          <span className={styles.editTitle}>РЕДАГУВАТИ</span>
          <button type="button" className={styles.editClose} onClick={handleClose}>×</button>
        </div>
        <div className={styles.editBody}>
          <label className={styles.editLabel}>ОБКЛАДИНКА</label>
          {coverUrl ? (
            <div className={styles.editCoverZone}>
              <img src={coverUrl} alt="" className={styles.editCoverImg} />
              <div className={styles.editCoverOverlayActions}>
                <button type="button" className={styles.editCoverActionChip} onClick={triggerCover}>
                  {coverUploading ? (
                    <span className={styles.editCoverSpinner} />
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
                      <rect x="1" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="9" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M6 4l1.5-2h3L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  <span>Завантажити</span>
                </button>
                <button type="button" className={styles.editCoverActionChip} onClick={() => setShowUnsplash(true)}>
                  <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span>Unsplash</span>
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.editCoverZone}>
              {coverUploading ? (
                <div className={styles.editCoverEmpty}><span className={styles.editCoverSpinner} /></div>
              ) : (
                <div className={styles.editCoverActions}>
                  <button type="button" className={styles.editCoverActionBtn} onClick={triggerCover}>
                    <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                      <rect x="1" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
                      <circle cx="9" cy="10" r="3" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M6 4l1.5-2h3L12 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Завантажити</span>
                  </button>
                  <div className={styles.editCoverDivider} />
                  <button type="button" className={styles.editCoverActionBtn} onClick={() => setShowUnsplash(true)}>
                    <svg width="20" height="20" viewBox="0 0 15 15" fill="none">
                      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    <span>Unsplash</span>
                  </button>
                </div>
              )}
            </div>
          )}
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
          {familyAccepted.length > 0 && (
            <>
              <label className={styles.editLabel}>З КИМ</label>
              <div className={styles.editCompanions}>
                {familyAccepted.map(m => {
                  const active = withProfiles.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`${styles.editCompanion} ${active ? styles.editCompanionActive : ''}`}
                      onClick={() => toggleCompanion(m.id)}
                    >
                      {m.avatarUrl
                        ? <img src={m.avatarUrl} alt="" className={styles.editCompanionAvatar} />
                        : <span className={styles.editCompanionInitial}>{m.name[0]?.toUpperCase()}</span>
                      }
                      <span className={styles.editCompanionName}>{m.name.split(' ')[0]}</span>
                      {active && (
                        <svg className={styles.editCompanionCheck} width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}
          <button
            type="button"
            className={styles.editSave}
            disabled={!title.trim()}
            onClick={() => { onSave(title.trim(), location, date, isTrip ? dateEnd : null, isTrip, withProfiles); handleClose() }}
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
    <UnsplashPicker
      isOpen={showUnsplash}
      onSelect={(url, attribution) => { onChangeCover(url, attribution); setShowUnsplash(false) }}
      onClose={() => setShowUnsplash(false)}
    />
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
  const { accepted, fetchFamily } = useFamilyStore()
  const { activeProfile } = useProfileStore()

  const memory  = memories.find(m => m.id === id)
  const isOwner = !!memory && !!activeProfile && memory.userId === activeProfile.id
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

  // Load family members for withProfiles chips
  useEffect(() => {
    if (!memory) return
    if ((memory.withProfiles ?? []).length > 0 && accepted.length === 0) {
      fetchFamily()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory?.id])

  const [viewerIndex, setViewerIndex]   = useState<number | null>(null)
  const [uploading, setUploading]       = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const [menuOpen, setMenuOpen]         = useState(false)
  const [showEdit, setShowEdit]         = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [sharing, setSharing]           = useState(false)
  const [photoRatios, setPhotoRatios]   = useState<Record<string, number>>({})

  const handleRatioDetected = useCallback((photoId: string, ratio: number) => {
    setPhotoRatios(prev => {
      if (prev[photoId] !== undefined) return prev
      return { ...prev, [photoId]: ratio }
    })
  }, [])

  const [addingPlace, setAddingPlace]   = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const formattedDate = useMemo(
    () => memory ? formatMemoryDate(memory.date) : '',
    [memory]
  )

  const featuredPhotoIndex = useMemo(() => {
    if (!memory || memory.photos.length === 0) return 0
    const coverIdx = memory.photos.findIndex(p => p.url === memory.coverUrl)
    return coverIdx >= 0 ? coverIdx : 0
  }, [memory?.coverUrl, memory?.photos]) // eslint-disable-line react-hooks/exhaustive-deps

  const photoLayouts = useMemo(
    () => memory ? buildLayouts(memory.photos, photoRatios, featuredPhotoIndex) : [],
    [memory?.photos, photoRatios, featuredPhotoIndex] // eslint-disable-line react-hooks/exhaustive-deps
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

				{isOwner && (
					<button type="button" className={styles.menuBtn} onClick={() => setMenuOpen(v => !v)} aria-label="Меню">
						⋮
					</button>
				)}

				{isOwner && menuOpen && (
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

			{/* ── Context block: people ── */}
			{(memory.withProfiles ?? []).length > 0 && (
				<div className={styles.contextBlock}>
					<div className={styles.contextSection}>
						<span className={styles.contextLabel}>З КИМ</span>
						<div className={styles.contextChips}>
							{(memory.withProfiles ?? []).map(uid => {
								const member = accepted.find(a => a.id === uid)
								if (!member) return null
								return (
									<span key={uid} className={styles.personChip}>
										{member.avatarUrl
											? <img src={member.avatarUrl} alt={member.name} className={styles.personAvatar} />
											: <span className={styles.personInitial}>{member.name[0]}</span>
										}
										<span className={styles.personName}>{member.name.split(' ')[0]}</span>
									</span>
								)
							})}
						</div>
					</div>
				</div>
			)}

			{/* ── Tags ── */}
			{(memory.tags ?? []).length > 0 && (
				<div className={styles.tagsSection}>
					{(memory.tags ?? []).map(tag => (
						<span key={tag} className={styles.tagChip}>#{tag}</span>
					))}
				</div>
			)}

			{/* ── Places section ── */}
			{((memory.places ?? []).length > 0 || true) && (
				<div className={styles.placesSection}>
					<div className={styles.placesSectionHead}>
						<span className={styles.placesSectionLabel}>ЗАКЛАДИ</span>
						{isOwner && (
							<button type="button" className={styles.addPlaceChip} onClick={() => setAddingPlace(true)}>
								<svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
									<path d="M4.5 1v7M1 4.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
								</svg>
								додати
							</button>
						)}
					</div>

					{(memory.places ?? []).length > 0 && (
						<div className={styles.placesGrid}>
							{(memory.places ?? []).map(place => {
								const hasCoords = !!(place.lat && place.lng)
								return (
									<div key={place.id} className={styles.placeGridItem}>
										{hasCoords ? (
											<a
												href={`https://www.google.com/maps?q=${place.lat},${place.lng}`}
												target="_blank" rel="noreferrer"
												className={styles.placeGridLink}
											>
												<div className={styles.placeGridIcon}>
													<svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
														<path d="M9 1.5a5.5 5.5 0 015.5 5.5C14.5 11.5 9 16.5 9 16.5S3.5 11.5 3.5 7A5.5 5.5 0 019 1.5Z" stroke="currentColor" strokeWidth="1.4"/>
														<circle cx="9" cy="7" r="2.2" fill="currentColor"/>
													</svg>
												</div>
												<span className={styles.placeGridName}>{place.name}</span>
											</a>
										) : (
											<div className={styles.placeGridLink} style={{ cursor: 'default' }}>
												<div className={styles.placeGridIcon}>
													<svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
														<path d="M9 1.5a5.5 5.5 0 015.5 5.5C14.5 11.5 9 16.5 9 16.5S3.5 11.5 3.5 7A5.5 5.5 0 019 1.5Z" stroke="currentColor" strokeWidth="1.4"/>
														<circle cx="9" cy="7" r="2.2" fill="currentColor"/>
													</svg>
												</div>
												<span className={styles.placeGridName}>{place.name}</span>
											</div>
										)}
										{isOwner && (
											<button
												type="button"
												className={styles.placeGridRemove}
												onClick={e => { e.stopPropagation(); handleRemovePlace(place.id) }}
												aria-label="Видалити місце"
											>
												<svg width="8" height="8" viewBox="0 0 10 10" fill="none">
													<path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
												</svg>
											</button>
										)}
									</div>
								)
							})}
						</div>
					)}
				</div>
			)}

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

			{/* ── Photos editorial collage / adaptive masonry ── */}
			{memory.photos.length === 0 ? (
				<div className={styles.emptyPhotos}>
					<span className={styles.emptyIcon}>📷</span>
					<p className={styles.emptyText}>Поки немає фотографій</p>
					<p className={styles.emptyHint}>Натисни «+ Додати фото» вище</p>
				</div>
			) : (
				<div className={styles.photoGrid}>
					{memory.photos.map((photo, i) => (
						<PhotoItem
							key={photo.id}
							photo={photo}
							span={photoLayouts[i] ?? 1}
							ratio={photoRatios[photo.id]}
							onTap={() => setViewerIndex(i)}
							onSetCover={isOwner ? () => setCover(id!, photo.url) : undefined}
							onDelete={isOwner ? () => deletePhoto(id!, photo.id) : undefined}
							onRatioDetected={handleRatioDetected}
						/>
					))}
				</div>
			)}

			{/* ── Add place modal ── */}
			<Modal isOpen={addingPlace} onClose={() => setAddingPlace(false)} title="Додати заклад" draggable>
				<LocationSearch onSelect={handleAddPlace} inlineResults />
			</Modal>

			{/* ── Photo viewer ── */}
			{viewerIndex !== null && (
				<PhotoViewerModal
					photos={memory.photos}
					initialIndex={viewerIndex}
					onClose={() => setViewerIndex(null)}
					onDelete={isOwner ? (photoId => {
						const newIndex = Math.min(viewerIndex, memory.photos.length - 2)
						deletePhoto(id!, photoId)
						if (memory.photos.length <= 1) {
							setViewerIndex(null)
						} else {
							setViewerIndex(newIndex >= 0 ? newIndex : 0)
						}
					}) : undefined}
					onCaption={isOwner ? ((photoId, caption) => updatePhoto(id!, photoId, { caption })) : undefined}
					onSetCover={isOwner ? ((url) => setCover(id!, url)) : undefined}
				/>
			)}

			{/* ── Edit modal ── */}
			{isOwner && showEdit && (
				<EditMemoryModal
					title={memory.title}
					location={memory.location ?? ''}
					lat={memory.lat ?? null}
					lng={memory.lng ?? null}
					date={memory.date}
					dateEnd={memory.dateEnd ?? null}
					isTrip={memory.isTrip ?? false}
					coverUrl={memory.coverUrl ?? ''}
					withProfiles={memory.withProfiles ?? []}
					onSave={(title, location, date, dateEnd, isTrip, withProfiles) =>
						updateMemory(id!, {
							title,
							location: location.address || location.name || undefined,
							lat: location.lat,
							lng: location.lng,
							date,
							dateEnd,
							isTrip,
							withProfiles,
						})
					}
					onChangeCover={(url, attribution) => {
                    setCover(id!, url)
                    if (attribution) updateMemory(id!, { coverAttribution: attribution })
                  }}
					onClose={() => setShowEdit(false)}
				/>
			)}

			{/* ── Delete confirm ── */}
			{isOwner && showDeleteConfirm && (
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

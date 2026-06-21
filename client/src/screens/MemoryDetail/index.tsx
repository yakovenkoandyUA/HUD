import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PhotoViewerModal from '../../components/memories/PhotoViewerModal'
import ImageUploadButton from '../../components/ui/ImageUploadButton'
import LocationSearch from '../../components/memories/LocationSearch'
import MemoryCard from '../../components/memories/MemoryCard'
import { useMemoriesStore } from '../../store/memoriesStore'
import { useUiStore } from '../../store/uiStore'
import { uploadToCloudinary } from '../../utils/uploadToCloudinary'
import { generateMemoryPosterBlob } from '../../utils/generateMemoryPoster'
import { useLongPress } from '../../hooks/useLongPress'
import type { Memory, MemoryPhoto } from '../../types/memory'
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
  coverUrl: string
  onSave: (title: string, location: PlanLocation) => void
  onChangeCover: (url: string) => void
  onClose: () => void
}

const EditMemoryModal: React.FC<EditMemoryModalProps> = ({
  title: initTitle, location: initLoc, lat: initLat, lng: initLng, coverUrl, onSave, onChangeCover, onClose,
}) => {
  const [title, setTitle]       = useState(initTitle)
  const [location, setLocation] = useState<PlanLocation>({
    name: null, address: initLoc || null, lat: initLat, lng: initLng,
  })

  return (
    <div className={styles.editOverlay} onClick={onClose}>
      <div className={styles.editSheet} onClick={e => e.stopPropagation()}>
        <div className={styles.editHeader}>
          <span className={styles.editTitle}>РЕДАГУВАТИ</span>
          <button type="button" className={styles.editClose} onClick={onClose}>×</button>
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
          <button
            type="button"
            className={styles.editSave}
            disabled={!title.trim()}
            onClick={() => { onSave(title.trim(), location); onClose() }}
          >
            ЗБЕРЕГТИ
          </button>
        </div>
      </div>
    </div>
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
            {memory.location && <span>{memory.location} · </span>}
            <span>{formatMemoryDate(memory.date)}</span>
            {memory.photos.length > 0 && (
              <span className={styles.headerPhotoCount}>
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                  <rect x="1.5" y="2.5" width="11" height="9" rx="1.3" stroke="currentColor" strokeWidth="1.2"/>
                  <circle cx="4.7" cy="5.5" r="1" fill="currentColor"/>
                  <path d="M2 9.5l3-3 2 2 2.5-3 2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {memory.photos.length} фото
              </span>
            )}
          </p>
        </div>

        {memory.ownerName && (
          <div className={styles.ownerBadge} title={memory.ownerName}>
            {memory.ownerAvatarUrl
              ? <img src={memory.ownerAvatarUrl} alt={memory.ownerName} className={styles.ownerAvatar} />
              : <span className={styles.ownerInitial}>{memory.ownerName[0]}</span>
            }
          </div>
        )}

        <button
          type="button"
          className={styles.menuBtn}
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Меню"
        >
          ⋮
        </button>

        {menuOpen && (
          <>
            <div className={styles.dropBackdrop} onClick={() => setMenuOpen(false)} />
            <div className={styles.dropdown}>
              <button
                type="button"
                className={styles.dropItem}
                onClick={() => { setShowEdit(true); setMenuOpen(false) }}
              >
                Редагувати подію
              </button>
              <div className={styles.dropDivider} />
              <button
                type="button"
                className={`${styles.dropItem} ${styles.dropItemDanger}`}
                onClick={() => { setShowDeleteConfirm(true); setMenuOpen(false) }}
              >
                Видалити подію
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Upload row ── */}
      <div className={styles.uploadRow}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFilesChange}
        />
        <button
          type="button"
          className={styles.btnPhoto}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading && uploadProgress
            ? `${uploadProgress.done}/${uploadProgress.total}...`
            : (
              <>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                ФОТО
              </>
            )
          }
        </button>
        <button
          type="button"
          className={styles.btnShare}
          onClick={handleShare}
          disabled={sharing}
        >
          {sharing ? (
            '...'
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              ПОДІЛИТИСЬ
            </>
          )}
        </button>
      </div>

      {/* ── Notes + tags (collapsed row) ── */}
      <div className={styles.metaRow}>
        {editingNotes ? (
          <div className={styles.notesEditWrap}>
            <textarea
              className={styles.notesTextarea}
              value={localNotes}
              onChange={e => setLocalNotes(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); handleCancelNotes() } }}
              autoFocus
              rows={3}
            />
            <div className={styles.notesEditActions}>
              <button type="button" className={styles.notesCancelBtn} onClick={handleCancelNotes}>Скасувати</button>
              <button type="button" className={styles.notesDoneBtn} onClick={() => handleSaveNotes(localNotes)}>Готово</button>
            </div>
          </div>
        ) : memory.notes ? (
          <p
            className={styles.notesText}
            onClick={() => { setLocalNotes(memory.notes ?? ''); setEditingNotes(true) }}
          >
            {memory.notes}
          </p>
        ) : (
          <button
            type="button"
            className={styles.pillBtn}
            onClick={() => { setLocalNotes(''); setEditingNotes(true) }}
          >
            + нотатка
          </button>
        )}

        <div className={styles.tagsWrap}>
          {(memory.tags ?? []).map(tag => (
            <span key={tag} className={styles.tag}>
              <span className={styles.tagHash}>#</span>
              {tag}
              <button
                type="button"
                className={styles.tagRemove}
                onClick={() => handleRemoveTag(tag)}
              >×</button>
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
            <button type="button" className={styles.pillBtn} onClick={() => setAddingTag(true)}>
              + тег
            </button>
          )}
        </div>
      </div>

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
              {memory.photos.filter((_, i) => i % 3 === col).map((photo) => {
                const i = memory.photos.indexOf(photo)
                return (
                  <PhotoItem
                    key={photo.id}
                    photo={photo}
                    onTap={() => setViewerIndex(i)}
                    onSetCover={() => setCover(id!, photo.url)}
                    onDelete={() => deletePhoto(id!, photo.id)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── Photo viewer ── */}
      {viewerIndex !== null && (
        <PhotoViewerModal
          photos={memory.photos}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onDelete={(photoId) => {
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
          coverUrl={memory.coverUrl ?? ''}
          onSave={(title, location) => updateMemory(id!, {
            title,
            location: location.address || location.name || undefined,
            lat:      location.lat,
            lng:      location.lng,
          })}
          onChangeCover={(url) => setCover(id!, url)}
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
              <button
                type="button"
                className={styles.confirmCancel}
                onClick={() => setShowDeleteConfirm(false)}
              >
                Скасувати
              </button>
              <button
                type="button"
                className={styles.confirmDelete}
                onClick={handleDeleteMemory}
              >
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

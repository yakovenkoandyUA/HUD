import React, { useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PhotoViewerModal from '../../components/memories/PhotoViewerModal'
import { useMemoriesStore } from '../../store/memoriesStore'
import { uploadToCloudinary } from '../../utils/uploadToCloudinary'
import { useLongPress } from '../../hooks/useLongPress'
import type { MemoryPhoto } from '../../types/memory'
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

  const longPress = useLongPress(() => setMenuOpen(true))

  return (
    <div className={styles.photoItem} {...longPress}>
      <img
        src={photo.url}
        alt={photo.caption ?? ''}
        className={styles.photoImg}
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
 * Inline модалка редагування назви / місця події.
 */
interface EditMemoryModalProps {
  title: string
  location: string
  onSave: (title: string, location: string) => void
  onClose: () => void
}

const EditMemoryModal: React.FC<EditMemoryModalProps> = ({ title: initTitle, location: initLoc, onSave, onClose }) => {
  const [title, setTitle]       = useState(initTitle)
  const [location, setLocation] = useState(initLoc)

  return (
    <div className={styles.editOverlay} onClick={onClose}>
      <div className={styles.editSheet} onClick={e => e.stopPropagation()}>
        <div className={styles.editHeader}>
          <span className={styles.editTitle}>РЕДАГУВАТИ</span>
          <button type="button" className={styles.editClose} onClick={onClose}>×</button>
        </div>
        <div className={styles.editBody}>
          <label className={styles.editLabel}>НАЗВА</label>
          <input
            className={styles.editInput}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <label className={styles.editLabel}>МІСЦЕ</label>
          <input
            className={styles.editInput}
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Де це було?"
          />
          <button
            type="button"
            className={styles.editSave}
            disabled={!title.trim()}
            onClick={() => { onSave(title.trim(), location.trim()); onClose() }}
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
  const { memories, addPhoto, deletePhoto, setCover, updatePhoto, updateMemory, deleteMemory } =
    useMemoriesStore()

  const memory = memories.find(m => m.id === id)

  const [viewerIndex, setViewerIndex]   = useState<number | null>(null)
  const [uploading, setUploading]       = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const [menuOpen, setMenuOpen]         = useState(false)
  const [showEdit, setShowEdit]         = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
              <span> · 🖼 {memory.photos.length} фото</span>
            )}
          </p>
        </div>

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

      {/* ── Add photo button ── */}
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
          className={styles.addPhotoBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading && uploadProgress
            ? `Завантаження ${uploadProgress.done}/${uploadProgress.total}...`
            : '+ ДОДАТИ ФОТО'
          }
        </button>
      </div>

      {/* ── Photos masonry grid ── */}
      {memory.photos.length === 0 ? (
        <div className={styles.emptyPhotos}>
          <span className={styles.emptyIcon}>📷</span>
          <p className={styles.emptyText}>Поки немає фотографій</p>
          <p className={styles.emptyHint}>Натисни «+ Додати фото» вище</p>
        </div>
      ) : (
        <div className={styles.masonryGrid}>
          {memory.photos.map((photo, i) => (
            <PhotoItem
              key={photo.id}
              photo={photo}
              onTap={() => setViewerIndex(i)}
              onSetCover={() => setCover(id!, photo.url)}
              onDelete={() => deletePhoto(id!, photo.id)}
            />
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
          onSave={(title, location) => updateMemory(id!, { title, location: location || undefined })}
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

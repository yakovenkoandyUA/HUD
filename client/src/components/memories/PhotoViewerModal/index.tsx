import React, { useState, useRef, useEffect } from 'react'
import type { MemoryPhoto } from '../../../types/memory'
import styles from './PhotoViewerModal.module.css'

/**
 * PhotoViewerModal
 * ----------------
 * Fullscreen перегляд фотографій з свайпом між ними.
 *
 * Props:
 * @prop {MemoryPhoto[]}             photos          — список фотографій
 * @prop {number}                    initialIndex    — індекс фото для відкриття
 * @prop {() => void}                onClose         — закриття
 * @prop {(id: string) => void}      onDelete        — видалення фото по id
 * @prop {(id: string, caption: string) => void} onCaption — зміна підпису
 */
interface PhotoViewerModalProps {
  photos: MemoryPhoto[]
  initialIndex: number
  onClose: () => void
  onDelete: (id: string) => void
  onCaption: (id: string, caption: string) => void
}

const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  photos,
  initialIndex,
  onClose,
  onDelete,
  onCaption,
}) => {
  const [index, setIndex]         = useState(initialIndex)
  const [showUI, setShowUI]       = useState(true)
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionInput, setCaptionInput]     = useState('')

  const touchStartX = useRef(0)

  const photo = photos[index]

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex(initialIndex)
  }, [initialIndex])

  useEffect(() => {
    if (!photo) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCaptionInput(photo.caption ?? '')
    setEditingCaption(false)
  }, [photo?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft'  && index > 0)              setIndex(i => i - 1)
      if (e.key === 'ArrowRight' && index < photos.length - 1) setIndex(i => i + 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [index, photos.length, onClose])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta > 50 && index > 0)              setIndex(i => i - 1)
    if (delta < -50 && index < photos.length - 1) setIndex(i => i + 1)
  }

  const handleDelete = () => {
    onDelete(photo.id)
    if (photos.length === 1) {
      onClose()
    } else {
      setIndex(i => Math.min(i, photos.length - 2))
    }
  }

  const handleCaptionSave = () => {
    onCaption(photo.id, captionInput)
    setEditingCaption(false)
  }

  if (!photo) return null

  return (
    <div className={styles.fullscreen}>
      {/* Photo */}
      <div
        className={styles.imageWrap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => setShowUI(v => !v)}
      >
        <img src={photo.url} alt={photo.caption ?? ''} className={styles.image} />
      </div>

      {/* UI overlay */}
      <div className={`${styles.ui} ${showUI ? styles.uiVisible : styles.uiHidden}`}>
        {/* Top bar */}
        <div className={styles.topBar}>
          <span className={styles.counter}>{index + 1} / {photos.length}</span>
          <div className={styles.topActions}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={e => { e.stopPropagation(); setEditingCaption(v => !v) }}
              title="Редагувати підпис"
            >
              ✎
            </button>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.deleteBtn}`}
              onClick={e => { e.stopPropagation(); handleDelete() }}
              title="Видалити фото"
            >
              🗑
            </button>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={e => { e.stopPropagation(); onClose() }}
              title="Закрити"
            >
              ×
            </button>
          </div>
        </div>

        {/* Prev / Next */}
        {index > 0 && (
          <button
            type="button"
            className={`${styles.navBtn} ${styles.navBtnPrev}`}
            onClick={e => { e.stopPropagation(); setIndex(i => i - 1) }}
            aria-label="Попереднє фото"
          >
            ‹
          </button>
        )}
        {index < photos.length - 1 && (
          <button
            type="button"
            className={`${styles.navBtn} ${styles.navBtnNext}`}
            onClick={e => { e.stopPropagation(); setIndex(i => i + 1) }}
            aria-label="Наступне фото"
          >
            ›
          </button>
        )}

        {/* Bottom: caption */}
        <div className={styles.bottom} onClick={e => e.stopPropagation()}>
          {editingCaption ? (
            <div className={styles.captionEdit}>
              <input
                className={styles.captionInput}
                value={captionInput}
                onChange={e => setCaptionInput(e.target.value)}
                placeholder="Підпис..."
                autoFocus
              />
              <button type="button" className={styles.captionSave} onClick={handleCaptionSave}>
                Зберегти
              </button>
            </div>
          ) : photo.caption ? (
            <p className={styles.caption}>{photo.caption}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default PhotoViewerModal

import React, { useState, useRef, useEffect } from 'react'
import { useModalHistory } from '../../../hooks/useModalHistory'
import type { MemoryPhoto } from '../../../types/memory'
import styles from './PhotoViewerModal.module.css'

/**
 * PhotoViewerModal
 * ----------------
 * Fullscreen перегляд фотографій з свайпом між ними.
 * Анімація відкриття/закриття (scale+fade) та слайд між фото (left/right).
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

type SlideDir = 'next' | 'prev' | null

const CLOSE_MS = 240

const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  photos,
  initialIndex,
  onClose,
  onDelete,
  onCaption,
}) => {
  useModalHistory(onClose, true)

  const [index, setIndex]         = useState(initialIndex)
  const [showUI, setShowUI]       = useState(true)
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionInput, setCaptionInput]     = useState('')
  const [slideDir, setSlideDir]   = useState<SlideDir>(null)
  const [closing, setClosing]     = useState(false)

  const touchStartX = useRef(0)

  const photo = photos[index]

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goNext = () => {
    if (index >= photos.length - 1) return
    setSlideDir('next')
    setIndex(i => i + 1)
  }

  const goPrev = () => {
    if (index <= 0) return
    setSlideDir('prev')
    setIndex(i => i - 1)
  }

  const handleClose = () => {
    setClosing(true)
    setTimeout(onClose, CLOSE_MS)
  }

  // ── Sync with parent ─────────────────────────────────────────────────────────

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex(initialIndex)
    setSlideDir(null)
  }, [initialIndex])

  useEffect(() => {
    if (!photo) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCaptionInput(photo.caption ?? '')
    setEditingCaption(false)
  }, [photo?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      handleClose()
      if (e.key === 'ArrowLeft')   goPrev()
      if (e.key === 'ArrowRight')  goNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, photos.length])

  // ── Touch swipe ───────────────────────────────────────────────────────────────

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta > 50)  goPrev()
    if (delta < -50) goNext()
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  const handleDelete = () => {
    onDelete(photo.id)
    if (photos.length === 1) {
      handleClose()
    } else {
      setIndex(i => Math.min(i, photos.length - 2))
    }
  }

  const handleCaptionSave = () => {
    onCaption(photo.id, captionInput)
    setEditingCaption(false)
  }

  if (!photo) return null

  const slideClass =
    slideDir === 'next' ? styles.slideFromRight :
    slideDir === 'prev' ? styles.slideFromLeft  :
    styles.fadeIn

  return (
    <div className={`${styles.fullscreen} ${closing ? styles.viewerOut : styles.viewerIn}`}>
      {/* Photo */}
      <div
        className={styles.imageWrap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => setShowUI(v => !v)}
      >
        <img
          key={index}
          src={photo.url}
          alt={photo.caption ?? ''}
          className={`${styles.image} ${slideClass}`}
        />
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
              onClick={e => { e.stopPropagation(); handleClose() }}
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
            onClick={e => { e.stopPropagation(); goPrev() }}
            aria-label="Попереднє фото"
          >
            ‹
          </button>
        )}
        {index < photos.length - 1 && (
          <button
            type="button"
            className={`${styles.navBtn} ${styles.navBtnNext}`}
            onClick={e => { e.stopPropagation(); goNext() }}
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

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useModalHistory } from '@/shared/hooks/useModalHistory'
import type { MemoryPhoto } from '../../../types/memory'
import styles from './PhotoViewerModal.module.css'

/**
 * PhotoViewerModal
 * ----------------
 * Fullscreen перегляд фотографій з live-drag свайпом між ними.
 * Drag → translateX фідбек → snap або повернення. Стрілки збережені для десктопу.
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
  onDelete?: (id: string) => void
  onCaption?: (id: string, caption: string) => void
}

type SlideDir = 'next' | 'prev' | null

const CLOSE_MS    = 240
const SWIPE_THRESHOLD = 60

const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  photos,
  initialIndex,
  onClose,
  onDelete,
  onCaption,
}) => {
  const [index, setIndex]           = useState(initialIndex)
  const [showUI, setShowUI]         = useState(true)
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionInput, setCaptionInput]     = useState('')
  const [slideDir, setSlideDir]     = useState<SlideDir>(null)
  const [closing, setClosing]       = useState(false)
  const [dragX, setDragX]           = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isDragLocked = useRef(false) // locked to horizontal after first 10px
  const imageWrapRef = useRef<HTMLDivElement>(null)

  const photo = photos[index]

  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(onClose, CLOSE_MS)
  }, [onClose])

  useModalHistory(handleClose, !closing)

  const goNext = useCallback(() => {
    if (index >= photos.length - 1) return
    setSlideDir('next')
    setDragX(0)
    setIndex(i => i + 1)
  }, [index, photos.length])

  const goPrev = useCallback(() => {
    if (index <= 0) return
    setSlideDir('prev')
    setDragX(0)
    setIndex(i => i - 1)
  }, [index])

  // ── Sync with parent ──────────────────────────────────────────────────────────

  useEffect(() => {
    setIndex(initialIndex)
    setSlideDir(null)
  }, [initialIndex])

  useEffect(() => {
    if (!photo) return
    setCaptionInput(photo.caption ?? '')
    setEditingCaption(false)
  }, [photo?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     handleClose()
      if (e.key === 'ArrowLeft')  goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleClose, goPrev, goNext])

  // ── Touch swipe with live drag ────────────────────────────────────────────────
  // Imperative listeners (passive: false) — React's synthetic onTouchMove is
  // passive by default, so e.preventDefault() inside a JSX handler is a no-op
  // and the browser's own scroll/gesture handling wins over the swipe.

  useEffect(() => {
    const el = imageWrapRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
      isDragLocked.current = false
      setIsDragging(false)
      setSlideDir(null)
    }

    const onTouchMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - touchStartX.current
      const dy = e.touches[0].clientY - touchStartY.current

      if (!isDragLocked.current) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        if (Math.abs(dy) > Math.abs(dx)) return // vertical scroll — ignore
        isDragLocked.current = true
      }

      e.preventDefault()
      setIsDragging(true)

      // Resist at edges
      const atStart = index === 0 && dx > 0
      const atEnd   = index === photos.length - 1 && dx < 0
      const resist  = atStart || atEnd
      setDragX(resist ? dx * 0.25 : dx)
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!isDragLocked.current) {
        setDragX(0)
        setIsDragging(false)
        return
      }

      const dx = e.changedTouches[0].clientX - touchStartX.current
      setIsDragging(false)

      if (dx < -SWIPE_THRESHOLD && index < photos.length - 1) {
        goNext()
      } else if (dx > SWIPE_THRESHOLD && index > 0) {
        goPrev()
      } else {
        setDragX(0)
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove',  onTouchMove,  { passive: false })
    el.addEventListener('touchend',   onTouchEnd,   { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove',  onTouchMove)
      el.removeEventListener('touchend',   onTouchEnd)
    }
  }, [index, photos.length, goNext, goPrev])

  // ── Delete ────────────────────────────────────────────────────────────────────

  const handleDelete = () => {
    if (!onDelete) return
    onDelete(photo.id)
    if (photos.length === 1) {
      handleClose()
    } else {
      setIndex(i => Math.min(i, photos.length - 2))
    }
  }

  const handleCaptionSave = () => {
    if (!onCaption) return
    onCaption(photo.id, captionInput)
    setEditingCaption(false)
  }

  if (!photo) return null

  const slideClass =
    slideDir === 'next' ? styles.slideFromRight :
    slideDir === 'prev' ? styles.slideFromLeft  :
    styles.fadeIn

  const imgStyle: React.CSSProperties = isDragging
    ? { transform: `translateX(${dragX}px)`, transition: 'none' }
    : dragX === 0
      ? {}
      : { transform: 'translateX(0)', transition: 'transform 0.25s cubic-bezier(0.2,0,0,1)' }

  return (
    <div className={`${styles.fullscreen} ${closing ? styles.viewerOut : styles.viewerIn}`}>
      {/* Photo */}
      <div
        ref={imageWrapRef}
        className={styles.imageWrap}
        onClick={() => { if (!isDragging) setShowUI(v => !v) }}
      >
        <img
          key={index}
          src={photo.url}
          alt={photo.caption ?? ''}
          className={`${styles.image} ${isDragging ? '' : slideClass}`}
          style={imgStyle}
          draggable={false}
        />
      </div>

      {/* UI overlay */}
      <div className={`${styles.ui} ${showUI ? styles.uiVisible : styles.uiHidden}`}>
        {/* Top bar */}
        <div className={styles.topBar}>
          <span className={styles.counter}>{index + 1} / {photos.length}</span>
          <div className={styles.topActions}>
            {onCaption && (
              <button
                type="button"
                className={styles.actionBtn}
                onClick={e => { e.stopPropagation(); setEditingCaption(v => !v) }}
                title="Редагувати підпис"
              >
                ✎
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                onClick={e => { e.stopPropagation(); handleDelete() }}
                title="Видалити фото"
              >
                🗑
              </button>
            )}
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

        {/* Prev / Next — збережені для десктопу */}
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
          {editingCaption && onCaption ? (
            <div className={styles.captionEdit}>
              <input
                className={styles.captionInput}
                value={captionInput}
                onChange={e => setCaptionInput(e.target.value)}
                placeholder="Підпис..."
                onKeyDown={e => { if (e.key === 'Enter') handleCaptionSave() }}
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

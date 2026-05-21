import React, { useEffect, useRef, useState } from 'react'
import styles from './NasaApod.module.css'
import type { ApodData } from '../../../hooks/useNasaApod'

/**
 * NasaApod
 * --------
 * Fullscreen Easter egg modal — NASA Astronomy Picture of the Day.
 * Swipe down from top to close. Supports image and video APOD.
 *
 * Props:
 * @prop {boolean}          isOpen
 * @prop {() => void}       onClose
 * @prop {ApodData | null}  data
 * @prop {boolean}          loading
 * @prop {string}           error
 */
interface NasaApodProps {
  isOpen: boolean
  onClose: () => void
  data: ApodData | null
  loading: boolean
  error: string
}

const ANIM_MS = 350

const NasaApod: React.FC<NasaApodProps> = ({ isOpen, onClose, data, loading, error }) => {
  const [mounted, setMounted] = useState(isOpen)
  const [visible, setVisible] = useState(isOpen)
  const [dragY, setDragY] = useState(0)
  const touchStartY = useRef(0)
  const dragging = useRef(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), ANIM_MS)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleTouchStart = (e: React.TouchEvent) => {
    const el = wrapRef.current
    if (!el || el.scrollTop > 0) return
    touchStartY.current = e.touches[0].clientY
    dragging.current = true
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return
    const el = wrapRef.current
    if (!el || el.scrollTop > 0) { dragging.current = false; setDragY(0); return }
    const dy = e.touches[0].clientY - touchStartY.current
    if (dy > 0) setDragY(dy)
  }

  const handleTouchEnd = () => {
    dragging.current = false
    if (dragY > 80) {
      onClose()
    }
    setDragY(0)
  }

  if (!mounted) return null

  const isVideo = data?.media_type === 'video'
  const imgSrc = isVideo ? data?.thumbnail_url : (data?.hdurl ?? data?.url)
  const dragOpacity = Math.max(0.3, 1 - dragY / 300)
  const dragTranslate = dragY * 0.45

  return (
    <div
      className={`${styles.overlay} ${visible ? styles.overlayIn : styles.overlayOut}`}
      style={{ opacity: visible ? dragOpacity : undefined }}
    >
      <div
        ref={wrapRef}
        className={styles.wrap}
        style={{ transform: `translateY(${dragTranslate}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.dragPill} />
          <span className={styles.badge}>NASA · APOD</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            ✕
          </button>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className={styles.center}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Connecting to cosmos...</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div className={styles.center}>
            <p className={styles.errorText}>{error}</p>
          </div>
        )}

        {/* ── Content ── */}
        {data && !loading && (
          <>
            {/* Image / Video thumbnail */}
            <div className={styles.mediaWrap}>
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={data.title}
                  className={styles.img}
                />
              ) : (
                <div className={styles.noMedia} />
              )}
              {isVideo && (
                <div className={styles.playOverlay}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="23" stroke="white" strokeWidth="2" fill="rgba(0,0,0,0.5)" />
                    <path d="M19 16l14 8-14 8V16z" fill="white" />
                  </svg>
                </div>
              )}
            </div>

            {isVideo && data.url && (
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.ytBtn}
              >
                Відкрити на YouTube ↗
              </a>
            )}

            {/* Info */}
            <div className={styles.info}>
              <h2 className={styles.title}>{data.title}</h2>
              <p className={styles.date}>{data.date}</p>
              <p className={styles.explanation}>{data.explanation}</p>
              {data.copyright && (
                <p className={styles.copyright}>© {data.copyright.trim()}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default NasaApod

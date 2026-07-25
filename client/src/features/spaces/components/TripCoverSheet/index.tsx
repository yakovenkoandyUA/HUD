import React, { useEffect, useRef, useState } from 'react'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { useImageUpload } from '@/shared/hooks/useImageUpload'
import { useUiStore } from '@/shared/store/uiStore'
import styles from './TripCoverSheet.module.css'

interface UnsplashPhoto {
  url: string
  attribution: string
}

/**
 * TripCoverSheet
 * --------------
 * Bottom sheet для вибору обкладинки простору.
 * Три варіанти: по замовчуванню (іконка типу), власне фото (Cloudinary), Unsplash grid.
 *
 * @prop isOpen          — чи відкритий sheet
 * @prop onClose         — закриття
 * @prop photos          — список unsplash фото (pre-fetched за destination)
 * @prop selectedUrl     — поточний coverUrl простору ('' = по замовчуванню)
 * @prop defaultIconSrc  — URL іконки типу простору (для preview кнопки "По замовчуванню")
 * @prop onSelect        — вибрати unsplash фото або '' для очищення
 * @prop onUploadOwn     — завантажити власне фото (передає cloudinary url)
 */
interface Props {
  isOpen:         boolean
  onClose:        () => void
  photos:         UnsplashPhoto[]
  selectedUrl:    string
  defaultIconSrc?: string
  onSelect:       (url: string) => void
  onUploadOwn:    (url: string) => void
}

const TripCoverSheet: React.FC<Props> = ({
  isOpen, onClose, photos, selectedUrl, defaultIconSrc, onSelect, onUploadOwn,
}) => {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const { showToast } = useUiStore()

  const sheetRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, sheetRef, overlayRef, bodyRef })

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const { trigger, uploading, inputElement } = useImageUpload('spaces', (url) => {
    onUploadOwn(url)
    showToast('Фото збережено', 'success')
    onClose()
  })

  if (!mounted) return null

  const isDefault  = !selectedUrl
  const isCustom   = !!selectedUrl && !selectedUrl.includes('images.unsplash.com')

  return (
    <div
      ref={overlayRef}
      className={`${styles.overlay} ${visible ? styles.overlayVisible : ''}`}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        ref={sheetRef}
        className={`${styles.sheet} ${visible ? styles.sheetVisible : ''}`}
      >
        {inputElement}
        <div className={styles.handle} />

        <div className={styles.header}>
          <span className={styles.title}>ОБКЛАДИНКА</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div ref={bodyRef} className={styles.body}>

          {/* Top row: Default + Upload */}
          <div className={styles.topRow}>

            {/* Default */}
            <button
              type="button"
              className={`${styles.topBtn} ${isDefault ? styles.topBtnActive : ''}`}
              onClick={() => { onSelect(''); onClose() }}
            >
              {defaultIconSrc ? (
                <img src={defaultIconSrc} alt="" className={styles.topBtnIcon} />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                  <path d="M3 9h18M9 21V9"/>
                </svg>
              )}
              <span className={styles.topBtnLabel}>По замовченню</span>
              {isDefault && (
                <div className={styles.topBtnCheck}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
              )}
            </button>

            {/* Upload own */}
            <button
              type="button"
              className={`${styles.topBtn} ${isCustom ? styles.topBtnActive : ''}`}
              onClick={trigger}
              disabled={uploading}
            >
              {isCustom ? (
                <img src={selectedUrl} alt="" className={styles.topBtnIcon} style={{ objectFit: 'cover' }} />
              ) : uploading ? (
                <span className={styles.spinner} />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
              )}
              <span className={styles.topBtnLabel}>{isCustom ? 'Своє фото' : 'Завантажити'}</span>
              {isCustom && (
                <div className={styles.topBtnCheck}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
              )}
            </button>
          </div>

          {/* Unsplash grid */}
          {photos.length > 0 && (
            <>
              <div className={styles.sectionLabel}>UNSPLASH · {photos.length} фото</div>

              <div className={styles.grid}>
                {photos.map((photo, i) => {
                  const isSelected = selectedUrl === photo.url
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`${styles.photoCell} ${isSelected ? styles.photoCellSelected : ''}`}
                      onClick={() => { onSelect(photo.url); onClose() }}
                      title={photo.attribution}
                    >
                      <img src={photo.url} alt="" className={styles.photoImg} loading="lazy" />
                      {isSelected && (
                        <div className={styles.checkOverlay}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              <p className={styles.credit}>
                Фото надані{' '}
                <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className={styles.creditLink}>
                  Unsplash
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default TripCoverSheet

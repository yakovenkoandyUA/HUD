import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useModalHistory } from '../../../hooks/useModalHistory'
import { useSwipeToDismiss } from '../../../hooks/useSwipeToDismiss'
import styles from './UnsplashPicker.module.css'

const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY as string

interface UnsplashPhoto {
  id: string
  urls: { small: string; regular: string }
  user: { name: string; links: { html: string } }
}

/**
 * UnsplashPicker
 * --------------
 * Bottom sheet для пошуку фото на Unsplash.
 * Відображає 3×3 grid з попереднім переглядом і attribution.
 *
 * Props:
 * @prop {boolean}                                      isOpen   — чи відкритий пікер
 * @prop {() => void}                                   onClose  — закриття
 * @prop {(url: string, attribution: string) => void}   onSelect — вибране фото + attribution рядок
 */
interface UnsplashPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (url: string, attribution: string) => void
}

const UnsplashPicker: React.FC<UnsplashPickerProps> = ({ isOpen, onClose, onSelect }) => {
  const [mounted, setMounted]   = useState(false)
  const [visible, setVisible]   = useState(false)
  const [query, setQuery]       = useState('')
  const [photos, setPhotos]     = useState<UnsplashPhoto[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(false)
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef                = useRef<HTMLInputElement>(null)

  useModalHistory(onClose, isOpen)
  const sheetRef = useSwipeToDismiss(onClose, { enabled: mounted })

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setVisible(true)
        setTimeout(() => inputRef.current?.focus(), 320)
      }))
    } else {
      setVisible(false)
      const t = setTimeout(() => {
        setMounted(false)
        setQuery('')
        setPhotos([])
        setError(false)
      }, 340)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setPhotos([]); setLoading(false); return }
    setLoading(true)
    setError(false)
    let cancelled = false
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=9&orientation=landscape`,
        { headers: { Authorization: `Client-ID ${ACCESS_KEY}` } }
      )
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json() as { results: UnsplashPhoto[] }
      if (!cancelled) setPhotos(data.results ?? [])
    } catch {
      if (!cancelled) setError(true)
    } finally {
      if (!cancelled) setLoading(false)
    }
    return () => { cancelled = true }
  }, [])

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 600)
  }

  const handleSelect = (photo: UnsplashPhoto) => {
    // Unsplash TOS: trigger download endpoint
    fetch(
      `https://api.unsplash.com/photos/${photo.id}/download`,
      { headers: { Authorization: `Client-ID ${ACCESS_KEY}` } }
    ).catch(() => {})

    const attribution = `Photo by ${photo.user.name} on Unsplash`
    onSelect(photo.urls.regular, attribution)
    onClose()
  }

  if (!mounted) return null

  return (
    <div
      className={`${styles.overlay} ${visible ? styles.overlayVisible : styles.overlayHidden}`}
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        className={`${styles.sheet} ${visible ? styles.sheetVisible : styles.sheetHidden}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.handle} />

        <div className={styles.header}>
          <span className={styles.headerTitle}>ЗНАЙТИ ФОТО</span>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            className={styles.searchInput}
            value={query}
            onChange={handleQueryChange}
            placeholder="Пошук фото..."
            autoComplete="off"
          />
          {query && (
            <button type="button" className={styles.clearBtn} onClick={() => { setQuery(''); setPhotos([]) }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        <div className={styles.body}>
          {loading && (
            <div className={styles.stateBox}>
              <span className={styles.spinner} />
            </div>
          )}

          {!loading && error && (
            <div className={styles.stateBox}>
              <span className={styles.stateText}>Не вдалося завантажити</span>
            </div>
          )}

          {!loading && !error && query && photos.length === 0 && (
            <div className={styles.stateBox}>
              <span className={styles.stateText}>Нічого не знайдено</span>
            </div>
          )}

          {!loading && !error && !query && (
            <div className={styles.stateBox}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={styles.stateIcon}>
                <circle cx="11" cy="11" r="7.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <span className={styles.stateText}>Введіть назву місця або події</span>
            </div>
          )}

          {!loading && photos.length > 0 && (
            <>
              <div className={styles.grid}>
                {photos.map(photo => (
                  <button
                    key={photo.id}
                    type="button"
                    className={styles.photoBtn}
                    onClick={() => handleSelect(photo)}
                    title={`Photo by ${photo.user.name}`}
                  >
                    <img
                      src={photo.urls.small}
                      alt={`Photo by ${photo.user.name}`}
                      className={styles.photoImg}
                      loading="lazy"
                    />
                    <div className={styles.photoAttribution}>
                      {photo.user.name}
                    </div>
                  </button>
                ))}
              </div>
              <p className={styles.unsplashCredit}>
                Фото з{' '}
                <a
                  href="https://unsplash.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.unsplashLink}
                >
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

export default UnsplashPicker

import React, { useEffect } from 'react'
import { useImageUpload } from '@/shared/hooks/useImageUpload'
import { useUiStore } from '@/shared/store/uiStore'
import styles from './ImageUploadButton.module.css'

/**
 * ImageUploadButton
 * -----------------
 * Кнопка завантаження зображення на Cloudinary з прев'ю і станами.
 * Показує dashed-плейсхолдер якщо зображення немає,
 * або прев'ю з кнопками "Змінити" / "×" якщо зображення є.
 *
 * Props:
 * @prop {string | undefined}        currentUrl      — поточний URL зображення
 * @prop {string}                    folder          — папка в Cloudinary
 * @prop {(url: string) => void}     onUpload        — коллбек з новим URL ('' = видалити)
 * @prop {string}                    [placeholder]   — текст без зображення
 * @prop {'square' | 'wide'}         [variant]       — square (1:1), wide (16:9) або circle (аватар)
 * @prop {string}                    [objectPosition] — CSS object-position для прев'ю (н-д "center top")
 */
interface ImageUploadButtonProps {
  currentUrl?: string
  folder: string
  onUpload: (url: string) => void
  placeholder?: string
  variant?: 'square' | 'wide' | 'compact' | 'portrait' | 'fill' | 'circle'
  objectPosition?: string
}

const CameraIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M1.5 5.5C1.5 4.672 2.172 4 3 4h1.646L6 2h6l1.354 2H15c.828 0 1.5.672 1.5 1.5v9c0 .828-.672 1.5-1.5 1.5H3c-.828 0-1.5-.672-1.5-1.5v-9z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <circle cx="9" cy="9.5" r="2.2" stroke="currentColor" strokeWidth="1.4"/>
  </svg>
)

const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({
  currentUrl,
  folder,
  onUpload,
  placeholder = 'Додати фото',
  variant = 'square',
  objectPosition,
}) => {
  const { showToast } = useUiStore()

  const handleSuccess = (url: string) => {
    onUpload(url)
    showToast('Фото завантажено', 'success')
  }

  const { trigger, uploading, error, inputElement } = useImageUpload(folder, handleSuccess)

  useEffect(() => {
    if (error) showToast('Помилка завантаження — спробуй ще раз', 'error')
  }, [error, showToast])

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onUpload('')
  }

  if (variant === 'circle') {
    return (
      <div className={styles.circleWrap}>
        {inputElement}
        <button
          type="button"
          className={styles.circleBtn}
          onClick={trigger}
          disabled={uploading}
          aria-label={placeholder}
        >
          {currentUrl
            ? <img src={currentUrl} alt="" className={styles.circleImg} />
            : <CameraIcon />}
          {uploading && (
            <div className={styles.circleUploading}>
              <div className={styles.circleSpinner} />
            </div>
          )}
        </button>
        <span className={styles.circleBadge} aria-hidden="true"><CameraIcon /></span>
      </div>
    )
  }

  return (
    <div
      className={`${styles.wrap} ${styles[variant]}`}
      onClick={!currentUrl && !uploading ? trigger : undefined}
      role={!currentUrl ? 'button' : undefined}
    >
      {inputElement}

      {currentUrl ? (
        <>
          <img src={currentUrl} alt="" className={styles.img} style={objectPosition ? { objectPosition } : undefined} />
          <div className={styles.overlay}>
            <button type="button" className={styles.changeBtn} onClick={trigger}>
              Змінити
            </button>
            <button type="button" className={styles.removeBtn} onClick={handleRemove}>
              ×
            </button>
          </div>
        </>
      ) : (
        <div className={styles.placeholder}>
          <span className={styles.icon}><CameraIcon /></span>
          <span className={styles.placeholderText}>{placeholder}</span>
        </div>
      )}

      {uploading && (
        <div className={styles.uploadingOverlay}>
          <div className={styles.spinner} />
          <span className={styles.uploadingText}>Завантаження...</span>
        </div>
      )}
    </div>
  )
}

export default ImageUploadButton

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
 * @prop {'square' | 'wide'}         [variant]       — square (1:1) або wide (16:9)
 * @prop {string}                    [objectPosition] — CSS object-position для прев'ю (н-д "center top")
 */
interface ImageUploadButtonProps {
  currentUrl?: string
  folder: string
  onUpload: (url: string) => void
  placeholder?: string
  variant?: 'square' | 'wide' | 'compact' | 'portrait' | 'fill'
  objectPosition?: string
}

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
          <span className={styles.icon}>📷</span>
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

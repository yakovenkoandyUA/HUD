import React, { useState, useCallback } from 'react'
import type { Memory } from '../../../types/memory'
import { generateMemoryPosterBlob } from '../../../utils/generateMemoryPoster'
import { uploadToCloudinary } from '../../../utils/uploadToCloudinary'
import styles from './PosterGenerator.module.css'

const MONTHS_UA_SHORT = [
  'Січ', 'Лют', 'Бер', 'Квіт', 'Трав', 'Черв',
  'Лип', 'Серп', 'Вер', 'Жовт', 'Лист', 'Груд',
]

function formatMemoryDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS_UA_SHORT[m - 1]} ${y}`
}

/**
 * PosterGenerator
 * ---------------
 * Генератор постера для спогаду через Canvas API (обкладинка + назва +
 * дата/місце + теги), без зовнішніх сервісів. Завантажує результат на
 * Cloudinary і пропонує встановити як обкладинку.
 *
 * Props:
 * @prop {Memory}               memory      — спогад (для cover/title/date/tags)
 * @prop {(url: string) => void} onSetCover — зберегти URL як обкладинку
 * @prop {() => void}           onClose     — закрити (після setCover)
 */
interface PosterGeneratorProps {
  memory: Memory
  onSetCover: (url: string) => void
  onClose: () => void
}

type GenState = 'idle' | 'generating' | 'done' | 'error'

const PosterGenerator: React.FC<PosterGeneratorProps> = ({ memory, onSetCover, onClose }) => {
  const [genState,  setGenState]  = useState<GenState>('idle')
  const [posterUrl, setPosterUrl] = useState<string | null>(null)

  const generate = useCallback(async () => {
    setGenState('generating')
    setPosterUrl(null)

    try {
      const blob = await generateMemoryPosterBlob(memory, formatMemoryDate(memory.date))
      const file = new File([blob], `poster-${memory.id}.png`, { type: 'image/png' })
      const url = await uploadToCloudinary(file, 'mimir/posters')
      setPosterUrl(url)
      setGenState('done')
    } catch (err) {
      console.error('[PosterGenerator] Generation failed:', err)
      setGenState('error')
    }
  }, [memory])

  const handleSetCover = () => {
    if (!posterUrl) return
    onSetCover(posterUrl)
    onClose()
  }

  return (
    <div className={styles.wrap}>
      {genState === 'idle' && (
        <>
          <p className={styles.hint}>
            Постер з обкладинки, назви, дати та тегів цього спогаду
          </p>
          <button type="button" className={styles.generateBtn} onClick={generate}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
                stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
            </svg>
            Згенерувати постер
          </button>
        </>
      )}

      {genState === 'generating' && (
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Створюємо постер...</p>
        </div>
      )}

      {genState === 'done' && posterUrl && (
        <div className={styles.resultWrap}>
          <img src={posterUrl} alt="Memory poster" className={styles.poster} />
          <div className={styles.actions}>
            <button type="button" className={styles.retryBtn} onClick={generate}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7a5 5 0 1 0 1.5-3.5L1 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M1 2v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Ще раз
            </button>
            <button type="button" className={styles.setCoverBtn} onClick={handleSetCover}>
              Встановити як обкладинку
            </button>
          </div>
        </div>
      )}

      {genState === 'error' && (
        <div className={styles.errorWrap}>
          <p className={styles.errorText}>Не вдалося згенерувати постер</p>
          <button type="button" className={styles.generateBtn} onClick={generate}>
            Спробувати знову
          </button>
        </div>
      )}
    </div>
  )
}

export default PosterGenerator

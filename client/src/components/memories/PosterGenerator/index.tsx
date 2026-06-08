import React, { useState, useCallback } from 'react'
import { authFetch } from '../../../services/api'
import type { Memory } from '../../../types/memory'
import styles from './PosterGenerator.module.css'

/**
 * PosterGenerator
 * ---------------
 * AI-генератор постера для спогаду.
 * Step 1: backend → Anthropic Haiku → cinematic image prompt.
 * Step 2: Pollinations.ai → рендерить зображення.
 * Показує прев'ю, пропонує встановити як обкладинку або згенерувати ще раз.
 *
 * Props:
 * @prop {Memory}               memory      — спогад (для title/location/date)
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
      const res = await authFetch('/api/ai/poster-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: memory.title,
          notes: memory.notes ?? '',
          date:  new Date(memory.date).toLocaleDateString('uk-UA'),
        }),
      })

      if (!res.ok) throw new Error('prompt failed')
      const { prompt } = await res.json() as { prompt: string }

      const seed = Math.floor(Math.random() * 999999)
      const url  = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=768&seed=${seed}&nologo=true`

      await new Promise<void>((resolve, reject) => {
        const img = new Image()
        img.onload  = () => resolve()
        img.onerror = () => reject(new Error('image load failed'))
        img.src = url
      })

      setPosterUrl(url)
      setGenState('done')
    } catch {
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
            AI створить унікальний кінематографічний постер на основі назви та місця події
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
          <p className={styles.loadingHint}>Зазвичай займає 10–20 секунд</p>
        </div>
      )}

      {genState === 'done' && posterUrl && (
        <div className={styles.resultWrap}>
          <img src={posterUrl} alt="AI poster" className={styles.poster} />
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

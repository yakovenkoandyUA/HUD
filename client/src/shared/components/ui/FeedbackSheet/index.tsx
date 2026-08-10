import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Modal from '@/shared/components/ui/Modal'
import ImageUploadButton from '@/shared/components/ui/ImageUploadButton'
import { useUiStore } from '@/shared/store/uiStore'
import { authFetch } from '@/shared/services/api'
import styles from './FeedbackSheet.module.css'

interface FeedbackEntry {
  id: string
  message: string
  imageUrls: string[]
  status: 'open' | 'resolved'
  adminReply: string | null
  repliedAt: string | null
  createdAt: string
}

const MAX_PHOTOS = 3

/**
 * FeedbackSheet
 * -------------
 * Модалка для відправки фідбеку — текст + опціональний скріншот.
 * Надсилає в Telegram через POST /api/feedback.
 * Показує історію власних фідбеків з відповідями адміна (GET /api/feedback/mine).
 *
 * Props:
 * @prop {boolean}    isOpen
 * @prop {() => void} onClose
 */
interface FeedbackSheetProps {
  isOpen: boolean
  onClose: () => void
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const FeedbackSheet: React.FC<FeedbackSheetProps> = ({ isOpen, onClose }) => {
  const { showToast } = useUiStore()
  const location = useLocation()
  const [message, setMessage] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<FeedbackEntry[] | null>(null)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await authFetch('/api/feedback/mine')
        if (!res.ok) throw new Error()
        const data = await res.json() as FeedbackEntry[]
        if (!cancelled) setHistory(data)
      } catch {
        if (!cancelled) setHistory([])
      }
    }
    load()
    return () => { cancelled = true }
  }, [isOpen])

  const handleClose = () => {
    setMessage('')
    setImageUrls([])
    onClose()
  }

  const setPhotoAt = (index: number, url: string) => {
    setImageUrls(prev => {
      const next = [...prev]
      if (url) next[index] = url
      else next.splice(index, 1)
      return next.filter(Boolean)
    })
  }

  const handleSubmit = async () => {
    if (!message.trim()) return
    setLoading(true)
    try {
      const res = await authFetch('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          message: message.trim(),
          imageUrls: imageUrls.length ? imageUrls : undefined,
          page: location.pathname,
        }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      showToast('Фідбек надіслано, дякую!', 'success')
      setHistory(prev => [{
        id: `local-${Date.now()}`,
        message: message.trim(),
        imageUrls,
        status: 'open',
        adminReply: null,
        repliedAt: null,
        createdAt: new Date().toISOString(),
      }, ...(prev ?? [])])
      handleClose()
    } catch {
      showToast('Не вдалося надіслати, спробуй ще', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Фідбек" draggable>
      <div className={styles.body}>
        <p className={styles.hint}>Помітив баг або є ідея? Напиши — і прикріпи скріншот якщо потрібно.</p>

        <textarea
          className={styles.textarea}
          placeholder="Описуй що сталось або що хотів би бачити..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
        />

        {!!history?.length && (
          <div className={styles.history}>
            {history.map(e => (
              <div key={e.id} className={styles.historyItem}>
                <p className={styles.historyMessage}>{e.message}</p>
                {e.adminReply ? (
                  <p className={styles.historyReply}>Відповідь: {e.adminReply}</p>
                ) : (
                  <span className={styles.historyPending}>Очікує відповіді</span>
                )}
                <span className={styles.historyDate}>{formatDate(e.createdAt)}</span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.uploadLabel}>Скріншоти (до {MAX_PHOTOS}, необов'язково)</div>
        <div className={styles.photoRow}>
          {Array.from({ length: Math.min(imageUrls.length + 1, MAX_PHOTOS) }).map((_, i) => (
            <div key={i} className={styles.photoSlot}>
              <ImageUploadButton
                currentUrl={imageUrls[i]}
                folder="feedback"
                onUpload={url => setPhotoAt(i, url)}
                placeholder="Скріншот"
                variant="square"
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={!message.trim() || loading}
        >
          {loading ? 'Надсилаю...' : 'Надіслати'}
        </button>
      </div>
    </Modal>
  )
}

export default FeedbackSheet

import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Modal from '@/shared/components/ui/Modal'
import ImageUploadButton from '@/shared/components/ui/ImageUploadButton'
import { useUiStore } from '@/shared/store/uiStore'
import { authFetch } from '@/shared/services/api'
import styles from './FeedbackSheet.module.css'

/**
 * FeedbackSheet
 * -------------
 * Модалка для відправки фідбеку — текст + опціональний скріншот.
 * Надсилає в Telegram через POST /api/feedback.
 *
 * Props:
 * @prop {boolean}    isOpen
 * @prop {() => void} onClose
 */
interface FeedbackSheetProps {
  isOpen: boolean
  onClose: () => void
}

const FeedbackSheet: React.FC<FeedbackSheetProps> = ({ isOpen, onClose }) => {
  const { showToast } = useUiStore()
  const location = useLocation()
  const [message, setMessage] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleClose = () => {
    setMessage('')
    setImageUrl('')
    onClose()
  }

  const handleSubmit = async () => {
    if (!message.trim()) return
    setLoading(true)
    try {
      await authFetch('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          message: message.trim(),
          imageUrl: imageUrl || undefined,
          page: location.pathname,
        }),
      })
      showToast('Фідбек надіслано, дякую!', 'success')
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

        <div className={styles.uploadLabel}>Скріншот (необов'язково)</div>
        <ImageUploadButton
          currentUrl={imageUrl}
          folder="feedback"
          onUpload={url => setImageUrl(url)}
          placeholder="Прикріпити скріншот"
          variant="wide"
        />

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

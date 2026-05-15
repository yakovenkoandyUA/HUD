import React from 'react'
import { useUiStore } from '../../../store/uiStore'
import styles from './Toast.module.css'

/**
 * ToastContainer
 * --------------
 * Рендерить активні тости з uiStore у правому нижньому куті.
 * Не приймає пропсів — підключається до стору напряму.
 */
const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useUiStore()

  return (
    <div className={styles.container}>
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type]}`} onClick={() => dismissToast(t.id)}>
          {t.message}
        </div>
      ))}
    </div>
  )
}

export default ToastContainer

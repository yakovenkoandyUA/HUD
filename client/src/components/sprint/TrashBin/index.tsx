import React, { useState, useEffect } from 'react'
import { useSprintStore } from '../../../store/sprintStore'
import type { UnifiedTodo } from '../../../types'
import styles from './TrashBin.module.css'

/**
 * TrashBin
 * --------
 * Collapsed accordion at the bottom of Sprint screen.
 * Shows soft-deleted tasks with restore / purge actions.
 * Tasks are auto-deleted by MongoDB TTL after 24h.
 */
const TrashBin: React.FC = () => {
  const { trashItems, fetchTrash, restoreItem, purgeItem } = useSprintStore()
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (open && !loaded) {
      fetchTrash()
      setLoaded(true)
    }
  }, [open, loaded, fetchTrash])

  if (trashItems.length === 0 && loaded && open) {
    return (
      <div className={styles.wrap}>
        <button type="button" className={styles.header} onClick={() => setOpen(false)}>
          <span className={styles.label}>Кошик</span>
          <svg className={`${styles.arrow} ${styles.arrowOpen}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <p className={styles.empty}>Кошик порожній</p>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.header} onClick={() => setOpen(v => !v)} aria-expanded={open}>
        <span className={styles.label}>
          Кошик
          {trashItems.length > 0 && <span className={styles.count}>{trashItems.length}</span>}
        </span>
        <svg className={`${styles.arrow} ${open ? styles.arrowOpen : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul className={styles.list}>
          {trashItems.map(item => (
            <TrashItem key={item.id} item={item} onRestore={restoreItem} onPurge={purgeItem} />
          ))}
        </ul>
      )}
    </div>
  )
}

interface TrashItemProps {
  item: UnifiedTodo
  onRestore: (id: string) => void
  onPurge: (id: string) => void
}

function formatTimeLeft(deletedAt: string | undefined): string {
  if (!deletedAt) return ''
  const exp = new Date(deletedAt).getTime() + 24 * 60 * 60 * 1000
  const diff = exp - Date.now()
  if (diff <= 0) return 'Видаляється...'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 0) return `${h} год. ${m} хв.`
  return `${m} хв.`
}

const TrashItem: React.FC<TrashItemProps> = ({ item, onRestore, onPurge }) => (
  <li className={styles.item}>
    <div className={styles.itemInfo}>
      <span className={styles.itemTitle}>{item.title}</span>
      <span className={styles.itemTimer}>{formatTimeLeft(item.deletedAt)}</span>
    </div>
    <div className={styles.itemActions}>
      <button type="button" className={styles.restoreBtn} onClick={() => onRestore(item.id)} aria-label="Відновити">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M2 8a6 6 0 1 0 .9-3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 3v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Відновити
      </button>
      <button type="button" className={styles.purgeBtn} onClick={() => onPurge(item.id)} aria-label="Видалити назавжди">
        <svg width="13" height="13" viewBox="0 0 18 20" fill="none">
          <path d="M1 4h16M6 4V2h6v2M3 4l1 14a1 1 0 001 1h8a1 1 0 001-1L15 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  </li>
)

export default TrashBin

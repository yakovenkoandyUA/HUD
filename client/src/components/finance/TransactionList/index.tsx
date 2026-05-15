import React, { useState } from 'react'
import type { Transaction } from '../../../types'
import { fmt } from '../../../utils/finance'
import styles from './TransactionList.module.css'

/**
 * TransactionList
 * ---------------
 * Список останніх транзакцій з можливістю видалення.
 *
 * Props:
 * @prop {Transaction[]}          transactions — масив транзакцій (відображаються перші 20)
 * @prop {(id: string) => void}   [onDelete]   — колбек видалення транзакції
 */
interface TransactionListProps {
  transactions: Transaction[]
  onDelete?: (id: string) => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete }) => {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const list = transactions.slice(0, 20)

  if (list.length === 0) {
    return <p className={styles.empty}>Транзакцій ще немає</p>
  }

  const handleDeleteClick = (id: string) => {
    setPendingDelete(id)
  }

  const handleConfirmDelete = (id: string) => {
    onDelete?.(id)
    setPendingDelete(null)
  }

  const handleCancelDelete = () => {
    setPendingDelete(null)
  }

  return (
    <ul className={styles.list}>
      {list.map((t) => {
        const isPending = pendingDelete === t.id
        return (
          <li key={t.id} className={`${styles.item} ${isPending ? styles.itemPending : ''}`}>
            {isPending ? (
              <div className={styles.confirmRow}>
                <span className={styles.confirmText}>Видалити?</span>
                <div className={styles.confirmActions}>
                  <button
                    type="button"
                    className={styles.confirmBtn}
                    onClick={() => handleConfirmDelete(t.id)}
                  >
                    Так
                  </button>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={handleCancelDelete}
                  >
                    Ні
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.left}>
                  <span className={`${styles.dot} ${t.type === 'topup' ? styles.dotGreen : styles.dotRed}`} />
                  <div>
                    <div className={styles.desc}>{t.description}</div>
                    <div className={styles.date}>{formatDate(t.date)}</div>
                  </div>
                </div>
                <div className={styles.right}>
                  <div className={`${styles.amount} ${t.type === 'topup' ? styles.pos : styles.neg}`}>
                    {t.type === 'topup' ? '+' : '−'}{fmt(t.amount)} ₴
                  </div>
                  {onDelete && (
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => handleDeleteClick(t.id)}
                      aria-label="Видалити"
                    >
                      ×
                    </button>
                  )}
                </div>
              </>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default TransactionList

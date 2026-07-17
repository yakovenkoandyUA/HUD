import React, { useEffect, useState } from 'react'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { useModalHistory } from '@/shared/hooks/useModalHistory'
import { CHANGELOG, APP_VERSION } from '@/shared/data/changelog'
import styles from './ChangelogSheet.module.css'

const LS_KEY = 'mimir-last-seen-version'

/**
 * ChangelogSheet
 * --------------
 * Bottom sheet з журналом змін. Відкривається при натисканні кнопки оновлення.
 * Після встановлення оновлення перезавантажує сторінку.
 *
 * Props:
 * @prop {boolean}    isOpen  — чи відкритий sheet
 * @prop {() => void} onClose — закриття без оновлення
 */
interface ChangelogSheetProps {
  isOpen: boolean
  onClose: () => void
}

const ChangelogSheet: React.FC<ChangelogSheetProps> = ({ isOpen, onClose }) => {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useModalHistory(onClose, isOpen)
  const sheetRef = useSwipeToDismiss(onClose, { enabled: mounted })

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 340)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const handleUpdate = () => {
    localStorage.setItem(LS_KEY, APP_VERSION)
    window.location.reload()
  }

  if (!mounted) return null

  return (
    <div
      className={`${styles.overlay} ${visible ? styles.overlayVisible : ''}`}
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        className={`${styles.sheet} ${visible ? styles.sheetVisible : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.handle} />
        <div className={styles.header}>
          <span className={styles.title}>ЩО НОВОГО</span>
          <span className={styles.version}>v{APP_VERSION}</span>
        </div>

        <div className={styles.entries}>
          {CHANGELOG.map(entry => (
            <div key={entry.version} className={styles.entry}>
              <div className={styles.entryMeta}>
                <span className={styles.entryVersion}>v{entry.version}</span>
                <span className={styles.entryDate}>{entry.date}</span>
              </div>
              <ul className={styles.notesList}>
                {entry.notes.map((note, i) => (
                  <li key={i} className={styles.note}>
                    <span className={styles.noteDot} />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.updateBtn} onClick={handleUpdate}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2A6.5 6.5 0 1 1 7.5 1"/>
              <path d="M10 1.5L7.5 4 10 5.5"/>
            </svg>
            Встановити оновлення
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChangelogSheet

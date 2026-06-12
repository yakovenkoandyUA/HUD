import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotesStore } from '../../../store/notesStore'
import styles from './NotesAccordion.module.css'

/**
 * NotesAccordion
 * --------------
 * Акордеон нотаток на Dashboard. Показує останні 3 нотатки з preview тексту.
 * Тап на заголовок — розгортає/згортає.
 * Тап на нотатку або "→ усі" — navigate до /notes.
 * fetchNotes викликається при mount для відображення лічильника.
 */
const PREVIEW_LIMIT = 3

const NotesAccordion: React.FC = () => {
  const navigate = useNavigate()
  const { notes, fetchNotes } = useNotesStore()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await fetchNotes()
    }
    load()
    return () => { cancelled = true; void cancelled }
  }, [])

  const preview = notes.slice(0, PREVIEW_LIMIT)

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className={styles.headerLabel}>Нотатки</span>
        <span className={styles.headerRight}>
          {notes.length > 0 && (
            <span className={styles.count}>{notes.length}</span>
          )}
          <svg
            className={`${styles.arrow} ${open ? styles.arrowOpen : ''}`}
            width="12" height="12" viewBox="0 0 12 12" fill="none"
          >
            <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      <div className={`${styles.body} ${open ? styles.bodyOpen : ''}`}>
        <div className={styles.inner}>
          {notes.length === 0 ? (
            <p className={styles.empty}>Ще немає нотаток</p>
          ) : (
            <>
              <ul className={styles.list}>
                {preview.map(note => (
                  <li
                    key={note._id}
                    className={styles.item}
                    onClick={() => navigate('/notes')}
                  >
                    <span className={styles.itemText}>{note.text}</span>
                    <span className={styles.itemDate}>{formatRelative(note.updatedAt)}</span>
                  </li>
                ))}
              </ul>
              {notes.length > PREVIEW_LIMIT && (
                <button
                  type="button"
                  className={styles.allBtn}
                  onClick={() => navigate('/notes')}
                >
                  Усі {notes.length} →
                </button>
              )}
              {notes.length <= PREVIEW_LIMIT && (
                <button
                  type="button"
                  className={styles.allBtn}
                  onClick={() => navigate('/notes')}
                >
                  Відкрити →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isToday) return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  if (d.toDateString() === yesterday.toDateString()) return 'вчора'
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`
}

export default NotesAccordion

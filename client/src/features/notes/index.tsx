import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useNotesStore } from '@/features/notes/notesStore'
import DoodleIllustration from '@/shared/components/ui/DoodleIllustration'
import styles from './Notes.module.css'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  if (isToday) return `сьогодні ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  if (isYesterday) return 'вчора'
  return `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getFullYear()}`
}

/**
 * NotesScreen
 * -----------
 * Masonry 2-column grid of quicknotes.
 * Inline editing with confirm button + enterKeyHint="done".
 * FAB button to add a new note.
 */
const NotesScreen: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { notes, loading, fetchNotes, addNote, updateNote, deleteNote } = useNotesStore()

  const [query, setQuery] = useState('')
  const [newText, setNewText] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const newTextareaRef = useRef<HTMLTextAreaElement>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  const editSavingRef = useRef(false)

  useEffect(() => {
    fetchNotes()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if ((location.state as { autoFocus?: boolean } | null)?.autoFocus) {
      setShowNew(true)
    }
  }, [location.state])

  useEffect(() => {
    if (showNew) newTextareaRef.current?.focus()
  }, [showNew])

  useEffect(() => {
    if (editingId) editTextareaRef.current?.focus()
  }, [editingId])

  const handleSaveNew = useCallback(() => {
    const text = newText.trim()
    if (!text) { setShowNew(false); return }
    addNote(text)
    setNewText('')
    setShowNew(false)
  }, [newText, addNote])

  const handleNewKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveNew() }
    if (e.key === 'Escape') { setShowNew(false); setNewText('') }
  }

  const startEdit = (id: string, text: string) => {
    setEditingId(id)
    setEditText(text)
    editSavingRef.current = false
  }

  const commitEdit = useCallback(() => {
    if (!editingId) return
    const text = editText.trim()
    if (text && text !== notes.find(n => n._id === editingId)?.text) {
      updateNote(editingId, text)
    }
    setEditingId(null)
    editSavingRef.current = false
  }, [editingId, editText, notes, updateNote])

  const handleEditBlur = () => {
    // Skip blur-save if OK button click is in progress (mousedown fires before blur)
    if (editSavingRef.current) return
    commitEdit()
  }

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') setEditingId(null)
  }

  const handleOkMouseDown = () => {
    // Set flag before blur fires so handleEditBlur skips double-save
    editSavingRef.current = true
  }

  const filtered = query.trim()
    ? notes.filter(n => n.text.toLowerCase().includes(query.toLowerCase()))
    : notes

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Назад">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span className={styles.headerTitle}>Нотатки</span>
        <div className={styles.headerSpacer} />
      </header>
      <div className={styles.content}>

        {/* Search */}
        {notes.length > 0 && (
          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className={styles.searchInput}
              placeholder="Пошук..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        )}

        {/* New note form */}
        {showNew && (
          <div className={styles.newNoteWrap}>
            <textarea
              ref={newTextareaRef}
              className={styles.newNoteTextarea}
              placeholder="Що хочеш записати?"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={handleNewKeyDown}
              enterKeyHint="done"
            />
            <div className={styles.newNoteActions}>
              <button type="button" className={styles.newNoteCancelBtn} onClick={() => { setShowNew(false); setNewText('') }}>
                Скасувати
              </button>
              <button type="button" className={styles.newNoteSaveBtn} onClick={handleSaveNew} disabled={!newText.trim()}>
                Зберегти
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && !showNew && (
          <div className={styles.empty}>
            <DoodleIllustration variant="notes" size={72} />
            <span className={styles.emptyText}>
              {query ? 'Нічого не знайдено' : 'Ще немає нотаток\nДодай першу через +'}
            </span>
          </div>
        )}

        {/* Masonry grid */}
        {filtered.length > 0 && (
          <div className={styles.grid}>
            {filtered.map(note => (
              <div
                key={note._id}
                className={`${styles.noteCard} ${editingId === note._id ? styles.noteCardEditing : ''}`}
                onClick={() => { if (editingId !== note._id) startEdit(note._id, note.text) }}
              >
                {editingId === note._id ? (
                  <>
                    <textarea
                      ref={editTextareaRef}
                      className={styles.editTextarea}
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onBlur={handleEditBlur}
                      onKeyDown={handleEditKeyDown}
                      onClick={e => e.stopPropagation()}
                      enterKeyHint="done"
                    />
                    <button
                      type="button"
                      className={styles.editOkBtn}
                      onMouseDown={handleOkMouseDown}
                      onClick={e => { e.stopPropagation(); commitEdit() }}
                    >
                      ОК
                    </button>
                  </>
                ) : (
                  <>
                    <p className={styles.noteText}>{note.text}</p>
                    <p className={styles.noteDate}>{formatDate(note.updatedAt)}</p>
                  </>
                )}
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={e => { e.stopPropagation(); deleteNote(note._id) }}
                  aria-label="Видалити"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      {!showNew && (
        <button
          type="button"
          className={styles.fab}
          onClick={() => setShowNew(true)}
          aria-label="Нова нотатка"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}

export default NotesScreen

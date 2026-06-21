import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import AppHeader from '../../components/AppHeader'
import { useNotesStore } from '../../store/notesStore'
import DoodleIllustration from '../../components/ui/DoodleIllustration'
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
 * Список quicknotes. Новий запис через autoFocus (з FAB) або тап на порожній стан.
 * Inline редагування по тапу на картку. Пошук фільтрує локально.
 */
const NotesScreen: React.FC = () => {
  const location = useLocation()
  const { notes, loading, fetchNotes, addNote, updateNote, deleteNote } = useNotesStore()

  const [query, setQuery] = useState('')
  const [newText, setNewText] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const newTextareaRef = useRef<HTMLTextAreaElement>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchNotes()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* autoFocus з FAB */
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
  }

  const handleEditBlur = () => {
    if (!editingId) return
    const text = editText.trim()
    if (text && text !== notes.find(n => n._id === editingId)?.text) {
      updateNote(editingId, text)
    }
    setEditingId(null)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditBlur() }
    if (e.key === 'Escape') setEditingId(null)
  }

  const filtered = query.trim()
    ? notes.filter(n => n.text.toLowerCase().includes(query.toLowerCase()))
    : notes

  return (
    <div className={styles.screen}>
      <AppHeader />
      <div className={styles.content}>

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

        {/* Notes list */}
        {!loading && filtered.length === 0 && !showNew && (
          <div className={styles.empty}>
            <DoodleIllustration variant="notes" size={72} />
            <span className={styles.emptyText}>
              {query ? 'Нічого не знайдено' : 'Ще немає нотаток\nДодай першу через +'}
            </span>
          </div>
        )}

        {filtered.map(note => (
          <div key={note._id} className={styles.noteCard} onClick={() => { if (editingId !== note._id) startEdit(note._id, note.text) }}>
            {editingId === note._id ? (
              <textarea
                ref={editTextareaRef}
                className={styles.editTextarea}
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onBlur={handleEditBlur}
                onKeyDown={handleEditKeyDown}
                onClick={e => e.stopPropagation()}
              />
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
    </div>
  )
}

export default NotesScreen

import React, { useState } from 'react'
import type { Lesson, LessonStatus } from '../../../types'
import Input from '../../ui/Input'
import Button from '../../ui/Button'
import styles from './LessonForm.module.css'

/**
 * LessonForm
 * ----------
 * Форма створення або редагування уроку.
 *
 * Props:
 * @prop {Partial<Lesson>}                     [initial]  — початкові дані (для редагування)
 * @prop {(data: Omit<Lesson, 'id'>) => void}  onSave     — зберегти урок
 * @prop {() => void}                          onCancel   — скасувати
 */
interface LessonFormProps {
  initial?: Partial<Lesson>
  onSave: (data: Omit<Lesson, 'id'>) => void
  onCancel: () => void
}

const LessonForm: React.FC<LessonFormProps> = ({ initial = {}, onSave, onCancel }) => {
  const [title, setTitle] = useState(initial.title ?? '')
  const [description, setDescription] = useState(initial.description ?? '')
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [status, setStatus] = useState<LessonStatus>(initial.status ?? 'planned')
  const [date, setDate] = useState(initial.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({ title, description, notes, status, date })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input label="Назва" value={title} onChange={setTitle} placeholder="Тема уроку" />
      <Input label="Опис" value={description} onChange={setDescription} placeholder="Короткий опис" />
      <Input label="Нотатки" value={notes} onChange={setNotes} placeholder="Домашнє завдання, нотатки..." />
      <Input label="Дата" type="date" value={date} onChange={setDate} />
      <div className={styles.statusRow}>
        {(['planned', 'done', 'draft'] as LessonStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            className={`${styles.statusBtn} ${status === s ? styles.active : ''}`}
            onClick={() => setStatus(s)}
          >
            {s === 'planned' ? 'Заплановано' : s === 'done' ? 'Проведено' : 'Чернетка'}
          </button>
        ))}
      </div>
      <div className={styles.actions}>
        <Button type="button" variant="ghost" onClick={onCancel}>Скасувати</Button>
        <Button type="submit">Зберегти</Button>
      </div>
    </form>
  )
}

export default LessonForm

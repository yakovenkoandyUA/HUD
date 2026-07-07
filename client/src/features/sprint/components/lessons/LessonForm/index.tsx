import React, { useState } from 'react'
import type { Lesson, LessonStatus } from '@/shared/types'
import Input from '@/shared/components/ui/Input'
import Button from '@/shared/components/ui/Button'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import { formatDateUA } from '@/shared/utils/formatDate'
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
  const [title, setTitle]             = useState(initial.title ?? '')
  const [description, setDescription] = useState(initial.description ?? '')
  const [notes, setNotes]             = useState(initial.notes ?? '')
  const [status, setStatus]           = useState<LessonStatus>(initial.status ?? 'planned')
  const [date, setDate]               = useState(initial.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  const [showDatePicker, setShowDatePicker] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({ title, description, notes, status, date })
  }

  return (
    <>
      <form className={styles.form} onSubmit={handleSubmit}>
        <Input label="Назва" value={title} onChange={setTitle} placeholder="Тема уроку" />
        <Input label="Опис" value={description} onChange={setDescription} placeholder="Короткий опис" />
        <Input label="Нотатки" value={notes} onChange={setNotes} placeholder="Домашнє завдання, нотатки..." />

        {/* Date trigger */}
        <div>
          <p className={styles.dateLabel}>Дата</p>
          <button
            type="button"
            className={styles.dateTrigger}
            onClick={() => setShowDatePicker(true)}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={styles.dateIcon}>
              <rect x="1" y="2.5" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M1 6h12" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M4 1v3M10 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {date ? formatDateUA(date) : 'Вибрати дату'}
          </button>
        </div>

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

      {showDatePicker && (
        <CustomDatePicker
          value={date}
          onChange={(val) => { setDate(val); setShowDatePicker(false) }}
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </>
  )
}

export default LessonForm

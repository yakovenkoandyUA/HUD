import React, { useState } from 'react'
import { useSprintStore, LABEL_COLORS } from '../../../store/sprintStore'
import type { SprintLabel } from '../../../types'
import styles from './LabelPicker.module.css'

/**
 * LabelPicker
 * -----------
 * Bottom-sheet оверлей для вибору / створення / редагування міток.
 * Використовується як у формі нової задачі, так і в TaskDetailModal.
 *
 * Props:
 * @prop {SprintLabel[]}                selectedLabels — поточно обрані мітки
 * @prop {(label: SprintLabel) => void} onToggle       — перемикання мітки (додати / зняти)
 * @prop {() => void}                   onClose        — закрити picker
 */
interface LabelPickerProps {
  selectedLabels: SprintLabel[]
  onToggle: (label: SprintLabel) => void
  onClose: () => void
}

type PickerView = 'list' | 'create' | 'edit'

const LabelPicker: React.FC<LabelPickerProps> = ({ selectedLabels, onToggle, onClose }) => {
  const { globalLabels, addGlobalLabel, updateGlobalLabel, deleteGlobalLabel } = useSprintStore()

  const [pickerView, setPickerView] = useState<PickerView>('list')
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [formTitle, setFormTitle]   = useState('')
  const [formColor, setFormColor]   = useState(LABEL_COLORS[0])

  const handleEditStart = (label: SprintLabel) => {
    setEditingId(label.id)
    setFormTitle(label.title)
    setFormColor(label.color)
    setPickerView('edit')
  }

  const handleCreateStart = () => {
    setEditingId(null)
    setFormTitle('')
    setFormColor(LABEL_COLORS[0])
    setPickerView('create')
  }

  const handleSave = () => {
    if (pickerView === 'create') {
      const label: SprintLabel = { id: crypto.randomUUID(), title: formTitle.trim(), color: formColor }
      addGlobalLabel(label)
      onToggle(label)
    } else if (pickerView === 'edit' && editingId) {
      updateGlobalLabel(editingId, { title: formTitle, color: formColor })
    }
    setPickerView('list')
  }

  const handleDelete = () => {
    if (editingId) deleteGlobalLabel(editingId)
    setPickerView('list')
  }

  return (
    <div className={styles.pickerOverlay} onClick={onClose}>
      <div className={styles.pickerSheet} onClick={e => e.stopPropagation()}>

        <div className={styles.pickerHeader}>
          <span className={styles.pickerTitle}>Мітки</span>
          <button type="button" className={styles.pickerClose} onClick={onClose} aria-label="Закрити">✕</button>
        </div>

        {pickerView === 'list' ? (
          <>
            <div className={styles.pickerList}>
              {globalLabels.map(label => {
                const isOn = selectedLabels.some(l => l.id === label.id)
                return (
                  <div key={label.id} className={styles.pickerRow}>
                    <button
                      type="button"
                      className={`${styles.pickerCheck} ${isOn ? styles.pickerCheckOn : ''}`}
                      onClick={() => onToggle(label)}
                      aria-label={isOn ? 'Прибрати' : 'Прикріпити'}
                    >
                      {isOn && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      className={styles.pickerLabelBlock}
                      style={{ background: label.color }}
                      onClick={() => onToggle(label)}
                    >
                      {label.title && <span className={styles.pickerLabelName}>{label.title}</span>}
                    </button>
                    <button
                      type="button"
                      className={styles.pickerEditBtn}
                      onClick={() => handleEditStart(label)}
                      aria-label="Редагувати"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M8.5 1.5l2 2L3.5 10.5H1.5v-2L8.5 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                )
              })}
              {globalLabels.length === 0 && (
                <p className={styles.pickerEmpty}>Мітки відсутні</p>
              )}
            </div>

            <button type="button" className={styles.pickerCreateBtn} onClick={handleCreateStart}>
              + Створити нову мітку
            </button>
            <button type="button" className={styles.pickerDoneBtn} onClick={onClose}>
              Готово
            </button>
          </>
        ) : (
          <div className={styles.labelForm}>
            <button type="button" className={styles.labelFormBack} onClick={() => setPickerView('list')}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Мітки
            </button>

            <div className={styles.labelPreview} style={{ background: formColor }}>
              {formTitle && <span className={styles.labelPreviewText}>{formTitle}</span>}
            </div>

            <p className={styles.labelFieldLabel}>Назва</p>
            <input
              className={styles.labelInput}
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="Назва мітки..."
              autoFocus
            />

            <p className={styles.labelFieldLabel}>Колір</p>
            <div className={styles.colorGrid}>
              {LABEL_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={styles.colorSwatch}
                  style={{ background: c }}
                  onClick={() => setFormColor(c)}
                  aria-label={c}
                  aria-pressed={formColor === c}
                >
                  {formColor === c && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6.5l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>

            <div className={styles.labelFormActions}>
              <button type="button" className={styles.labelSaveBtn} onClick={handleSave}>Зберегти</button>
              {pickerView === 'edit' && (
                <button type="button" className={styles.labelDeleteBtn} onClick={handleDelete}>Видалити</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LabelPicker

import React, { useRef, useState } from 'react'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { useSpaceInfoCardStore } from '../../store/spaceInfoCardStore'
import type { SpaceInfoCard, InfoCardIconType } from '../../store/spaceInfoCardStore'
import styles from './AddInfoCardSheet.module.css'

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  isOpen:    boolean
  spaceId:   string
  color:     string
  onClose:   () => void
  editCard?: SpaceInfoCard
}

// ── Helpers ────────────────────────────────────────────────────────────────

const ICON_OPTIONS: { value: InfoCardIconType; label: string; icon: React.ReactElement }[] = [
  { value: 'text',    label: 'Текст',    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M9 13h6M9 17h6M9 9h1"/></svg> },
  { value: 'link',    label: 'Посилання', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> },
  { value: 'phone',   label: 'Телефон',  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.49 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.4 1.1h3a2 2 0 0 1 2 1.72c.127.96.36 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.16 6.16l1.27-1.27a2 2 0 0 1 2.11-.45c.907.34 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> },
  { value: 'email',   label: 'Email',    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
  { value: 'address', label: 'Адреса',   icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> },
  { value: 'wifi',    label: 'Wi-Fi',    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/></svg> },
  { value: 'code',    label: 'Код',      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9l3 3-3 3M12 15h3"/></svg> },
]

// ── Component ──────────────────────────────────────────────────────────────

/**
 * AddInfoCardSheet
 * ----------------
 * Bottom sheet для додавання або редагування інфо-картки в blank/shared просторі.
 *
 * @prop isOpen   — стан відкриття
 * @prop spaceId  — ID простору
 * @prop color    — колір простору для акцентів
 * @prop onClose  — callback закриття
 * @prop editCard — якщо передано — режим редагування
 */
const AddInfoCardSheet: React.FC<Props> = ({ isOpen, spaceId, color, onClose, editCard }) => {
  const { create, update } = useSpaceInfoCardStore()

  const [iconType, setIconType] = useState<InfoCardIconType>('text')
  const [label, setLabel]       = useState('')
  const [value, setValue]       = useState('')
  const [busy, setBusy]         = useState(false)
  const [mounted, setMounted]   = useState(false)
  const [visible, setVisible]   = useState(false)

  const sheetRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef, sheetRef })

  React.useEffect(() => {
    if (isOpen) {
      setIconType((editCard?.iconType ?? 'text') as InfoCardIconType)
      setLabel(editCard?.label ?? '')
      setValue(editCard?.value ?? '')
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen, editCard])

  const handleSave = async () => {
    if (!label.trim() || !value.trim()) return
    setBusy(true)
    try {
      if (editCard) {
        await update(spaceId, editCard._id, { iconType, label: label.trim(), value: value.trim() })
      } else {
        await create(spaceId, { iconType, label: label.trim(), value: value.trim() })
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  if (!mounted) return null
  const colorVar = { '--space-color': color } as React.CSSProperties

  return (
    <div
      ref={overlayRef}
      className={`${styles.overlay} ${visible ? styles.overlayVisible : ''}`}
      style={colorVar}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div ref={sheetRef} className={`${styles.sheet} ${visible ? styles.sheetVisible : ''}`}>
        <div className={styles.handle} />
        <div className={styles.sheetHeader}>
          <span className={styles.sheetTitle}>{editCard ? 'РЕДАГУВАТИ ІНФО' : 'НОВА ІНФО'}</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div ref={bodyRef} className={styles.sheetBody}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>ТИП</label>
            <div className={styles.iconGrid}>
              {ICON_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.iconBtn} ${iconType === opt.value ? styles.iconBtnOn : ''}`}
                  style={iconType === opt.value ? colorVar : undefined}
                  onClick={() => setIconType(opt.value)}
                >
                  {opt.icon}
                  <span className={styles.iconBtnLabel}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>НАЗВА</label>
            <input
              className={styles.fieldInput}
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder={iconType === 'wifi' ? 'Назва мережі' : iconType === 'phone' ? "Ім'я контакту" : 'Назва…'}
              autoFocus
              maxLength={60}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>ЗНАЧЕННЯ</label>
            <input
              className={styles.fieldInput}
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={
                iconType === 'wifi'    ? 'Пароль'        :
                iconType === 'link'    ? 'https://…'     :
                iconType === 'phone'   ? '+380…'         :
                iconType === 'email'   ? 'email@…'       :
                iconType === 'address' ? 'вул. …'        :
                iconType === 'code'    ? 'ABCD1234'      :
                'Значення…'
              }
              maxLength={200}
            />
          </div>
        </div>

        <div className={styles.sheetFooter}>
          <button
            type="button"
            className={styles.saveBtn}
            style={{ background: color }}
            onClick={handleSave}
            disabled={busy || !label.trim() || !value.trim()}
          >
            {busy ? 'Збереження…' : editCard ? 'Зберегти зміни' : 'Зберегти'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddInfoCardSheet

import React, { useRef, useState } from 'react'
import Modal from '@/shared/components/ui/Modal'
import PillSelector from '@/shared/components/ui/PillSelector'
import ImageUploadButton from '@/shared/components/ui/ImageUploadButton'
import { useDrinksStore } from '../../store/drinksStore'
import { DRINK_TYPE_LABELS, DRINK_STATUS_LABELS, DEFAULT_FLAVOR, type DrinkFormState, type DrinkType, type DrinkStatus } from '../../types'
import type { FlavorProfile } from '../../types'
import styles from './AddDrinkSheet.module.css'

interface Props {
  /** Called on close */
  onClose: () => void
  /** Provide to edit existing drink */
  initialId?: string
  initialValues?: Partial<DrinkFormState>
}

const TYPE_OPTIONS = (Object.entries(DRINK_TYPE_LABELS) as [DrinkType, string][]).map(([value, label]) => ({ value, label }))
const STATUS_OPTIONS = (Object.entries(DRINK_STATUS_LABELS) as [DrinkStatus, string][]).map(([value, label]) => ({ value, label }))

const FLAVOR_LABELS: Record<keyof FlavorProfile, string> = {
  sweet:  'Солодкість',
  smoky:  'Димність',
  fruity: 'Фруктовість',
  spicy:  'Пряність',
  woody:  'Деревина',
  floral: 'Квітковість',
}

const EMPTY: DrinkFormState = {
  name: '', brand: '', type: 'whisky', country: '', distillery: '',
  abv: '', photo: '', status: 'wishlist', price: '', rating: '', notes: '',
  flavor: { ...DEFAULT_FLAVOR },
}

/**
 * AddDrinkSheet — bottom sheet for adding or editing a drink.
 */
const AddDrinkSheet: React.FC<Props> = ({ onClose, initialId, initialValues }) => {
  const { addDrink, updateDrink } = useDrinksStore()
  const [form, setForm] = useState<DrinkFormState>({ ...EMPTY, ...initialValues })
  const [saving, setSaving] = useState(false)

  const isEdit = !!initialId

  function setField<K extends keyof DrinkFormState>(key: K, value: DrinkFormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function setFlavor(key: keyof FlavorProfile, val: number) {
    setForm(prev => ({ ...prev, flavor: { ...prev.flavor, [key]: val } }))
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (isEdit) {
        await updateDrink(initialId, form)
      } else {
        await addDrink(form)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={isEdit ? 'РЕДАГУВАТИ' : 'НОВА ПЛЯШКА'} draggable>
      <div className={styles.body}>

        {/* Photo */}
        <div className={styles.photoRow}>
          {form.photo ? (
            <div className={styles.photoPreview}>
              <img src={form.photo} alt="preview" className={styles.photoImg} />
              <button className={styles.photoRemove} onClick={() => setField('photo', '')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ) : (
            <ImageUploadButton
              folder="drinks"
              currentUrl=""
              onUpload={url => setField('photo', url)}
            />
          )}
        </div>

        {/* Name */}
        <div className={styles.field}>
          <label className={styles.label}>Назва *</label>
          <input
            className={styles.input}
            value={form.name}
            onChange={e => setField('name', e.target.value)}
            placeholder="Lagavulin 16..."
          />
        </div>

        {/* Brand */}
        <div className={styles.field}>
          <label className={styles.label}>Бренд / Виробник</label>
          <input
            className={styles.input}
            value={form.brand}
            onChange={e => setField('brand', e.target.value)}
            placeholder="Diageo..."
          />
        </div>

        {/* Type */}
        <div className={styles.field}>
          <label className={styles.label}>Тип</label>
          <PillSelector
            options={TYPE_OPTIONS}
            value={form.type}
            onChange={v => setField('type', v)}
            columns={3}
          />
        </div>

        {/* Status */}
        <div className={styles.field}>
          <label className={styles.label}>Статус</label>
          <PillSelector
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={v => setField('status', v)}
            columns={3}
          />
        </div>

        {/* Country / Distillery */}
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Країна</label>
            <input
              className={styles.input}
              value={form.country}
              onChange={e => setField('country', e.target.value)}
              placeholder="Шотландія..."
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Дистилерія</label>
            <input
              className={styles.input}
              value={form.distillery}
              onChange={e => setField('distillery', e.target.value)}
              placeholder="Lagavulin..."
            />
          </div>
        </div>

        {/* ABV / Price / Rating */}
        <div className={styles.row3}>
          <div className={styles.field}>
            <label className={styles.label}>ABV %</label>
            <input
              className={styles.input}
              type="number"
              inputMode="decimal"
              value={form.abv}
              onChange={e => setField('abv', e.target.value)}
              placeholder="43"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Ціна ₴</label>
            <input
              className={styles.input}
              type="number"
              inputMode="decimal"
              value={form.price}
              onChange={e => setField('price', e.target.value)}
              placeholder="1200"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Рейтинг</label>
            <input
              className={styles.input}
              type="number"
              inputMode="decimal"
              min="1"
              max="10"
              value={form.rating}
              onChange={e => setField('rating', e.target.value)}
              placeholder="1–10"
            />
          </div>
        </div>

        {/* Flavor sliders */}
        <div className={styles.field}>
          <label className={styles.label}>Флейвор-профіль</label>
          <div className={styles.sliders}>
            {(Object.entries(FLAVOR_LABELS) as [keyof FlavorProfile, string][]).map(([key, name]) => (
              <div key={key} className={styles.sliderRow}>
                <span className={styles.sliderName}>{name}</span>
                <div className={styles.sliderTrack}>
                  {[1, 2, 3, 4, 5].map(v => (
                    <button
                      key={v}
                      className={`${styles.sliderDot} ${(form.flavor[key] ?? 0) >= v ? styles.sliderDotActive : ''}`}
                      onClick={() => setFlavor(key, v === form.flavor[key] ? 0 : v)}
                    />
                  ))}
                </div>
                <span className={styles.sliderVal}>{form.flavor[key]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className={styles.field}>
          <label className={styles.label}>Нотатки</label>
          <textarea
            className={styles.textarea}
            value={form.notes}
            onChange={e => setField('notes', e.target.value)}
            placeholder="Торф'яний, димний, з нотами ванілі..."
            rows={3}
          />
        </div>

        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving || !form.name.trim()}
        >
          {saving ? 'Зберігаю...' : isEdit ? 'ЗБЕРЕГТИ' : 'ДОДАТИ'}
        </button>
      </div>
    </Modal>
  )
}

export default AddDrinkSheet

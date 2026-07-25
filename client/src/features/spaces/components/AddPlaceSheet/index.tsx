import React, { useCallback, useRef, useState } from 'react'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import { useTripPlaceStore } from '../../store/tripPlaceStore'
import type { TripPlaceCategory } from '../../store/tripPlaceStore'
import styles from './AddPlaceSheet.module.css'

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  isOpen:      boolean
  spaceId:     string
  color:       string
  destination?: string
  onClose:     () => void
}

interface PhotonFeature {
  properties: {
    name:     string
    country:  string
    city?:    string
    street?:  string
    housenumber?: string
    type:     string
  }
  geometry: { coordinates: [number, number] }
}

// ── Helpers ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<TripPlaceCategory, string> = {
  museum:    'Музей',
  restaurant:'Ресторан',
  cafe:      'Кафе',
  park:      'Парк',
  shop:      'Магазин',
  viewpoint: 'Оглядовий',
  hotel:     'Готель',
  other:     'Інше',
}

function photonTypeToCategory(type: string): TripPlaceCategory {
  const t = type.toLowerCase()
  if (t === 'museum' || t === 'gallery')    return 'museum'
  if (t === 'restaurant' || t === 'food')   return 'restaurant'
  if (t === 'cafe' || t === 'coffee')       return 'cafe'
  if (t === 'park' || t === 'garden' || t === 'forest') return 'park'
  if (t === 'shop' || t === 'mall')         return 'shop'
  if (t === 'viewpoint' || t === 'peak')    return 'viewpoint'
  if (t === 'hotel' || t === 'hostel' || t === 'accommodation') return 'hotel'
  return 'other'
}

function buildAddress(props: PhotonFeature['properties']): string {
  const parts: string[] = []
  if (props.street) {
    parts.push(props.housenumber ? `${props.street} ${props.housenumber}` : props.street)
  }
  if (props.city)    parts.push(props.city)
  if (props.country) parts.push(props.country)
  return parts.join(', ')
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * AddPlaceSheet
 * -------------
 * Bottom sheet для додавання збереженого місця до trip space.
 * Містить Photon (Komoot OSM) autocomplete для пошуку місць.
 *
 * @prop isOpen      — стан відкриття
 * @prop spaceId     — ID простору
 * @prop color       — колір простору для акцентів
 * @prop destination — поточне місто/напрямок для bias пошуку
 * @prop onClose     — callback закриття
 */
const AddPlaceSheet: React.FC<Props> = ({ isOpen, spaceId, color, destination, onClose }) => {
  const { create } = useTripPlaceStore()

  const [name, setName]           = useState('')
  const [category, setCategory]   = useState<TripPlaceCategory>('other')
  const [address, setAddress]     = useState('')
  const [notes, setNotes]         = useState('')
  const [visitDate, setVisitDate] = useState('')
  const [visitDateOpen, setVisitDateOpen] = useState(false)
  const [busy, setBusy]           = useState(false)
  const [mounted, setMounted]     = useState(false)
  const [visible, setVisible]     = useState(false)

  const [searchQuery, setSearchQuery]     = useState('')
  const [suggestions, setSuggestions]     = useState<PhotonFeature[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const sheetRef    = useRef<HTMLDivElement>(null)
  const overlayRef  = useRef<HTMLDivElement>(null)
  const bodyRef     = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef, sheetRef })

  React.useEffect(() => {
    if (isOpen) {
      setName(''); setCategory('other'); setAddress(''); setNotes(''); setVisitDate('')
      setSearchQuery(''); setSuggestions([]); setShowSuggestions(false)
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) { setSuggestions([]); setShowSuggestions(false); return }
    setSearchLoading(true)
    try {
      const bias = destination ? `&location_bias_scale=0.6&q=${encodeURIComponent(q + ' ' + destination)}` : `&q=${encodeURIComponent(q)}`
      const url = `https://photon.komoot.io/api/?${bias}&limit=5&lang=en`
      const res = await fetch(url)
      if (!res.ok) throw new Error()
      const data = await res.json() as { features: PhotonFeature[] }
      const filtered = (data.features ?? []).filter(f => f.properties.name)
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } catch {
      setSuggestions([])
    } finally {
      setSearchLoading(false)
    }
  }, [destination])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 500)
  }

  const handlePickSuggestion = (f: PhotonFeature) => {
    setName(f.properties.name)
    setAddress(buildAddress(f.properties))
    setCategory(photonTypeToCategory(f.properties.type))
    setSearchQuery('')
    setSuggestions([])
    setShowSuggestions(false)
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      await create(spaceId, {
        name:      name.trim(),
        category,
        address:   address   || undefined,
        notes:     notes     || undefined,
        visitDate: visitDate || undefined,
      })
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
          <span className={styles.sheetTitle}>МІСЦЕ</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div ref={bodyRef} className={styles.sheetBody}>

          {/* ── Photon search ── */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>ПОШУК МІСЦЯ</label>
            <div className={styles.searchWrap}>
              <div className={styles.searchInputWrap}>
                <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  className={styles.searchInput}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder={destination ? `Пошук у ${destination}…` : 'Лувр, Tsukiji Market…'}
                  autoFocus
                />
                {searchLoading && <span className={styles.searchSpinner} />}
              </div>
              {showSuggestions && (
                <ul className={styles.suggestions}>
                  {suggestions.map((f, i) => (
                    <li key={i} className={styles.suggestion} onClick={() => handlePickSuggestion(f)}>
                      <span className={styles.suggestionName}>{f.properties.name}</span>
                      <span className={styles.suggestionAddr}>{buildAddress(f.properties)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.field}>
            <label className={styles.fieldLabel}>НАЗВА</label>
            <input
              className={styles.fieldInput}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Назва місця"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>КАТЕГОРІЯ</label>
            <div className={styles.pills}>
              {(Object.keys(CATEGORY_LABELS) as TripPlaceCategory[]).map(c => (
                <button
                  key={c} type="button"
                  className={`${styles.pill} ${category === c ? styles.pillOn : ''}`}
                  onClick={() => setCategory(c)}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>АДРЕСА</label>
            <input
              className={styles.fieldInput}
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Rue de Rivoli 1, Paris…"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>КОЛИ ВІДВІДАТИ</label>
            <button type="button" className={styles.dateField} onClick={() => setVisitDateOpen(true)}>
              {visitDate ? (() => { const [y,m,d] = visitDate.slice(0,10).split('-'); return `${d}.${m}.${y}` })() : 'Вибрати дату'}
            </button>
            {visitDateOpen && <CustomDatePicker value={visitDate} onChange={v => { setVisitDate(v); setVisitDateOpen(false) }} onClose={() => setVisitDateOpen(false)} />}
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>НОТАТКА</label>
            <textarea
              className={styles.textarea}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Відкрито до 18:00, бронювати заздалегідь…"
              rows={2}
            />
          </div>
        </div>

        <div className={styles.sheetFooter}>
          <button
            type="button"
            className={styles.saveBtn}
            style={{ background: color }}
            onClick={handleSave}
            disabled={busy || !name.trim()}
          >
            {busy ? 'Збереження…' : 'Зберегти місце'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddPlaceSheet

import React, { useState, useEffect, useRef } from 'react'
import Modal from '@/shared/components/ui/Modal'
import PillSelector from '@/shared/components/ui/PillSelector'
import ImageUploadButton from '@/shared/components/ui/ImageUploadButton'
import { useDrinksStore } from '../../store/drinksStore'
import { DRINK_TYPE_LABELS, DRINK_STATUS_LABELS, DEFAULT_FLAVOR, type DrinkFormState, type DrinkType, type DrinkStatus } from '../../types'
import type { FlavorProfile } from '../../types'
import styles from './AddDrinkSheet.module.css'

interface Props {
  onClose: () => void
  initialId?: string
  initialValues?: Partial<DrinkFormState>
  onDelete?: () => void
}

const TYPE_OPTIONS = (Object.entries(DRINK_TYPE_LABELS) as [DrinkType, string][]).map(([value, label]) => ({ value, label }))
const STATUS_OPTIONS = (Object.entries(DRINK_STATUS_LABELS) as [DrinkStatus, string][]).map(([value, label]) => ({ value, label }))

const FLAVOR_LABELS: Record<keyof FlavorProfile, string> = {
  sweet: 'Солодкість', smoky: 'Димність', fruity: 'Фруктовість',
  spicy: 'Пряність',  woody: 'Деревина', floral: 'Квітковість',
}

const EMPTY: DrinkFormState = {
  name: '', brand: '', type: 'whisky', country: '', distillery: '',
  abv: '', photo: '', status: 'wishlist', price: '', notes: '',
  flavor: { ...DEFAULT_FLAVOR },
}

interface OFFProduct {
  product_name?: string
  brands?: string
  alcohol_100g?: number
  image_front_url?: string
  image_url?: string
  countries_tags?: string[]
  categories_tags?: string[]
}

function detectType(tags: string[]): DrinkType {
  const joined = tags.join(' ')
  if (/whisky|whiskey|bourbon|scotch|malt/.test(joined)) return 'whisky'
  if (/wine|wines|rouge|blanc|rosé|riesling|chardonnay|merlot/.test(joined)) return 'wine'
  if (/beer|beers|ale|lager|stout|porter|ipa/.test(joined)) return 'beer'
  if (/\bgin\b/.test(joined)) return 'gin'
  if (/\brum\b/.test(joined)) return 'rum'
  if (/cognac|brandy|armagnac/.test(joined)) return 'cognac'
  if (/vodka/.test(joined)) return 'vodka'
  if (/liqueur|liquor|amaretto|baileys|kahlua/.test(joined)) return 'liqueur'
  return 'other'
}

function normalizeCountry(tags: string[]): string {
  const COUNTRIES: Record<string, string> = {
    'en:scotland': 'Шотландія', 'en:ireland': 'Ірландія', 'en:united-states': 'США',
    'en:france': 'Франція', 'en:italy': 'Італія', 'en:spain': 'Іспанія',
    'en:germany': 'Німеччина', 'en:japan': 'Японія', 'en:ukraine': 'Україна',
    'en:united-kingdom': 'Великобританія', 'en:mexico': 'Мексика',
  }
  for (const tag of tags) {
    const match = COUNTRIES[tag.toLowerCase()]
    if (match) return match
  }
  return ''
}

/**
 * AddDrinkSheet — bottom sheet for adding or editing a drink.
 * Includes Open Food Facts search for auto-fill.
 */
const AddDrinkSheet: React.FC<Props> = ({ onClose, initialId, initialValues, onDelete }) => {
  const { addDrink, updateDrink } = useDrinksStore()
  const [form, setForm] = useState<DrinkFormState>({ ...EMPTY, ...initialValues })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<OFFProduct[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched]   = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isEdit = !!initialId

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 3) { setResults([]); setSearched(false); return }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=6&fields=product_name,brands,alcohol_100g,image_front_url,image_url,countries_tags,categories_tags`
        const res = await fetch(url)
        const data = await res.json() as { products?: OFFProduct[] }
        const filtered = (data.products ?? []).filter(p => p.product_name?.trim())
        setResults(filtered.slice(0, 5))
        setSearched(true)
      } catch {
        setResults([])
        setSearched(true)
      } finally {
        setSearching(false)
      }
    }, 600)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  function applyProduct(p: OFFProduct) {
    setForm(prev => ({
      ...prev,
      name:    p.product_name?.trim() ?? prev.name,
      brand:   p.brands?.split(',')[0].trim() ?? prev.brand,
      abv:     p.alcohol_100g ? String(p.alcohol_100g) : prev.abv,
      photo:   p.image_front_url ?? p.image_url ?? prev.photo,
      country: normalizeCountry(p.countries_tags ?? []) || prev.country,
      type:    detectType(p.categories_tags ?? []),
    }))
    setQuery('')
    setResults([])
    setSearched(false)
  }

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
      if (isEdit) await updateDrink(initialId, form)
      else await addDrink(form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={isEdit ? 'РЕДАГУВАТИ' : 'НОВА ПЛЯШКА'} draggable>
      <div className={styles.body}>

        {/* Search */}
        {!isEdit && (
          <div className={styles.searchWrap}>
            <div className={styles.searchRow}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.searchIcon}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className={styles.searchInput}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Пошук по базі (Lagavulin, Jack Daniel's...)"
              />
              {searching && <span className={styles.searchSpinner} />}
              {query && !searching && (
                <button className={styles.searchClear} onClick={() => { setQuery(''); setResults([]); setSearched(false) }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>

            {results.length > 0 && (
              <div className={styles.dropdown}>
                {results.map((p, i) => (
                  <button key={i} className={styles.dropdownItem} onClick={() => applyProduct(p)}>
                    {(p.image_front_url ?? p.image_url) && (
                      <img src={p.image_front_url ?? p.image_url} alt="" className={styles.dropdownImg} />
                    )}
                    <div className={styles.dropdownInfo}>
                      <span className={styles.dropdownName}>{p.product_name}</span>
                      {p.brands && <span className={styles.dropdownBrand}>{p.brands.split(',')[0].trim()}</span>}
                    </div>
                    {p.alcohol_100g && <span className={styles.dropdownAbv}>{p.alcohol_100g}%</span>}
                  </button>
                ))}
              </div>
            )}

            {searched && results.length === 0 && query.trim().length >= 3 && !searching && (
              <p className={styles.notFound}>Не знайдено — заповни вручну</p>
            )}

            {(results.length > 0 || searched) && <div className={styles.divider} />}
          </div>
        )}

        {/* ── ОСНОВНЕ ──────────────────────────────── */}
        <div className={styles.sectionHeader}>ОСНОВНЕ</div>

        {/* Photo + Name + Brand — compact hero row */}
        <div className={styles.heroRow}>
          <div className={styles.heroPhotoWrap}>
            <ImageUploadButton
              folder="drinks"
              currentUrl={form.photo}
              onUpload={url => setField('photo', url)}
              variant="fill"
              placeholder="Фото"
            />
          </div>
          <div className={styles.heroFields}>
            <div className={styles.field}>
              <label className={styles.label}>Назва *</label>
              <input className={styles.input} value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Lagavulin 16..." />
            </div>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Тип</label>
          <PillSelector options={TYPE_OPTIONS} value={form.type} onChange={v => setField('type', v)} columns={3} />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Статус</label>
          <PillSelector options={STATUS_OPTIONS} value={form.status} onChange={v => setField('status', v)} columns={3} />
        </div>

        {/* ── ПОХОДЖЕННЯ ───────────────────────────── */}
        <div className={styles.sectionHeader}>ПОХОДЖЕННЯ</div>

        <div className={styles.field}>
          <label className={styles.label}>Країна</label>
          <input className={styles.input} value={form.country} onChange={e => setField('country', e.target.value)} placeholder="Шотландія..." />
        </div>

        {/* ── ХАРАКТЕРИСТИКИ ───────────────────────── */}
        <div className={styles.sectionHeader}>ХАРАКТЕРИСТИКИ</div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>ABV %</label>
            <input className={styles.input} type="number" inputMode="decimal" value={form.abv} onChange={e => setField('abv', e.target.value)} placeholder="43" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Ціна ₴</label>
            <input className={styles.input} type="number" inputMode="decimal" value={form.price} onChange={e => setField('price', e.target.value)} placeholder="1200" />
          </div>
        </div>

        {/* ── СМАКОВИЙ ПРОФІЛЬ ─────────────────────── */}
        <div className={styles.sectionHeader}>СМАКОВИЙ ПРОФІЛЬ</div>

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
            </div>
          ))}
        </div>

        {/* ── НОТАТКИ ──────────────────────────────── */}
        <div className={styles.sectionHeader}>НОТАТКИ</div>

        <div className={styles.field}>
          <label className={styles.labelHint}>Аромат · смак · післясмак · асоціації</label>
          <textarea
            className={styles.textarea}
            value={form.notes}
            onChange={e => setField('notes', e.target.value)}
            placeholder="Торф'яний, димний, солодкуватий із нотами ванілі та сухофруктів..."
            rows={4}
          />
        </div>

        <div className={styles.saveWrap}>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? 'Зберігаю...' : isEdit ? 'ЗБЕРЕГТИ' : 'ДОДАТИ'}
          </button>
          {isEdit && onDelete && (
            confirmDelete ? (
              <div className={styles.deleteConfirm}>
                <span className={styles.deleteConfirmLabel}>Видалити напій?</span>
                <button className={styles.deleteConfirmYes} onClick={onDelete}>Так</button>
                <button className={styles.deleteConfirmNo} onClick={() => setConfirmDelete(false)}>Ні</button>
              </div>
            ) : (
              <button className={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>
                Видалити з колекції
              </button>
            )
          )}
        </div>
      </div>
    </Modal>
  )
}

export default AddDrinkSheet

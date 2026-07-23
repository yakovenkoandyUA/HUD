import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSpacesStore } from '@/features/memories/store/spacesStore'
import type { SpaceType } from '@/features/memories/store/spacesStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { SPACE_TYPE_CONFIG } from '@/features/spaces/data/spaceTypes'
import { SPACE_TEMPLATES } from '@/features/profile/spaceTemplates'
import styles from './SpacesStrip.module.css'

/**
 * SpacesStrip
 * -----------
 * Горизонтальний ряд карток просторів на Dashboard.
 * Кнопка "+" відкриває single-step sheet з вибором типу + форма.
 * @prop {boolean} [f1Enabled] — якщо false, аватари рендеряться 85px (більше місця без F1 блоку)
 */
interface SpacesStripProps {
  f1Enabled?: boolean
}

const COLORS = [
  '#9b59b6', '#3498db', '#2ecc71', '#e74c3c',
  '#f39c12', '#1abc9c', '#e91e8c', '#607d8b',
]

const PICKER_TYPES: SpaceType[] = ['trip', 'vehicle', 'home', 'pet', 'sports']

const PlusIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14"/>
  </svg>
)

const SpacesStrip: React.FC<SpacesStripProps> = ({ f1Enabled = true }) => {
  const { spaces, loading: spacesLoading, fetchSpaces, createSpace } = useSpacesStore()
  const { showToast } = useUiStore()
  const navigate  = useNavigate()
  const location  = useLocation()
  const activeSpaceId = location.pathname.startsWith('/spaces/')
    ? location.pathname.split('/')[2]
    : null

  // ── Sheet state ──
  const [open, setOpen]     = useState(false)
  const [name, setName]     = useState('')
  const [type, setType]     = useState<SpaceType>('trip')
  const [color, setColor]   = useState(COLORS[0])
  const [saving, setSaving] = useState(false)

  // Track if name was auto-filled so we can replace on type change
  const nameIsDefault = useRef(false)

  const overlayRef = useRef<HTMLDivElement>(null)
  const sheetRef   = useSwipeToDismiss(() => setOpen(false), { enabled: open, overlayRef })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        await fetchSpaces()
      } catch {
        if (!cancelled) {
          setTimeout(async () => {
            if (!cancelled) await fetchSpaces().catch(() => {})
          }, 1500)
        }
      }
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openSheet = () => {
    const tpl = SPACE_TEMPLATES.find(t => t.type === 'trip')
    setName(tpl?.defaultName ?? '')
    nameIsDefault.current = true
    setType('trip')
    setColor(tpl?.color ?? COLORS[0])
    setOpen(true)
  }

  const pickType = (t: SpaceType) => {
    setType(t)
    const tpl = SPACE_TEMPLATES.find(s => s.type === t)
    const cfg = SPACE_TYPE_CONFIG[t]
    // Auto-fill color always
    const newColor = tpl?.color ?? cfg.color
    setColor(newColor)
    // Auto-fill name only if still default
    if (nameIsDefault.current) {
      setName(tpl?.defaultName ?? '')
    }
  }

  const handleNameChange = (val: string) => {
    nameIsDefault.current = false
    setName(val)
  }

  const handleCreate = () => {
    if (!name.trim()) return
    let cancelled = false
    const submit = async () => {
      setSaving(true)
      try {
        await createSpace({ name: name.trim(), type, color })
        if (!cancelled) { setOpen(false); showToast('Простір створено', 'success') }
      } catch {
        if (!cancelled) showToast('Помилка створення', 'error')
      } finally {
        if (!cancelled) setSaving(false)
      }
    }
    submit()
    return () => { cancelled = true }
  }

  return (
    <section className={styles.root}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>ПРОСТОРИ</h2>
        <button type="button" className={styles.seeAll} onClick={() => navigate('/profile?tab=spaces')}>
          всі
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      <div className={styles.grid}>
        {spaces.length === 0 && !spacesLoading && (
          <button type="button" className={`${styles.card} ${styles.addCard}`} onClick={openSheet}>
            <span className={styles.avatar}>
              <PlusIcon />
            </span>
            <span className={styles.cardName}>Перший простір</span>
          </button>
        )}

        {spaces.map(space => {
          const cfg = SPACE_TYPE_CONFIG[space.type] ?? SPACE_TYPE_CONFIG['blank']
          const profilePhoto =
            space.type === 'pet'     ? (space.petProfile?.photoUrl     || null) :
            space.type === 'vehicle' ? (space.vehicleProfile?.photoUrl || null) :
            null

          return (
            <button
              key={space.id}
              type="button"
              className={`${styles.card} ${space.id === activeSpaceId ? styles.cardActive : ''} ${!f1Enabled ? styles.cardLarge : ''}`}
              style={{ '--space-color': space.color } as React.CSSProperties}
              onClick={() => navigate(`/spaces/${space.id}`)}
            >
              <span className={!f1Enabled ? `${styles.avatar} ${styles.avatarLarge}` : styles.avatar}>
                {profilePhoto
                  ? <img src={profilePhoto} className={styles.profilePhoto} alt="" aria-hidden="true" />
                  : <img src={cfg.iconSrc} className={styles.emblemImg} alt="" aria-hidden="true" />
                }
              </span>
              <span className={styles.cardName}>{space.name}</span>
            </button>
          )
        })}

        {spaces.length > 0 && (
          <button
            type="button"
            className={`${styles.card} ${styles.addCard} ${!f1Enabled ? styles.cardLarge : ''}`}
            onClick={openSheet}
            aria-label="Додати простір"
          >
            <span className={!f1Enabled ? `${styles.avatar} ${styles.avatarLarge}` : styles.avatar}>
              <PlusIcon />
            </span>
            <span className={styles.cardName}>Додати</span>
          </button>
        )}
      </div>

      {/* ── Create space sheet (portal → body to escape overflow/transform) ── */}
      {open && createPortal(
        <div className={styles.overlay} ref={overlayRef} onClick={() => setOpen(false)}>
          <div className={styles.sheet} ref={sheetRef} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h3 className={styles.sheetTitle}>Новий простір</h3>

            {/* Name */}
            <span className={styles.fieldLabel}>НАЗВА</span>
            <input
              className={styles.fieldInput}
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Мій простір"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />

            {/* Type picker */}
            <span className={styles.fieldLabel}>ТИП</span>
            <div className={styles.typeGrid}>
              {PICKER_TYPES.map(t => {
                const cfg = SPACE_TYPE_CONFIG[t]
                const isActive = type === t
                return (
                  <button
                    key={t}
                    type="button"
                    className={`${styles.typeCard} ${isActive ? styles.typeCardActive : ''}`}
                    style={{ '--tc': cfg.color } as React.CSSProperties}
                    onClick={() => pickType(t)}
                  >
                    <div className={styles.typeImgWrap}>
                      <img src={cfg.iconSrc} className={styles.typeImg} alt="" aria-hidden="true" />
                    </div>
                    <span className={styles.typeLabel}>{cfg.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Color */}
            <span className={styles.fieldLabel}>КОЛІР</span>
            <div className={styles.colorRow}>
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.colorSwatch} ${color === c ? styles.colorSwatchActive : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={c}
                />
              ))}
            </div>

            <button
              type="button"
              className={styles.primaryBtn}
              style={{ background: color }}
              onClick={handleCreate}
              disabled={saving || !name.trim()}
            >
              {saving ? 'Створюємо…' : 'Створити простір'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </section>
  )
}

export default SpacesStrip

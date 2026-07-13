import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSpacesStore } from '@/features/memories/store/spacesStore'
import type { SpaceType } from '@/features/memories/store/spacesStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { SPACE_TYPE_CONFIG } from '@/features/spaces/data/spaceTypes'
import { SPACE_TEMPLATES } from '@/features/profile/spaceTemplates'
import PillSelector from '@/shared/components/ui/PillSelector'
import styles from './SpacesStrip.module.css'

/**
 * SpacesStrip
 * -----------
 * Горизонтальний ряд карток просторів на Dashboard.
 * Кнопка "+" відкриває sheet для створення нового простору (template → form).
 */

const COLORS = [
  '#9b59b6', '#3498db', '#2ecc71', '#e74c3c',
  '#f39c12', '#1abc9c', '#e91e8c', '#607d8b',
]

const TYPE_OPTIONS: { value: SpaceType; label: string }[] = [
  { value: 'trip',    label: 'Поїздка'    },
  { value: 'vehicle', label: 'Авто'       },
  { value: 'home',    label: 'Дім'        },
  { value: 'pet',     label: 'Улюбленець' },
  { value: 'sports',  label: 'Спорт'      },
  { value: 'shared',  label: 'Спільний'   },
]

const PlusIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14"/>
  </svg>
)

const SpacesStrip: React.FC = () => {
  const { spaces, loading: spacesLoading, fetchSpaces, createSpace } = useSpacesStore()
  const { showToast } = useUiStore()
  const navigate  = useNavigate()
  const location  = useLocation()
  const activeSpaceId = location.pathname.startsWith('/spaces/')
    ? location.pathname.split('/')[2]
    : null

  // ── Sheet state ──
  const [open, setOpen]     = useState(false)
  const [step, setStep]     = useState<'template' | 'form'>('template')
  const [name, setName]     = useState('')
  const [type, setType]     = useState<SpaceType>('shared')
  const [color, setColor]   = useState(COLORS[0])
  const [saving, setSaving] = useState(false)

  const overlayRef = useRef<HTMLDivElement>(null)
  const sheetRef   = useSwipeToDismiss(() => setOpen(false), { enabled: open, overlayRef })

  useEffect(() => {
    let cancelled = false
    const load = async () => { if (!cancelled) await fetchSpaces() }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openSheet = () => {
    setName(''); setType('shared'); setColor(COLORS[0])
    setStep('template')
    setOpen(true)
  }

  const pickTemplate = (tpl: typeof SPACE_TEMPLATES[number] | null) => {
    if (tpl) { setName(tpl.defaultName); setType(tpl.type); setColor(tpl.color) }
    setStep('form')
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
          <button type="button" className={styles.emptyCard} onClick={openSheet}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
            </svg>
            <span className={styles.emptyCardText}>
              <span className={styles.emptyCardTitle}>Перший простір</span>
              <span className={styles.emptyCardSub}>авто, дім, техніка…</span>
            </span>
          </button>
        )}

        {spaces.map(space => {
          const cfg = SPACE_TYPE_CONFIG[space.type]
          const typeLabel = cfg?.label ?? space.type
          const memberCount = space.members.length
          const meta = memberCount > 1 ? `${memberCount} учасники` : typeLabel

          return (
            <button
              key={space.id}
              type="button"
              className={`${styles.card} ${space.id === activeSpaceId ? styles.cardActive : ''}`}
              style={{ '--space-color': space.color } as React.CSSProperties}
              onClick={() => navigate(`/spaces/${space.id}`)}
            >
              <span className={styles.iconWrap}>
                {cfg && <img src={cfg.iconSrc} width={22} height={22} alt="" aria-hidden="true" />}
              </span>
              <span className={styles.textStack}>
                <span className={styles.name}>{space.name}</span>
                <span className={styles.meta}>
                  <span className={styles.metaDot} aria-hidden="true" />
                  {meta}
                </span>
              </span>
            </button>
          )
        })}

        <button
          type="button"
          className={`${styles.card} ${styles.addCard}`}
          onClick={openSheet}
          aria-label="Додати простір"
        >
          <span className={styles.iconWrap}><PlusIcon /></span>
          <span className={styles.name}>Додати</span>
        </button>
      </div>

      {/* ── Create space sheet (portal → body to escape overflow/transform) ── */}
      {open && createPortal(
        <div className={styles.overlay} ref={overlayRef} onClick={() => setOpen(false)}>
          <div className={styles.sheet} ref={sheetRef} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />

            {step === 'template' ? (
              <>
                <h3 className={styles.sheetTitle}>Новий простір</h3>
                <div className={styles.templateGrid}>
                  {SPACE_TEMPLATES.map(tpl => (
                    <button key={tpl.id} type="button" className={styles.templateBtn} onClick={() => pickTemplate(tpl)}>
                      <span className={styles.templateDot} style={{ background: `${tpl.color}22`, color: tpl.color }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="3" width="18" height="18" rx="3"/>
                        </svg>
                      </span>
                      <span className={styles.templateLabel}>{tpl.label}</span>
                    </button>
                  ))}
                  <button type="button" className={styles.templateBtn} onClick={() => pickTemplate(null)}>
                    <span className={styles.templateDot} style={{ background: 'var(--bg)', color: 'var(--text3)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                    </span>
                    <span className={styles.templateLabel}>Свій</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" className={styles.backBtn} onClick={() => setStep('template')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M15 18l-6-6 6-6"/>
                    </svg>
                    Назад
                  </button>
                  <h3 className={styles.sheetTitle} style={{ margin: 0 }}>Новий простір</h3>
                </div>

                <span className={styles.fieldLabel}>НАЗВА</span>
                <input
                  className={styles.fieldInput}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Мій простір"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />

                <span className={styles.fieldLabel}>ТИП</span>
                <PillSelector
                  options={TYPE_OPTIONS}
                  value={type}
                  onChange={v => setType(v as SpaceType)}
                />

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
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </section>
  )
}

export default SpacesStrip

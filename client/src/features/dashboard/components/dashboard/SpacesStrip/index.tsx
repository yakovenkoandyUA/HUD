import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSpacesStore } from '@/features/memories/store/spacesStore'
import { useProfileStore } from '@/shared/store/profileStore'
import styles from './SpacesStrip.module.css'

/**
 * SpacesStrip
 * -----------
 * Горизонтальна стрічка просторів на Dashboard.
 * Кожна картка — context-card: emoji, повна назва, тип, к-сть учасників, arrow.
 * Тап → /spaces/:id. F1 — virtual card → /f1.
 *
 * Props:
 * @prop {() => void} onF1Click — перехід до F1 екрану
 */
interface SpacesStripProps {
  onF1Click: () => void
}

const TYPE_LABELS: Record<string, string> = {
  personal: 'Особисте',
  shared:   'Спільне',
  trip:     'Поїздка',
  family:   "Сім'я",
  friends:  'Друзі',
  hobby:    'Хобі',
  sports:   'Спорт',
  project:  'Проєкт',
}

const SpacesStrip: React.FC<SpacesStripProps> = ({ onF1Click }) => {
  const { spaces, fetchSpaces } = useSpacesStore()
  const f1Enabled = useProfileStore(s => s.activeProfile?.f1Enabled ?? false)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    const load = async () => { if (!cancelled) await fetchSpaces() }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (spaces.length === 0 && !f1Enabled) return null

  return (
    <section className={styles.root}>
      <h2 className={styles.title}>ПРОСТОРИ</h2>
      <div className={styles.strip}>
        {spaces.map(space => {
          const memberCount = space.members.length
          const typeLabel = TYPE_LABELS[space.type] ?? space.type
          const memberLabel = memberCount === 1 ? '1 учасник' : `${memberCount} учасники`

          return (
            <button
              key={space.id}
              type="button"
              className={styles.card}
              style={{ '--space-color': space.color } as React.CSSProperties}
              onClick={() => navigate(`/spaces/${space.id}`)}
            >
              <div className={styles.cardTop}>
                <span className={styles.emoji}>{space.emoji || '🌐'}</span>
                <span className={styles.name}>{space.name}</span>
              </div>
              <div className={styles.cardMeta}>
                {typeLabel}
                <span className={styles.metaDot}>·</span>
                {memberLabel}
              </div>
              <div className={styles.cardFooter}>
                <span className={styles.openHint}>відкрити</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2.5 6h7M6.5 3l3 3-3 3"/>
                </svg>
              </div>
            </button>
          )
        })}

        {f1Enabled && (
          <button type="button" className={`${styles.card} ${styles.f1Card}`} onClick={onF1Click}>
            <div className={styles.cardTop}>
              <span className={styles.f1Icon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 17l4-8 4 4 3-6 4 10"/><path d="M3 17h18"/>
                </svg>
              </span>
              <span className={styles.name}>Formula 1</span>
            </div>
            <div className={styles.cardMeta}>Сезон 2026</div>
            <div className={styles.cardFooter}>
              <span className={styles.openHint}>відкрити</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2.5 6h7M6.5 3l3 3-3 3"/>
              </svg>
            </div>
          </button>
        )}
      </div>
    </section>
  )
}

export default SpacesStrip

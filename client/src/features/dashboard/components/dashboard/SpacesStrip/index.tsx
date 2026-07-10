import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSpacesStore } from '@/features/memories/store/spacesStore'
import styles from './SpacesStrip.module.css'

/**
 * SpacesStrip
 * -----------
 * Горизонтальна стрічка просторів на Dashboard.
 * Кожна картка — context-card: emoji, повна назва, тип, к-сть учасників, arrow.
 * Тап → /spaces/:id.
 */
const TYPE_LABELS: Record<string, string> = {
  personal: 'Особисте',
  shared:   'Спільне',
  trip:     'Поїздка',
  family:   "Сім'я",
  friends:  'Друзі',
  hobby:    'Хобі',
  sports:   'Спорт',
  project:  'Проєкт',
  vehicle:  'Авто',
}

const SpacesStrip: React.FC = () => {
  const { spaces, fetchSpaces } = useSpacesStore()
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    const load = async () => { if (!cancelled) await fetchSpaces() }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (spaces.length === 0) return null

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
      </div>
    </section>
  )
}

export default SpacesStrip

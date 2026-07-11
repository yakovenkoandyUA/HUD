import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSpacesStore } from '@/features/memories/store/spacesStore'
import styles from './SpacesStrip.module.css'

/**
 * SpacesStrip
 * -----------
 * Горизонтальна стрічка просторів на Dashboard.
 * Компактні картки: emoji + назва + коротке мета.
 * Горизонтальний скрол якщо карток > 3–4.
 * Остання картка — "+" для переходу до списку просторів.
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

const PlusIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14"/>
  </svg>
)

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

  return (
    <section className={styles.root}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>ПРОСТОРИ</h2>
        <button type="button" className={styles.seeAll} onClick={() => navigate('/spaces')}>
          всі
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
      <div className={styles.strip}>
        {spaces.map(space => {
          const typeLabel = TYPE_LABELS[space.type] ?? space.type
          const memberCount = space.members.length
          const meta = memberCount > 1 ? `${memberCount} учасники` : typeLabel

          return (
            <button
              key={space.id}
              type="button"
              className={styles.card}
              style={{ '--space-color': space.color } as React.CSSProperties}
              onClick={() => navigate(`/spaces/${space.id}`)}
            >
              <span className={styles.emoji}>{space.emoji || '🌐'}</span>
              <span className={styles.name}>{space.name}</span>
              <span className={styles.meta}>{meta}</span>
            </button>
          )
        })}

        {/* Add new space */}
        <button
          type="button"
          className={`${styles.card} ${styles.addCard}`}
          onClick={() => navigate('/spaces')}
          aria-label="Додати простір"
        >
          <PlusIcon />
          <span className={styles.name}>Додати</span>
        </button>
      </div>
    </section>
  )
}

export default SpacesStrip

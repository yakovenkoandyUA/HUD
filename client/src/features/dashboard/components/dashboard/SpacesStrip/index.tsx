import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSpacesStore } from '@/features/memories/store/spacesStore'
import styles from './SpacesStrip.module.css'

/**
 * SpacesStrip
 * -----------
 * 4-колонковий грід компактних карток просторів на Dashboard.
 * Іконка — SVG по типу простору (не emoji), назва, кольорова крапка + мета.
 * Остання картка — "+" для переходу до списку.
 */

/* ── Type icons ── */

const CarIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 11L7.5 5h9L19 11"/>
    <rect x="2" y="11" width="20" height="6" rx="1"/>
    <circle cx="7" cy="17" r="1.8"/>
    <circle cx="17" cy="17" r="1.8"/>
  </svg>
)

const HomeIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)


const PlaneIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 4 17 4 16 5 14.5 6.5L11 10 2.8 8.2c-.5-.1-.9.4-.6.8L6 13l-2 3h3l3-2 3.8 3.8c.4.3.9-.1.8-.6z"/>
  </svg>
)

const PeopleIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const StarIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)

const ActivityIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)

const BriefcaseIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    <line x1="12" y1="12" x2="12" y2="16"/>
    <line x1="10" y1="14" x2="14" y2="14"/>
  </svg>
)

const PersonIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const PlusIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14"/>
  </svg>
)

const TYPE_ICONS: Record<string, React.FC> = {
  vehicle:  CarIcon,
  personal: PersonIcon,
  shared:   HomeIcon,
  trip:     PlaneIcon,
  family:   PeopleIcon,
  friends:  PeopleIcon,
  hobby:    StarIcon,
  sports:   ActivityIcon,
  project:  BriefcaseIcon,
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

      <div className={styles.grid}>
        {spaces.map(space => {
          const Icon = TYPE_ICONS[space.type] ?? PersonIcon
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
              <span className={styles.iconWrap}>
                <Icon />
              </span>
              <span className={styles.name}>{space.name}</span>
              <span className={styles.meta}>
                <span className={styles.metaDot} aria-hidden="true" />
                {meta}
              </span>
            </button>
          )
        })}

        <button
          type="button"
          className={`${styles.card} ${styles.addCard}`}
          onClick={() => navigate('/spaces')}
          aria-label="Додати простір"
        >
          <span className={styles.iconWrap}>
            <PlusIcon />
          </span>
          <span className={styles.name}>Додати</span>
        </button>
      </div>
    </section>
  )
}

export default SpacesStrip

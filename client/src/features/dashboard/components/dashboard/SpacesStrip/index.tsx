import React, { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSpacesStore } from '@/features/memories/store/spacesStore'
import { SPACE_TYPE_CONFIG } from '@/features/spaces/data/spaceTypes'
import styles from './SpacesStrip.module.css'

/**
 * SpacesStrip
 * -----------
 * 4-колонковий грід компактних карток просторів на Dashboard.
 * Іконка — SVG по типу простору (не emoji), назва, кольорова крапка + мета.
 * Остання картка — "+" для переходу до списку.
 */

const PlusIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14"/>
  </svg>
)

const SpacesStrip: React.FC = () => {
  const { spaces, fetchSpaces } = useSpacesStore()
  const navigate = useNavigate()
  const location = useLocation()
  const activeSpaceId = location.pathname.startsWith('/spaces/')
    ? location.pathname.split('/')[2]
    : null

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
        <button type="button" className={styles.seeAll} onClick={() => navigate('/profile?tab=spaces')}>
          всі
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      <div className={styles.grid}>
        {spaces.length === 0 && (
          <button
            type="button"
            className={styles.emptyCard}
            onClick={() => navigate('/profile?tab=spaces')}
          >
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
          onClick={() => navigate('/profile?tab=spaces')}
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

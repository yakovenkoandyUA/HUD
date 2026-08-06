import React, { useState } from 'react'
import type { DriverStanding } from '../../../hooks/useChampionshipStandings'
import { useDriverStats, NATIONALITY_UA, type DriverStats } from '../../../hooks/useDriverStats'
import { DRIVER_TEAM_COLOR, getDriverHeadshot } from '../../../utils/f1'
import styles from './DriverHero.module.css'

/**
 * DriverHero
 * -----------
 * Персональна hero-картка вибраного пілота над списком у табі "Пілоти".
 * Показує того пілота, що вибраний у списку (за замовчуванням — перший
 * у поточному рейтингу). Портрет — реальний headshot (OpenF1, через
 * backend proxy standings), не запечений асет; фолбек — силует.
 *
 * Props:
 * @prop {DriverStanding}             driver      — вибраний пілот (з поточного рейтингу)
 * @prop {DriverStats | undefined}    cachedStats — кеш сезонної статистики (спільний зі списком)
 * @prop {(id, stats) => void}        onStats     — колбек для збереження в кеш
 */

interface Props {
  driver:      DriverStanding
  cachedStats: DriverStats | undefined
  onStats:     (id: string, stats: DriverStats) => void
}

function RankIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3v18" /><path d="M5 4h14l-3 4 3 4H5" />
    </svg>
  )
}
function StarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2.5 15 9 22 9.7 16.8 14.6 18.2 21.5 12 18 5.8 21.5 7.2 14.6 2 9.7 9 9" />
    </svg>
  )
}
function TrophyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M7 5H4a3 3 0 0 0 3 3" /><path d="M17 5h3a3 3 0 0 1-3 3" />
    </svg>
  )
}
function PodiumIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21v-6h5v6" /><path d="M9 21V9h6v12" /><path d="M15 21v-4h5v4" />
    </svg>
  )
}

/** Generic driver-bust silhouette — used only when no headshot could be loaded */
function SilhouetteIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  )
}

const DriverHero: React.FC<Props> = ({ driver, cachedStats, onStats }) => {
  const driverId   = driver.driverId ?? ''
  const { stats }  = useDriverStats(driverId, cachedStats, onStats)
  const teamColor  = DRIVER_TEAM_COLOR[driverId] ?? 'var(--accent)'
  const nat        = stats ? NATIONALITY_UA[stats.nationality] : undefined

  const firstName = stats?.givenName ?? ''
  const lastName  = (stats?.familyName || driver.full_name).toUpperCase()

  const photoUrl = getDriverHeadshot(driverId) ?? driver.headshot_url
  type PhotoStage = 'direct' | 'proxy' | 'hidden'
  const [photoStage, setPhotoStage] = useState<PhotoStage>(photoUrl ? 'direct' : 'hidden')
  const photoSrc = photoStage === 'proxy'
    ? `https://images.weserv.nl/?url=${encodeURIComponent(photoUrl ?? '')}`
    : photoUrl

  return (
    <div className={styles.hero} style={{ '--team-color': teamColor } as React.CSSProperties}>
      <span className={`${styles.corner} ${styles.tl}`} />
      <span className={`${styles.corner} ${styles.br}`} />

      <svg className={styles.lines} viewBox="0 0 400 220" preserveAspectRatio="none">
        <line x1="230" y1="0"   x2="330" y2="220" stroke="var(--team-color)" strokeWidth="1" opacity="0.5" />
        <line x1="270" y1="0"   x2="370" y2="220" stroke="var(--team-color)" strokeWidth="1" opacity="0.3" />
        <line x1="310" y1="0"   x2="410" y2="220" stroke="var(--team-color)" strokeWidth="1" opacity="0.18" />
      </svg>

      <div className={styles.portraitLayer} aria-hidden="true">
        {photoStage !== 'hidden' && photoSrc ? (
          <img
            className={styles.portrait}
            src={photoSrc}
            alt=""
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onError={() => setPhotoStage(s => (s === 'direct' ? 'proxy' : 'hidden'))}
          />
        ) : (
          <span className={styles.silhouette}><SilhouetteIcon /></span>
        )}
        <div className={styles.portraitMask} />
      </div>

      <div className={styles.top}>
        <span className={styles.brand}>MIMIR</span>
        <div className={styles.dots}>
          {Array.from({ length: 9 }).map((_, i) => <span key={i} className={styles.dot} />)}
        </div>
      </div>

      <div className={styles.identityRow}>
        <div className={styles.numberCol}>
          <span className={styles.posNumber}>{stats?.number || driver.driver_number}</span>
          {nat && (
            <span className={styles.flagBox}>
              <span className={styles.flag}>{nat.flag}</span>
              <span className={styles.natCode}>{nat.code}</span>
            </span>
          )}
        </div>

        <div className={styles.nameBlock}>
          {firstName && <span className={styles.firstName}>{firstName}</span>}
          <span className={styles.lastName}>{lastName}</span>
          <span className={styles.team}>{driver.team_name}</span>
        </div>
      </div>

      <div className={styles.statsStrip}>
        <div className={styles.stat}>
          <span className={styles.statTop}><RankIcon />{driver.position}</span>
          <span className={styles.statLabel}>Позиція</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statTop}><StarIcon />{driver.points}</span>
          <span className={styles.statLabel}>Очки</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statTop}><TrophyIcon />{stats?.wins ?? '—'}</span>
          <span className={styles.statLabel}>Перемоги</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statTop}><PodiumIcon />{stats?.podiums ?? '—'}</span>
          <span className={styles.statLabel}>Подіуми</span>
        </div>
      </div>
    </div>
  )
}

export default DriverHero

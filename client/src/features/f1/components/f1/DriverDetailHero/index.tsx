import React, { useState } from 'react'
import type { DriverStanding } from '../../../hooks/useChampionshipStandings'
import { NATIONALITY_UA, type DriverStats } from '../../../hooks/useDriverStats'
import { DRIVER_TEAM_COLOR, getDriverPortraitSources } from '../../../utils/f1'
import styles from './DriverDetailHero.module.css'

interface DriverDetailHeroProps {
  driver: DriverStanding
  stats: DriverStats | null
}

/** Introduces the driver and their current championship standing. */
const DriverDetailHero: React.FC<DriverDetailHeroProps> = ({ driver, stats }) => {
  const driverId  = driver.driverId ?? ''
  const teamColor = DRIVER_TEAM_COLOR[driverId] ?? 'var(--accent)'
  const nat       = stats ? NATIONALITY_UA[stats.nationality] : undefined
  const [photoIndex, setPhotoIndex] = useState(0)
  const photoSrc = getDriverPortraitSources(driver.headshot_url)[photoIndex]

  return (
    <div className={styles.hero} style={{ '--team-color': teamColor } as React.CSSProperties}>
      <span className={`${styles.corner} ${styles.tl}`} />
      <span className={`${styles.corner} ${styles.br}`} />

      <div className={styles.photoLayer}>
        {photoSrc && (
          <img
            className={styles.photo}
            src={photoSrc}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setPhotoIndex(index => index + 1)}
          />
        )}
        <svg className={styles.speedLines} viewBox="0 0 300 220" preserveAspectRatio="none">
          <line x1="230" y1="-10" x2="330" y2="230" stroke="var(--team-color)" strokeWidth="2" opacity="0.55" />
          <line x1="260" y1="-10" x2="360" y2="230" stroke="var(--team-color)" strokeWidth="2" opacity="0.3" />
          <line x1="290" y1="-10" x2="390" y2="230" stroke="var(--team-color)" strokeWidth="2" opacity="0.18" />
        </svg>
        <div className={styles.photoGradient} />
        <div className={styles.dotsTexture} />
      </div>

      <div className={styles.top}>
        <div className={styles.dots}>
          {Array.from({ length: 9 }).map((_, i) => <span key={i} className={styles.dot} />)}
        </div>
      </div>

      <div className={styles.body}>
        <span className={styles.posNumber}>{stats?.number || driver.driver_number}</span>

        {nat && (
          <div className={styles.natRow}>
            <span className={styles.flag}>{nat.flag}</span>
            <span className={styles.natCode}>{nat.code}</span>
          </div>
        )}

        <div className={styles.nameBlock}>
          <h1 className={styles.nameHeading}>
            {stats?.givenName && <span className={styles.firstName}>{stats.givenName}</span>}
            <span className={styles.lastName}>{stats?.familyName || driver.full_name}</span>
          </h1>
          <span className={styles.team}>{driver.team_name}</span>
        </div>
      </div>

      <p className={styles.standing}>
        <span className={styles.standingPosition}>P{driver.position}</span>
        <span>{driver.points} очок</span>
      </p>
    </div>
  )
}

export default DriverDetailHero

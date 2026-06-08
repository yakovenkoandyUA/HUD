import React, { useState } from 'react'
import { useLastRace, type LastRaceData, type PodiumEntry } from './useLastRace'
import { getDriverHeadshot } from '../../../utils/f1'
import styles from './LastRaceCard.module.css'

/**
 * LastRaceCard
 * ------------
 * Картка результатів останньої завершеної гонки Ф1.
 * Показує подіум (P2 | P1 | P3) зі ступеньками та фото пілотів,
 * швидке коло і кількість кіл.
 * Дані з Jolpica (Ergast), кеш sessionStorage на день.
 */

// ── Re-export types for consumers that import from this path ──────────────────
export type { LastRaceData, PodiumEntry }
export { useLastRace }

// ── Constants ─────────────────────────────────────────────────────────────────

const COUNTRY_FLAG: Record<string, string> = {
  'Australia': '🇦🇺', 'China': '🇨🇳', 'Japan': '🇯🇵',
  'USA': '🇺🇸', 'United States': '🇺🇸',
  'Canada': '🇨🇦', 'Monaco': '🇲🇨', 'Spain': '🇪🇸',
  'Austria': '🇦🇹', 'UK': '🇬🇧', 'United Kingdom': '🇬🇧',
  'Belgium': '🇧🇪', 'Hungary': '🇭🇺', 'Netherlands': '🇳🇱',
  'Italy': '🇮🇹', 'Azerbaijan': '🇦🇿', 'Singapore': '🇸🇬',
  'Mexico': '🇲🇽', 'Brazil': '🇧🇷', 'UAE': '🇦🇪',
  'Abu Dhabi': '🇦🇪', 'Bahrain': '🇧🇭', 'Saudi Arabia': '🇸🇦',
  'Qatar': '🇶🇦', 'Germany': '🇩🇪', 'France': '🇫🇷',
  'Portugal': '🇵🇹',
}

// ── Sub-components ────────────────────────────────────────────────────────────

type ImgStage = 'direct' | 'proxy' | 'initials'

const DriverAvatar: React.FC<{
  code:     string
  driverId: string
  size?:    number
  gold?:    boolean
}> = ({ code, driverId, size = 52, gold = false }) => {
  const url = getDriverHeadshot(driverId)
  const [stage, setStage] = useState<ImgStage>(url ? 'direct' : 'initials')
  const avatarStyle = { width: size, height: size }

  if (stage === 'initials' || !url) {
    return (
      <div className={`${styles.avatar} ${gold ? styles.avatarGold : ''}`} style={avatarStyle}>
        <span className={styles.avatarInitials}>{code}</span>
      </div>
    )
  }

  const src = stage === 'proxy'
    ? `https://images.weserv.nl/?url=${encodeURIComponent(url)}`
    : url

  return (
    <div className={`${styles.avatar} ${gold ? styles.avatarGold : ''}`} style={avatarStyle}>
      <img
        src={src}
        alt={code}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        onError={() => { if (stage === 'direct') setStage('proxy'); else setStage('initials') }}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })
}

function Skeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.skBar} style={{ width: 20, height: 20, borderRadius: '4px' }} />
          <div className={styles.skBar} style={{ width: 140, height: 18 }} />
        </div>
      </div>
      <div className={styles.podium}>
        {[52, 64, 52].map((size, i) => (
          <div key={i} className={styles.podiumEntry}>
            <div className={`${styles.skCircle} ${styles.skBar}`} style={{ width: size, height: size, borderRadius: '50%' }} />
            <div className={styles.skBar} style={{ width: 36, marginTop: 6 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const LastRaceCard: React.FC = () => {
  const { data, isLoading, error } = useLastRace()

  if (isLoading) return <Skeleton />
  if (error || !data) return null

  const [p1, p2, p3] = data.podium
  const flag = COUNTRY_FLAG[data.country] ?? ''

  return (
    <div className={styles.card}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.flag}>{flag}</span>
          <h2 className={styles.raceName}>{data.raceName}</h2>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.round}>Раунд {data.round}</span>
          <span className={styles.date}>{formatDate(data.date)}</span>
        </div>
      </div>

      {/* ── Podium: P2 | P1 | P3 ── */}
      <div className={styles.podium}>

        {/* P2 */}
        <div className={`${styles.podiumEntry} ${styles.p2}`}>
          <DriverAvatar code={p2.code} driverId={p2.driverId} size={52} />
          <span className={styles.code}>{p2.code}</span>
          <span className={styles.team}>{p2.team}</span>
          <span className={styles.gap}>{p2.gap}</span>
          <div className={`${styles.step} ${styles.step2}`}>
            <span className={styles.pos}>2</span>
          </div>
        </div>

        {/* P1 */}
        <div className={`${styles.podiumEntry} ${styles.p1}`}>
          <DriverAvatar code={p1.code} driverId={p1.driverId} size={64} gold />
          <span className={styles.code}>{p1.code}</span>
          <span className={styles.team}>{p1.team}</span>
          <span className={styles.gap}>{p1.gap}</span>
          <div className={`${styles.step} ${styles.step1}`}>
            <span className={styles.pos}>1</span>
          </div>
        </div>

        {/* P3 */}
        <div className={`${styles.podiumEntry} ${styles.p3}`}>
          <DriverAvatar code={p3.code} driverId={p3.driverId} size={52} />
          <span className={styles.code}>{p3.code}</span>
          <span className={styles.team}>{p3.team}</span>
          <span className={styles.gap}>{p3.gap}</span>
          <div className={`${styles.step} ${styles.step3}`}>
            <span className={styles.pos}>3</span>
          </div>
        </div>

      </div>

      {/* ── Fastest ── */}
      <div className={styles.fastest}>
        <span className={styles.fastestDot} />
        <span className={styles.fastestLabel}>FASTEST</span>
        {data.fastestLap && (
          <span className={styles.fastestValue}>
            {data.fastestLap.code} {data.fastestLap.time}
          </span>
        )}
        <span className={styles.laps}>{data.laps} кл</span>
      </div>

    </div>
  )
}

export default LastRaceCard

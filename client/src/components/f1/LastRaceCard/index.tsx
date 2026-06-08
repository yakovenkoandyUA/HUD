import React, { useState } from 'react'
import { useChampionshipStandings } from '../../../hooks/useChampionshipStandings'
import { useLastRace, type LastRaceData, type PodiumEntry } from './useLastRace'
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
  code: string
  headshotUrl?: string
  size?: number
  gold?: boolean
}> = ({ code, headshotUrl, size = 52, gold = false }) => {
  const [stage, setStage] = useState<ImgStage>(headshotUrl ? 'direct' : 'initials')
  const avatarStyle = { width: size, height: size }

  if (stage === 'initials' || !headshotUrl) {
    return (
      <div className={`${styles.avatar} ${gold ? styles.avatarGold : ''}`} style={avatarStyle}>
        <span className={styles.avatarInitials}>{code}</span>
      </div>
    )
  }

  const src = stage === 'proxy'
    ? `https://images.weserv.nl/?url=${encodeURIComponent(headshotUrl)}`
    : headshotUrl

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
        <div>
          <div className={styles.skBar} style={{ width: 100, height: 9 }} />
          <div className={styles.skBar} style={{ width: 150, height: 16, marginTop: 6 }} />
        </div>
      </div>
      <div className={styles.podium}>
        {[52, 64, 52].map((size, i) => (
          <div key={i} className={styles.col}>
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
  const { drivers } = useChampionshipStandings()

  // broadcast_name in standings == 3-letter code from Jolpica results
  const headshotMap: Record<string, string | undefined> = {}
  for (const d of drivers) {
    headshotMap[d.broadcast_name] = d.headshot_url
  }

  if (isLoading) return <Skeleton />
  if (error || !data) return null

  const [p1, p2, p3] = data.podium
  const flag = COUNTRY_FLAG[data.country] ?? ''

  return (
    <div className={styles.card}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <span className={styles.label}>РАУНД {data.round} · РЕЗУЛЬТАТ</span>
          <h2 className={styles.raceName}>{flag} {data.raceName}</h2>
        </div>
        <span className={styles.date}>{formatDate(data.date)}</span>
      </div>

      {/* ── Podium: P2 | P1 | P3 ── */}
      <div className={styles.podium}>

        {/* P2 */}
        <div className={`${styles.col} ${styles.p2}`}>
          <DriverAvatar code={p2.code} headshotUrl={headshotMap[p2.code]} size={52} />
          <span className={styles.code}>{p2.code}</span>
          <span className={styles.team}>{p2.team}</span>
          <span className={styles.gap}>{p2.gap}</span>
          <div className={`${styles.step} ${styles.step2}`}>
            <span className={styles.stepNum}>2</span>
          </div>
        </div>

        {/* P1 */}
        <div className={`${styles.col} ${styles.p1}`}>
          <DriverAvatar code={p1.code} headshotUrl={headshotMap[p1.code]} size={64} gold />
          <span className={styles.code}>{p1.code}</span>
          <span className={styles.team}>{p1.team}</span>
          <span className={`${styles.gap} ${styles.winner}`}>WINNER</span>
          <div className={`${styles.step} ${styles.step1}`}>
            <span className={styles.stepNum}>1</span>
          </div>
        </div>

        {/* P3 */}
        <div className={`${styles.col} ${styles.p3}`}>
          <DriverAvatar code={p3.code} headshotUrl={headshotMap[p3.code]} size={52} />
          <span className={styles.code}>{p3.code}</span>
          <span className={styles.team}>{p3.team}</span>
          <span className={styles.gap}>{p3.gap}</span>
          <div className={`${styles.step} ${styles.step3}`}>
            <span className={styles.stepNum}>3</span>
          </div>
        </div>

      </div>

      {/* ── Footer ── */}
      <div className={styles.footer}>
        {data.fastestLap && (
          <div className={styles.fastestLap}>
            <div className={styles.flDot} />
            <span>FASTEST: {data.fastestLap.code} {data.fastestLap.time}</span>
          </div>
        )}
        <span className={styles.laps}>{data.laps} кіл</span>
      </div>

    </div>
  )
}

export default LastRaceCard

import React, { useState } from 'react'
import type { DriverStanding } from '../../../hooks/useChampionshipStandings'
import { NATIONALITY_UA, type DriverStats } from '../../../hooks/useDriverStats'
import { DRIVER_TEAM_COLOR, getDriverHeadshot } from '../../../utils/f1'
import styles from './DriverDetailHero.module.css'

/**
 * DriverDetailHero
 * -----------------
 * Hero-картка сторінки пілота: портрет на весь кард (OpenF1 headshot з фолбеком)
 * під градієнтом, бренд-мітка, велика позиція, прапор, ім'я/команда та
 * стрічка ключових показників. Портрет і решта даних генеруються з чисел/API —
 * жодне значення не запечене в асет.
 *
 * Props:
 * @prop {DriverStanding}          driver  — рядок зі standings (позиція, очки, ім'я, команда)
 * @prop {DriverStats | null}      stats   — сезонна статистика (перемоги/подіуми/поули/…)
 * @prop {boolean}                 loading — стан завантаження stats
 */

interface Props {
  driver:  DriverStanding
  stats:   DriverStats | null
  loading: boolean
}

function PrimaryTile({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className={styles.cell}>
      <div className={styles.cellTop}>
        <span className={styles.cellIcon}>{icon}</span>
        <span className={styles.cellValue}>{value}</span>
      </div>
      <span className={styles.cellLabel}>{label}</span>
    </div>
  )
}

function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className={styles.miniStat}>
      <span className={styles.miniIcon}>{icon}</span>
      <span className={styles.miniLabel}>{label}</span>
      <span className={styles.miniValue}>{value}</span>
    </div>
  )
}

function RankIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M7 5H4a3 3 0 0 0 3 3" /><path d="M17 5h3a3 3 0 0 1-3 3" /></svg>
}
function StarIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2.5 15 9 22 9.7 16.8 14.6 18.2 21.5 12 18 5.8 21.5 7.2 14.6 2 9.7 9 9" /></svg>
}
function TrophyIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M7 5H4a3 3 0 0 0 3 3" /><path d="M17 5h3a3 3 0 0 1-3 3" /></svg>
}
function PodiumIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21v-6h5v6" /><path d="M9 21V9h6v12" /><path d="M15 21v-4h5v4" /></svg>
}
function FlagIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v18" /><path d="M5 4c2-1 4-1 6 0s4 1 6 0v8c-2 1-4 1-6 0s-4-1-6 0V4z" /></svg>
}
function BoltIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>
}
function DnfIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></svg>
}

const DriverDetailHero: React.FC<Props> = ({ driver, stats, loading }) => {
  const driverId  = driver.driverId ?? ''
  const teamColor = DRIVER_TEAM_COLOR[driverId] ?? 'var(--accent)'
  const nat       = stats ? NATIONALITY_UA[stats.nationality] : undefined
  const photoUrl  = getDriverHeadshot(driverId) ?? driver.headshot_url

  type PhotoStage = 'direct' | 'proxy' | 'hidden'
  const [photoStage, setPhotoStage] = useState<PhotoStage>(photoUrl ? 'direct' : 'hidden')
  const photoSrc = photoStage === 'proxy'
    ? `https://images.weserv.nl/?url=${encodeURIComponent(photoUrl ?? '')}`
    : photoUrl

  return (
    <div className={styles.hero} style={{ '--team-color': teamColor } as React.CSSProperties}>
      <span className={`${styles.corner} ${styles.tl}`} />
      <span className={`${styles.corner} ${styles.br}`} />

      <div className={styles.photoLayer}>
        {photoStage !== 'hidden' && photoSrc && (
          <img
            className={styles.photo}
            src={photoSrc}
            alt={driver.full_name}
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onError={() => setPhotoStage(s => (s === 'direct' ? 'proxy' : 'hidden'))}
          />
        )}
        <svg className={styles.speedLines} viewBox="0 0 300 220" preserveAspectRatio="none">
          <line x1="230" y1="-10" x2="330" y2="230" stroke="var(--team-color)" strokeWidth="2" opacity="0.55" />
          <line x1="260" y1="-10" x2="360" y2="230" stroke="var(--team-color)" strokeWidth="2" opacity="0.3" />
          <line x1="290" y1="-10" x2="390" y2="230" stroke="var(--team-color)" strokeWidth="2" opacity="0.18" />
        </svg>
        <div className={styles.photoGradient} />
      </div>

      <div className={styles.top}>
        <span className={styles.brand}>MIMIR</span>
        <div className={styles.dots}>
          {Array.from({ length: 9 }).map((_, i) => <span key={i} className={styles.dot} />)}
        </div>
      </div>

      <div className={styles.body}>
        <span className={styles.posNumber}>{driver.position}</span>

        {nat && (
          <div className={styles.natRow}>
            <span className={styles.flag}>{nat.flag}</span>
            <span className={styles.natCode}>{nat.code}</span>
          </div>
        )}

        <div className={styles.nameBlock}>
          <span className={styles.firstName}>{stats?.givenName ?? ''}</span>
          <span className={styles.lastName}>{(stats?.familyName || driver.full_name).toUpperCase()}</span>
          <span className={styles.team}>{driver.team_name}</span>
        </div>
      </div>

      <div className={styles.statsBox}>
        <div className={styles.statsRow1}>
          <PrimaryTile icon={<RankIcon />}   value={driver.position}                            label="Позиція" />
          <PrimaryTile icon={<StarIcon />}   value={driver.points}                               label="Очки" />
          <PrimaryTile icon={<TrophyIcon />} value={loading ? '—' : stats?.wins ?? '—'}          label="Перемоги" />
          <PrimaryTile icon={<PodiumIcon />} value={loading ? '—' : stats?.podiums ?? '—'}       label="Подіуми" />
        </div>
        <div className={styles.statsRow2}>
          <MiniStat icon={<FlagIcon />} value={loading ? '—' : stats?.poles ?? '—'}       label="ПОЛ-ПОЗИЦІЇ" />
          <MiniStat icon={<BoltIcon />} value={loading ? '—' : stats?.fastestLaps ?? '—'} label="НАЙШВ. КОЛО" />
          <MiniStat icon={<DnfIcon />}  value={loading ? '—' : stats?.dnf ?? '—'}         label="DNF" />
        </div>
      </div>
    </div>
  )
}

export default DriverDetailHero

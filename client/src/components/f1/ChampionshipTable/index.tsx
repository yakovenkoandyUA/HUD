import React, { useState } from 'react'
import { useChampionshipStandings, type DriverStanding } from '../../../hooks/useChampionshipStandings'
import styles from './ChampionshipTable.module.css'

/**
 * ChampionshipTable
 * -----------------
 * Таблиця чемпіонату F1: пілоти (з фото) або команди.
 * Дані через Jolpica (standings) + OpenF1 (headshots).
 * Денне кешування у sessionStorage.
 *
 * Props:
 * @prop {'drivers' | 'constructors'} tab — яка таблиця відображається (контролюється батьківським екраном)
 */

const TEAM_COLORS: Record<string, string> = {
  'Mercedes':     '#00D2BE',
  'Ferrari':      '#E8002D',
  'McLaren':      '#FF8000',
  'Red Bull':     '#3671C6',
  'Alpine':       '#FF87BC',
  'Aston Martin': '#229971',
  'Williams':     '#64C4FF',
  'Haas':         '#B6BABD',
  'Kick Sauber':  '#52E252',
  'RB':           '#6692FF',
}

interface ChampionshipTableProps {
  tab: 'drivers' | 'constructors'
}

function rowClass(pos: number): string {
  if (pos === 1) return `${styles.row} ${styles.gold}`
  if (pos === 2) return `${styles.row} ${styles.silver}`
  if (pos === 3) return `${styles.row} ${styles.bronze}`
  return styles.row
}

function posClass(pos: number): string {
  if (pos === 1) return styles.posGold
  if (pos === 2) return styles.posSilver
  if (pos === 3) return styles.posBronze
  return styles.posOther
}

function initials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

type ImgStage = 'direct' | 'proxy' | 'initials'

function DriverAvatar({ driver }: { driver: DriverStanding }) {
  const [stage, setStage] = useState<ImgStage>(driver.headshot_url ? 'direct' : 'initials')

  if (stage === 'initials' || !driver.headshot_url) {
    return (
      <div className={styles.avatar}>
        <span className={styles.avatarInitials}>{initials(driver.full_name)}</span>
      </div>
    )
  }

  const src = stage === 'proxy'
    ? `https://images.weserv.nl/?url=${encodeURIComponent(driver.headshot_url)}`
    : driver.headshot_url

  const handleError = () => {
    if (stage === 'direct') setStage('proxy')
    else setStage('initials')
  }

  return (
    <div className={styles.avatar}>
      <img
        src={src}
        alt={driver.broadcast_name}
        className={styles.avatarImg}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        onError={handleError}
      />
    </div>
  )
}

function Skeleton() {
  return (
    <div className={styles.skeleton}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={styles.skeletonRow}>
          <div className={styles.skBar} style={{ width: 20 }} />
          <div className={styles.skBar} style={{ width: 14, flexShrink: 0 }} />
          <div className={styles.skBar} style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className={styles.skBar} style={{ width: '55%' }} />
            <div className={styles.skBar} style={{ width: '35%', opacity: 0.6 }} />
          </div>
          <div className={styles.skBar} style={{ width: 36 }} />
        </div>
      ))}
    </div>
  )
}

const ChampionshipTable: React.FC<ChampionshipTableProps> = ({ tab }) => {
  const { drivers, constructors, loading, error, refetch } = useChampionshipStandings()

  if (loading) return <Skeleton />

  if (error) {
    return (
      <div className={styles.error}>
        <span className={styles.errorText}>Не вдалося завантажити дані</span>
        <span className={styles.errorDetail}>{error}</span>
        <button className={styles.retryBtn} onClick={refetch}>Спробувати знову</button>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      {tab === 'drivers' && (
        <div className={styles.table}>
          {drivers.length === 0 && (
            <p className={styles.emptyText}>Дані відсутні</p>
          )}
          {drivers.map((d) => (
            <div key={d.driver_number} className={rowClass(d.position)}>
              <span className={`${styles.pos} ${posClass(d.position)}`}>{d.position}</span>
              <DriverAvatar driver={d} />
              <div className={styles.info}>
                <span className={styles.name}>{d.full_name}</span>
                <div className={styles.teamRow}>
                  <span
                    className={styles.teamDot}
                    style={{ background: TEAM_COLORS[d.team_name] ?? 'var(--border2)' }}
                  />
                  <span className={styles.team}>{d.team_name}</span>
                </div>
              </div>
              <div className={styles.pts}>
                {d.points} <small className={styles.ptsSmall}>pts</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'constructors' && (
        <div className={styles.table}>
          {constructors.length === 0 && (
            <p className={styles.emptyText}>Дані відсутні</p>
          )}
          {constructors.map((c) => (
            <div key={c.team_name} className={rowClass(c.position)}>
              <span className={`${styles.pos} ${posClass(c.position)}`}>{c.position}</span>
              <div className={styles.info}>
                <div className={styles.teamRow}>
                  <span
                    className={styles.teamDot}
                    style={{ background: TEAM_COLORS[c.team_name] ?? 'var(--border2)' }}
                  />
                  <span className={styles.name}>{c.team_name}</span>
                </div>
              </div>
              <div className={styles.pts}>
                {c.points} <small className={styles.ptsSmall}>pts</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ChampionshipTable

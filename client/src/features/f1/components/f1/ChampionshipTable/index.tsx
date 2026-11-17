import { useId, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useChampionshipStandings, type DriverStanding } from '../../../hooks/useChampionshipStandings'
import { F1_TEAMS } from '../../../data/f1Teams'
import ConstructorStatsCard from '../ConstructorStatsCard'
import DriverHero from '../DriverHero'
import { getDriverHeadshot } from '../../../utils/f1'
import styles from './ChampionshipTable.module.css'
import teamStyles from './ConstructorStandings.module.css'

interface ChampionshipTableProps {
  tab: 'drivers' | 'constructors'
}

function initials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

type ImgStage = 'direct' | 'proxy' | 'initials'

interface DriverAvatarProps {
  driver: DriverStanding
}

/** Shows the standings portrait with proxy and initials fallbacks. */
function DriverAvatar({ driver }: DriverAvatarProps) {
  const url = getDriverHeadshot(driver.driverId ?? '') ?? driver.headshot_url
  const [stage, setStage] = useState<ImgStage>(url ? 'direct' : 'initials')

  if (stage === 'initials' || !url) {
    return (
      <div className={styles.avatar} aria-hidden="true">
        <span className={styles.avatarInitials}>{initials(driver.full_name)}</span>
      </div>
    )
  }

  const src = stage === 'proxy'
    ? `https://images.weserv.nl/?url=${encodeURIComponent(url)}`
    : url

  const handleError = () => {
    if (stage === 'direct') setStage('proxy')
    else setStage('initials')
  }

  return (
    <div className={styles.avatar} aria-hidden="true">
      <img
        src={src}
        alt=""
        loading="lazy"
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

/** Displays the driver and constructor standings in a shared ranking layout. */
function ChampionshipTable({ tab }: ChampionshipTableProps) {
  const panelId = useId()
  const { drivers, constructors, loading, error, refetch } = useChampionshipStandings()
  const [expandedConstructor, setExpandedConstructor] = useState<string | null>(null)
  const [openedConstructors, setOpenedConstructors] = useState<Set<string>>(() => new Set())
  const teamsByName = new Map(constructors.map(team => [team.team_name, team]))

  const toggleConstructor = (id: string) => {
    setExpandedConstructor(current => current === id ? null : id)
    setOpenedConstructors(current => current.has(id) ? current : new Set(current).add(id))
  }

  if (loading) return <Skeleton />
  if (error) {
    return (
      <div className={styles.error}>
        <span className={styles.errorText}>Не вдалося завантажити дані</span>
        <span className={styles.errorDetail}>{error}</span>
        <button type="button" className={styles.retryBtn} onClick={refetch}>Спробувати знову</button>
      </div>
    )
  }

  const isDrivers = tab === 'drivers'
  if (!(isDrivers ? drivers.length : constructors.length)) {
    return <p className={styles.emptyText}>Дані відсутні</p>
  }

  const leader = drivers.find(driver => driver.position === 1)

  return (
    <>
      {isDrivers && leader && (
        <div className={styles.leader}>
          {/* <h2 className={styles.leaderTitle}>Лідер чемпіонату</h2> */}
          {leader.driverId ? (
            <Link className={styles.leaderLink} to={`/f1/drivers/${leader.driverId}`}>
              <DriverHero key={leader.driverId} driver={leader} />
            </Link>
          ) : <DriverHero key={leader.driver_number} driver={leader} />}
        </div>
      )}
      <section className={isDrivers ? `${styles.table} ${styles.driverTable}` : `${styles.table} ${teamStyles.table}`} aria-label={isDrivers ? 'Залік пілотів' : 'Кубок конструкторів'}>
        <div className={styles.tableHeader} aria-hidden="true">
          <span>Поз.</span>
          <span>{isDrivers ? 'Пілот' : 'Команда'}</span>
          <span>Очки</span>
        </div>
        <ol className={styles.list}>
          {isDrivers ? drivers.map(driver => {
            const constructorId = teamsByName.get(driver.team_name)?.constructorId
            const team = constructorId ? F1_TEAMS[constructorId === 'rb' ? 'racing_bulls' : constructorId] : undefined
            const rowStyle = team ? { '--team-color': team.primary } as CSSProperties : undefined
            const content = (
              <>
                <span className={styles.pos} data-podium={driver.position <= 3 ? driver.position : undefined}>{driver.position}</span>
                <DriverAvatar key={driver.driverId ?? driver.headshot_url} driver={driver} />
                <span className={styles.info}>
                  <span className={styles.name}>{driver.full_name}</span>
                  <span className={styles.subtitle}>{driver.team_name}</span>
                </span>
                <span className={styles.points} aria-label={`${driver.points} очок`}>{driver.points}</span>
                {driver.driverId && <svg className={styles.arrow} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>}
              </>
            )
            return (
              <li key={driver.driverId ?? driver.driver_number} className={styles.entry} style={rowStyle}>
                {driver.driverId
                  ? <Link className={styles.row} to={`/f1/drivers/${driver.driverId}`}>{content}</Link>
                  : <div className={styles.row}>{content}</div>}
              </li>
            )
          }) : constructors.map(team => {
            const id = team.constructorId
            const assetId = id === 'rb' ? 'racing_bulls' : id
            const teamInfo = assetId ? F1_TEAMS[assetId] : undefined
            const isOpen = !!id && expandedConstructor === id
            const panel = `${panelId}-${team.position}`
            const driversForTeam = drivers.filter(driver => driver.team_name === team.team_name)
            const rowStyle = teamInfo ? { '--team-color': teamInfo.primary } as CSSProperties : undefined
            const content = (
              <>
                <span className={styles.pos} data-leader={team.position === 1 || undefined}>{team.position}</span>
                <span className={teamStyles.mark} aria-hidden="true">
                  {teamInfo?.logo
                    ? <img src={teamInfo.logo} alt="" loading="lazy" />
                    : <span>{team.team_name.slice(0, 2).toUpperCase()}</span>}
                </span>
                <span className={styles.info}>
                  <span className={teamStyles.name}>{teamInfo?.name ?? team.team_name}</span>
                  {driversForTeam.length > 0 && (
                    <span className={styles.subtitle}>
                      {driversForTeam.map(driver => driver.full_name.trim().split(/\s+/).slice(1).join(' ') || driver.full_name).join(' · ')}
                    </span>
                  )}
                </span>
                <span className={styles.points} aria-label={`${team.points} очок`}>{team.points}</span>
              </>
            )
            return (
              <li key={id ?? team.team_name} className={styles.entry} style={rowStyle}>
                {id ? (
                  <>
                    <button type="button" className={`${styles.row} ${teamStyles.row}`} aria-expanded={isOpen} aria-controls={panel} onClick={() => toggleConstructor(id)}>
                      {content}
                      <svg className={styles.arrow} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                    <div id={panel} className={`${teamStyles.panel} ${isOpen ? teamStyles.panelOpen : ''}`} inert={!isOpen}>
                      <div className={teamStyles.panelContent}>
                        {openedConstructors.has(id) && (
                          <ConstructorStatsCard constructorId={id} assetId={assetId} teamInfo={teamInfo} drivers={driversForTeam} />
                        )}
                      </div>
                    </div>
                  </>
                ) : <div className={`${styles.row} ${teamStyles.row}`}>{content}</div>}
              </li>
            )
          })}
        </ol>
      </section>
    </>
  )
}

export default ChampionshipTable

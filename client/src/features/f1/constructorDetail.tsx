import type { CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import ConstructorStatsCard from './components/f1/ConstructorStatsCard'
import { getF1TeamProfile } from './data/f1Teams'
import { useChampionshipStandings } from './hooks/useChampionshipStandings'
import layout from './DriverDetail.module.css'
import styles from './ConstructorDetail.module.css'

/** Provides the constructor's championship position, season numbers, and driver lineup. */
export default function ConstructorDetailPage() {
  const { constructorId } = useParams<{ constructorId: string }>()
  const { constructors, drivers, loading, error, refetch } = useChampionshipStandings()
  const standing = constructors.find(team => team.constructorId === constructorId)
  const profile = constructorId ? getF1TeamProfile(constructorId) : undefined

  return (
    <div className={layout.screen}>
      <header className={layout.topBar}>
        <Link className={layout.back} to="/f1" aria-label="Повернутися до Формули 1">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          F1
        </Link>
        <span className={layout.headerLabel}>КОМАНДА</span>
      </header>

      {loading ? (
        <p className={layout.notFound} role="status">Завантажуємо команду…</p>
      ) : error ? (
        <div className={layout.notFound}>
          <p>Не вдалося завантажити залік команд</p>
          <button className={layout.moreBtn} type="button" onClick={refetch}>Спробувати знову</button>
        </div>
      ) : standing && constructorId ? (
        <div className={layout.content} style={{ '--team-color': profile?.primary ?? 'var(--accent)' } as CSSProperties}>
          <div className={layout.heroInline}>
            <section className={styles.hero} aria-labelledby="constructor-title">
              {profile && <img className={styles.emblem} src={profile.emblem} alt="" />}
              <h1 id="constructor-title" className={styles.name}>{profile?.name ?? standing.team_name}</h1>
              <p className={styles.standing}>
                <span className={styles.position}>P{standing.position}</span>
                <span>{standing.points} очок</span>
              </p>
              {profile && <img className={styles.car} src={profile.car} alt={`Болід ${profile.name}`} />}
            </section>
          </div>

          <ConstructorStatsCard
            key={constructorId}
            constructorId={constructorId}
            drivers={drivers.filter(driver => driver.team_name === standing.team_name)}
          />

          {profile && (
            <section className={styles.about} aria-label="Про команду">
              <h2>Про команду</h2>
              <dl>
                <div><dt>Штаб-квартира</dt><dd>{profile.hq}</dd></div>
                <div><dt>Керівник</dt><dd>{profile.principal}</dd></div>
                <div><dt>Двигун</dt><dd>{profile.engine}</dd></div>
              </dl>
            </section>
          )}
        </div>
      ) : <p className={layout.notFound}>Команду не знайдено</p>}
    </div>
  )
}

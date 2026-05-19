import React, { useState } from 'react'
import TopBar from '../../components/layout/TopBar'
import NextRaceCard from '../../components/f1/NextRaceCard'
import RaceCalendarList from '../../components/f1/RaceCalendarList'
import ChampionshipTable from '../../components/f1/ChampionshipTable'
import { F1_SEASON_2026 } from '../../data/f1Season2026'
import { getNextRace, getNextRound } from '../../utils/f1'
import styles from './F1.module.css'

type F1Tab = 'calendar' | 'drivers' | 'constructors'

const TABS: { id: F1Tab; label: string }[] = [
  { id: 'calendar',     label: 'Календар' },
  { id: 'drivers',      label: 'Пілоти'   },
  { id: 'constructors', label: 'Команди'  },
]

const F1Screen: React.FC = () => {
  const [tab, setTab] = useState<F1Tab>('calendar')
  const nextRace = getNextRace(F1_SEASON_2026)
  const nextRound = getNextRound(F1_SEASON_2026)

  return (
    <div className={styles.screen}>
      <TopBar title="F1 2026" />
      <div className={styles.content}>
        {nextRace ? (
          <NextRaceCard race={nextRace} />
        ) : (
          <p className={styles.done}>Сезон 2026 завершено</p>
        )}

        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'calendar' && (
          <RaceCalendarList races={F1_SEASON_2026} nextRound={nextRound} />
        )}

        {(tab === 'drivers' || tab === 'constructors') && (
          <ChampionshipTable tab={tab} />
        )}
      </div>
    </div>
  )
}

export default F1Screen

import React, { useEffect, useState } from 'react'
import PillSelector from '@/shared/components/ui/PillSelector'
import { useFootballStore } from '../../store/footballStore'
import type { CompetitionCode } from '../../types'
import styles from './index.module.css'

const COMPETITIONS: { value: CompetitionCode; label: string }[] = [
  { value: 'PL',  label: 'АПЛ' },
  { value: 'PD',  label: 'Ла Ліга' },
  { value: 'BL1', label: 'Бундесліга' },
  { value: 'SA',  label: 'Серія А' },
  { value: 'FL1', label: 'Ліга 1' },
  { value: 'CL',  label: 'ЛЧ' },
]

function formatMatchTime(iso: string): { time: string; day: string } {
  const d = new Date(iso)
  return {
    time: d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }),
    day: d.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' }),
  }
}

/**
 * FootballPanel
 * -------------
 * Таб-контент "Футбол" на екрані /f1 (Спорт): вибір ліги, найближчий матч,
 * турнірна таблиця. Дані — GET /api/football/standings і /api/football/matches.
 */
const FootballPanel: React.FC = () => {
  const [competition, setCompetition] = useState<CompetitionCode>('PL')
  const { standings, nextMatch, loading, error, fetchStandings, fetchNextMatch } = useFootballStore()

  useEffect(() => {
    fetchStandings(competition)
    fetchNextMatch(competition)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competition])

  const table = standings[competition] ?? []
  const match = nextMatch[competition]

  return (
    <div className={styles.wrap}>
      <div className={styles.competitionRow}>
        <PillSelector
          options={COMPETITIONS}
          value={competition}
          onChange={setCompetition}
        />
      </div>

      {match && (
        <>
          <p className={styles.eyebrow}>Найближчий матч</p>
          <div className={styles.card}>
            <div className={styles.matchRow}>
              <div className={styles.team}>
                {match.homeTeam.crest
                  ? <img src={match.homeTeam.crest} alt="" className={styles.crest} />
                  : <span className={styles.crestFallback}>{match.homeTeam.shortName.slice(0, 3).toUpperCase()}</span>}
                <span className={styles.teamName}>{match.homeTeam.shortName}</span>
              </div>
              <div className={styles.vsMid}>
                <span className={styles.vsTime}>{formatMatchTime(match.utcDate).time}</span>
                <span className={styles.vsLeague}>{formatMatchTime(match.utcDate).day}</span>
              </div>
              <div className={styles.team}>
                {match.awayTeam.crest
                  ? <img src={match.awayTeam.crest} alt="" className={styles.crest} />
                  : <span className={styles.crestFallback}>{match.awayTeam.shortName.slice(0, 3).toUpperCase()}</span>}
                <span className={styles.teamName}>{match.awayTeam.shortName}</span>
              </div>
            </div>
          </div>
        </>
      )}

      <p className={styles.eyebrow}>Турнірна таблиця</p>
      {loading && table.length === 0 && <p className={styles.state}>Завантаження...</p>}
      {error && table.length === 0 && !loading && <p className={styles.state}>{error}</p>}
      {table.length > 0 && (
        <div className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Команда</th>
                <th className={styles.num}>І</th>
                <th className={styles.num}>О</th>
              </tr>
            </thead>
            <tbody>
              {table.map(row => (
                <tr key={row.team.id}>
                  <td className={`${styles.pos} ${row.position <= 3 ? styles.posTop : ''}`}>{row.position}</td>
                  <td>
                    <span className={styles.teamCell}>
                      {row.team.crest
                        ? <img src={row.team.crest} alt="" className={styles.miniCrest} />
                        : <span className={styles.miniCrest} />}
                      {row.team.shortName}
                    </span>
                  </td>
                  <td className={styles.num}>{row.playedGames}</td>
                  <td className={`${styles.num} ${styles.pts}`}>{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default FootballPanel

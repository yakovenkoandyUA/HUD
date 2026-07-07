import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import RacePredictionCard from './components/f1/RacePredictionCard'
import MySeasonStats from './components/f1/MySeasonStats'
import { F1_SEASON_2026 } from './data/f1Season2026'
import { getNextRace } from './utils/f1'
import { useF1PredictionsStore } from '@/features/f1/store/f1PredictionsStore'
import styles from './MySeasonPage.module.css'

/**
 * MySeasonPage
 * ------------
 * Персональна F1 сторінка користувача (/f1/my-season).
 * Містить прогноз на наступну гонку та статистику сезону.
 */
const MySeasonPage: React.FC = () => {
  const navigate = useNavigate()
  const { fetchPredictions } = useF1PredictionsStore()
  const nextRace = getNextRace(F1_SEASON_2026)

  useEffect(() => {
    fetchPredictions()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate('/f1')}>
          ← F1
        </button>
        <span className={styles.title}>ПРОГНОЗИ</span>
        <div className={styles.spacer} />
      </div>

      <div className={styles.content}>
        {nextRace && <RacePredictionCard race={nextRace} />}
        <MySeasonStats />
      </div>
    </div>
  )
}

export default MySeasonPage

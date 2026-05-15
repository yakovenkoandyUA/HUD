import React from 'react'
import Card from '../../ui/Card'
import type { F1Race } from '../../../data/f1Season2025'
import styles from './NextRaceMini.module.css'

/**
 * NextRaceMini
 * ------------
 * Мінікартка наступного Гран Прі для Dashboard.
 *
 * Props:
 * @prop {F1Race | null} race      — наступна гонка або null якщо сезон закінчено
 * @prop {number}        daysLeft  — кількість днів до гонки
 */
interface NextRaceMiniProps {
  race: F1Race | null
  daysLeft: number
}

const NextRaceMini: React.FC<NextRaceMiniProps> = ({ race, daysLeft }) => {
  if (!race) return (
    <Card className={styles.card}>
      <span className={styles.label}>Наступна гонка</span>
      <span className={styles.done}>Сезон завершено</span>
    </Card>
  )

  return (
    <Card className={styles.card}>
      <div className={styles.label}>Наступна гонка</div>
      <div className={styles.row}>
        <span className={styles.flag}>{race.flag}</span>
        <span className={styles.name}>{race.name}</span>
      </div>
      <div className={styles.countdown}>
        <span className={styles.days}>{daysLeft}</span>
        <span className={styles.unit}> днів</span>
      </div>
    </Card>
  )
}

export default NextRaceMini

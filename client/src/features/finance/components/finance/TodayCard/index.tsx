import React from 'react'
import Card from '@/shared/components/ui/Card'
import { fmt } from '../../../utils/finance'
import styles from './TodayCard.module.css'

/**
 * TodayCard
 * ---------
 * Картка витрат за сьогодні та дельта від денного бюджету.
 *
 * Props:
 * @prop {number} todaySpent   — витрачено сьогодні (грн)
 * @prop {number} dailyBudget  — денний бюджет (грн)
 */
interface TodayCardProps {
  todaySpent: number
  dailyBudget: number
}

const TodayCard: React.FC<TodayCardProps> = ({ todaySpent, dailyBudget }) => {
  const delta = dailyBudget - todaySpent
  const positive = delta >= 0

  return (
    <Card className={styles.card}>
      <div className={styles.label}>Сьогодні</div>
      <div className={styles.spent}>{fmt(todaySpent)} ₴</div>
      <div className={`${styles.delta} ${positive ? styles.pos : styles.neg}`}>
        {positive ? '+' : ''}{fmt(delta)} ₴ від бюджету
      </div>
    </Card>
  )
}

export default TodayCard

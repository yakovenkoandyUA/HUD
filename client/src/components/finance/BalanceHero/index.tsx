import React, { useEffect } from 'react'
import ProgressBar from '../../ui/ProgressBar'
import { fmt } from '../../../utils/finance'
import { useStreakStore } from '../../../store/streakStore'
import styles from './BalanceHero.module.css'

/**
 * BalanceHero
 * ----------
 * Єдиний hero-блок фінансового екрану — баланс, прогрес дня, статистика
 * за поточний бюджетний період. Без внутрішніх border-grid.
 *
 * Props:
 * @prop {number}  balance      — поточний баланс (грн)
 * @prop {number}  dailyBudget  — розрахований денний ліміт
 * @prop {number}  monthSpent   — витрачено за бюджетний період
 * @prop {number}  totalTopup   — поповнення за бюджетний період
 * @prop {number}  avgPerDay    — середнє витрат на день
 * @prop {number}  daysLeft     — днів до наступного поповнення
 * @prop {number}  todaySpent   — витрачено сьогодні
 */
interface BalanceHeroProps {
  balance: number
  dailyBudget: number
  monthSpent: number
  totalTopup: number
  avgPerDay: number
  daysLeft: number
  todaySpent: number
}

const BalanceHero: React.FC<BalanceHeroProps> = ({
  balance,
  dailyBudget,
  monthSpent,
  totalTopup,
  avgPerDay,
  daysLeft,
  todaySpent,
}) => {
  const { checkToday } = useStreakStore()

  useEffect(() => {
    checkToday(todaySpent, dailyBudget)
  }, [todaySpent, dailyBudget, checkToday])

  const progressPct = dailyBudget > 0 ? Math.min(100, Math.round((todaySpent / dailyBudget) * 100)) : 0
  const progressColor: 'red' | 'green' = todaySpent > dailyBudget ? 'red' : 'green'
  const delta = dailyBudget - todaySpent
  const projectedBalance = balance - dailyBudget * daysLeft

  return (
    <div className={styles.hero}>
      <div className={styles.label}>Баланс</div>
      <div className={styles.balance}>
        {fmt(balance)}<span className={styles.currency}> ₴</span>
      </div>

      <div className={styles.progressWrap}>
        <ProgressBar value={progressPct} max={100} color={progressColor} />
        <div className={styles.todayLine}>
          <span className={styles.todaySpent}>{fmt(todaySpent)} ₴ сьогодні</span>
          <span className={`${styles.todayDelta} ${delta >= 0 ? styles.pos : styles.neg}`}>
            {delta >= 0 ? '+' : ''}{fmt(delta)} ₴
          </span>
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Поповнення</span>
          <span className={`${styles.statValue} ${styles.pos}`}>+{fmt(totalTopup)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Витрати</span>
          <span className={`${styles.statValue} ${styles.neg}`}>−{fmt(monthSpent)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Ср./день</span>
          <span className={`${styles.statValue} ${avgPerDay <= dailyBudget ? styles.neutral : styles.neg}`}>
            {fmt(avgPerDay)}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Залишилось</span>
          <span className={styles.statValue}>{daysLeft} дн.</span>
        </div>
      </div>

      {daysLeft > 0 && (
        <div className={styles.forecast}>
          {projectedBalance > 0
            ? <>За нормою залишиться{' '}<span className={styles.forecastPos}>~{fmt(projectedBalance)} ₴</span></>
            : <>За нормою не вистачить{' '}<span className={styles.forecastNeg}>~{fmt(Math.abs(projectedBalance))} ₴</span></>
          }
        </div>
      )}
    </div>
  )
}

export default BalanceHero

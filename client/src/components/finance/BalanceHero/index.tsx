import React, { useEffect } from 'react'
import ProgressBar from '../../ui/ProgressBar'
import { fmt } from '../../../utils/finance'
import { useStreakStore } from '../../../store/streakStore'
import styles from './BalanceHero.module.css'

/**
 * BalanceHero
 * ----------
 * Головна картка балансу на екрані фінансів.
 * При mount перевіряє streak і обчислює прогноз до кінця місяця.
 *
 * Props:
 * @prop {number}  balance        — поточний баланс на картці (грн)
 * @prop {number}  dailyBudget    — розрахований денний бюджет
 * @prop {number}  monthSpent     — витрачено за поточний бюджетний період
 * @prop {number}  daysLeft       — кількість днів до наступного поповнення
 * @prop {number}  progressPct    — відсоток витрат від поповнень (0–100)
 * @prop {number}  todaySpent     — витрачено сьогодні (для streak)
 * @prop {number}  daysElapsed    — днів минуло з початку бюджетного періоду
 */
interface BalanceHeroProps {
  balance: number
  dailyBudget: number
  monthSpent: number
  daysLeft: number
  progressPct: number
  todaySpent: number
  daysElapsed: number
}

const BalanceHero: React.FC<BalanceHeroProps> = ({
  balance,
  dailyBudget,
  monthSpent,
  daysLeft,
  progressPct,
  todaySpent,
  daysElapsed,
}) => {
  const { currentStreak, checkToday } = useStreakStore()

  useEffect(() => {
    checkToday(todaySpent, dailyBudget)
  }, [todaySpent, dailyBudget, checkToday])

  const projectedBalance = balance - dailyBudget * daysLeft
  const showForecast = daysLeft > 0

  return (
    <div className={styles.hero}>
      <div className={styles.label}>Баланс</div>
      <div className={styles.balance}>{fmt(balance)} ₴</div>

      {currentStreak > 0 && (
        <span className={styles.streak}>🔥 {currentStreak} {currentStreak === 1 ? 'день' : currentStreak < 5 ? 'дні' : 'днів'} в рамках бюджету</span>
      )}

      <ProgressBar value={progressPct} max={100} color={progressPct > 80 ? 'red' : 'green'} showLabel />

      <div className={styles.meta}>
        <span>Витрачено: <b>{fmt(monthSpent)} ₴</b></span>
        <span>{daysLeft} днів · <b>{dailyBudget} ₴/день</b></span>
      </div>

      {showForecast && (
        <div className={styles.forecast}>
          {projectedBalance > 0 ? (
            <>За нормою залишиться{' '}
              <span className={styles.forecastPos}>~{fmt(projectedBalance)} ₴</span>
            </>
          ) : (
            <>За нормою не вистачить{' '}
              <span className={styles.forecastNeg}>~{fmt(Math.abs(projectedBalance))} ₴</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default BalanceHero

import React, { useEffect } from 'react'
import ProgressBar from '../../ui/ProgressBar'
import { fmt } from '../../../utils/finance'
import { useStreakStore } from '../../../store/streakStore'
import styles from './BalanceHero.module.css'

/**
 * BalanceHero
 * ----------
 * Головна картка балансу на екрані фінансів.
 * Прогресбар показує денний прогрес: скільки від денного бюджету вже витрачено.
 *
 * Props:
 * @prop {number}  balance      — поточний баланс на картці (грн)
 * @prop {number}  dailyBudget  — розрахований денний бюджет
 * @prop {number}  monthSpent   — витрачено за поточний бюджетний період
 * @prop {number}  daysLeft     — кількість днів до наступного поповнення
 * @prop {number}  todaySpent   — витрачено сьогодні
 */
interface BalanceHeroProps {
  balance: number
  dailyBudget: number
  monthSpent: number
  daysLeft: number
  todaySpent: number
}

const BalanceHero: React.FC<BalanceHeroProps> = ({
  balance,
  dailyBudget,
  monthSpent,
  daysLeft,
  todaySpent,
}) => {
  const { currentStreak, checkToday } = useStreakStore()

  useEffect(() => {
    checkToday(todaySpent, dailyBudget)
  }, [todaySpent, dailyBudget, checkToday])

  const progressPct = dailyBudget > 0 ? Math.min(100, Math.round((todaySpent / dailyBudget) * 100)) : 0
  const progressColor: 'red' | 'green' = todaySpent > dailyBudget ? 'red' : 'green'
  const projectedBalance = balance - dailyBudget * daysLeft

  return (
    <div className={styles.hero}>
      <div className={styles.label}>Баланс</div>
      <div className={styles.balance}>
        {fmt(balance)}<span className={styles.currency}> ₴</span>
      </div>

      {currentStreak > 0 && (
        <span className={styles.streak}>🔥 {currentStreak} {currentStreak === 1 ? 'день' : currentStreak < 5 ? 'дні' : 'днів'} в рамках бюджету</span>
      )}

      <ProgressBar value={progressPct} max={100} color={progressColor} showLabel />

      <div className={styles.meta}>
        <span>Витрачено: <b>{fmt(monthSpent)} ₴</b></span>
        <span>{daysLeft} днів · <b>{dailyBudget} ₴/день</b></span>
      </div>

      {daysLeft > 0 && (
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

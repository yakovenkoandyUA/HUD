import React from 'react'
import ProgressBar from '../../ui/ProgressBar'
import { fmt } from '../../../utils/finance'
import styles from './BalanceHero.module.css'

/**
 * BalanceHero
 * ----------
 * Головна картка балансу на екрані фінансів.
 *
 * Props:
 * @prop {number}  balance        — поточний баланс на картці (грн)
 * @prop {number}  dailyBudget    — розрахований денний бюджет до кінця місяця
 * @prop {number}  monthSpent     — витрачено за поточний місяць
 * @prop {number}  daysLeft       — кількість днів до кінця місяця
 * @prop {number}  progressPct    — відсоток витрат від поповнень (0–100)
 */
interface BalanceHeroProps {
  balance: number
  dailyBudget: number
  monthSpent: number
  daysLeft: number
  progressPct: number
}

const BalanceHero: React.FC<BalanceHeroProps> = ({
  balance,
  dailyBudget,
  monthSpent,
  daysLeft,
  progressPct,
}) => (
  <div className={styles.hero}>
    <div className={styles.label}>Баланс</div>
    <div className={styles.balance}>{fmt(balance)} ₴</div>
    <ProgressBar value={progressPct} max={100} color={progressPct > 80 ? 'red' : 'green'} showLabel />
    <div className={styles.meta}>
      <span>Витрачено: <b>{fmt(monthSpent)} ₴</b></span>
      <span>{daysLeft} днів · <b>{dailyBudget} ₴/день</b></span>
    </div>
  </div>
)

export default BalanceHero

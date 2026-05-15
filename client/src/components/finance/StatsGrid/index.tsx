import React from 'react'
import { fmt } from '../../../utils/finance'
import styles from './StatsGrid.module.css'

/**
 * StatsGrid
 * ---------
 * Сітка статистичних плиток: поповнення, витрати, залишок, бонус.
 *
 * Props:
 * @prop {number} totalTopup    — поповнення за місяць
 * @prop {number} totalExpense  — витрати за місяць
 * @prop {number} daysLeft      — залишок днів у місяці
 * @prop {number} bonus         — бонус/дефіцит (dailyBudget*daysElapsed - totalExpense)
 */
interface StatsGridProps {
  totalTopup: number
  totalExpense: number
  daysLeft: number
  bonus: number
}

interface StatTileProps {
  label: string
  value: string
  accent?: boolean
  negative?: boolean
}

const StatTile: React.FC<StatTileProps> = ({ label, value, accent, negative }) => (
  <div className={`${styles.tile} ${accent ? styles.accent : ''} ${negative ? styles.negative : ''}`}>
    <div className={styles.tileLabel}>{label}</div>
    <div className={styles.tileValue}>{value}</div>
  </div>
)

const StatsGrid: React.FC<StatsGridProps> = ({ totalTopup, totalExpense, daysLeft, bonus }) => (
  <div className={styles.grid}>
    <StatTile label="Поповнення" value={`${fmt(totalTopup)} ₴`} accent />
    <StatTile label="Витрати" value={`${fmt(totalExpense)} ₴`} negative />
    <StatTile label="Днів залишилось" value={String(daysLeft)} />
    <StatTile label="Бонус" value={`${bonus >= 0 ? '+' : ''}${fmt(bonus)} ₴`} accent={bonus >= 0} negative={bonus < 0} />
  </div>
)

export default StatsGrid

import React from 'react'
import Card from '../../ui/Card'
import { fmt } from '../../../utils/finance'
import styles from './BalanceMini.module.css'

/**
 * BalanceMini
 * -----------
 * Компактна картка балансу для Dashboard.
 *
 * Props:
 * @prop {number} balance      — поточний баланс (грн)
 * @prop {number} dailyBudget  — денний бюджет до кінця місяця
 */
interface BalanceMiniProps {
  balance: number
  dailyBudget: number
}

const BalanceMini: React.FC<BalanceMiniProps> = ({ balance, dailyBudget }) => (
  <Card variant="accent" className={styles.card}>
    <div className={styles.label}>Баланс</div>
    <div className={styles.balance}>{fmt(balance)} ₴</div>
    <div className={styles.daily}>~{dailyBudget} ₴/день</div>
  </Card>
)

export default BalanceMini

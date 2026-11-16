import React from 'react'
import { fmt } from '../../../utils/finance'
import styles from './MonoHero.module.css'

/**
 * MonoHero
 * --------
 * Hero-блок вкладки Mono: реальний баланс картки з Monobank API (або сума її транзакцій,
 * якщо банк не підключено / ще не синхронізовано). Не впливає на головний баланс (Sense).
 *
 * Props:
 * @prop {number}  balance   — баланс картки (грн)
 * @prop {boolean} live      — true якщо баланс прийшов з Monobank API
 * @prop {string | null} lastSync — час останньої синхронізації (вже відформатований) або null
 * @prop {number}  [creditLimit] — кредитний ліміт, вже вирахуваний з balance (показується приміткою)
 */
interface MonoHeroProps {
  balance: number
  live: boolean
  lastSync: string | null
  creditLimit?: number
}

const MonoHero: React.FC<MonoHeroProps> = ({ balance, live, lastSync, creditLimit = 0 }) => (
  <div className={styles.hero}>
    <div className={styles.label}>Mono</div>
    <div className={styles.balance}>
      {fmt(balance)}<span className={styles.currency}> ₴</span>
    </div>
    <div className={styles.note}>
      {live
        ? `Баланс з Monobank${lastSync ? ` · ${lastSync}` : ''}`
        : 'Рахується з записаних транзакцій — підключи Monobank у Профіль → Гаманець'}
    </div>
    {live && creditLimit > 0 && (
      <div className={styles.note}>Власні кошти, без кредитного ліміту {fmt(creditLimit)} ₴</div>
    )}
  </div>
)

export default MonoHero

import React, { useEffect, useState } from 'react'
import { fmt } from '../../../utils/finance'
import type { F1Race } from '../../../data/f1Season2026'
import styles from './HeroCard.module.css'

/**
 * HeroCard
 * --------
 * Компактна баланс-картка Dashboard з опціональним F1-таймером праворуч.
 * "Сезон завершено" не відображається — правий панель прихований коли race = null.
 *
 * Props:
 * @prop {number}       balance      — поточний баланс (грн)
 * @prop {number}       dailyBudget  — денний бюджет (грн)
 * @prop {number}       todaySpent   — витрачено сьогодні (грн)
 * @prop {F1Race|null}  race         — наступна гонка або null
 * @prop {boolean}      compact      — true коли RaceHeroCard вже показано зверху
 */
interface HeroCardProps {
  balance: number
  dailyBudget: number
  todaySpent: number
  race: F1Race | null
  compact?: boolean
}

interface Countdown {
  d: number
  h: number
  m: number
  s: number
}

function getCountdown(raceDate: string): Countdown | null {
  const target = new Date(raceDate + 'T14:00:00Z').getTime()
  const diff = target - Date.now()
  if (diff <= 0) return null
  const s = Math.floor(diff / 1000)
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

const HeroCard: React.FC<HeroCardProps> = ({ balance, dailyBudget, todaySpent, race, compact }) => {
  const [countdown, setCountdown] = useState<Countdown | null>(
    race ? getCountdown(race.date) : null
  )

  useEffect(() => {
    if (!race) return
    const id = setInterval(() => setCountdown(getCountdown(race.date)), 1000)
    return () => clearInterval(id)
  }, [race])

  const progressPct = dailyBudget > 0
    ? Math.min(100, Math.round((todaySpent / dailyBudget) * 100))
    : 0
  const overBudget = todaySpent > dailyBudget
  const showRace = !compact && !!race

  return (
    <div className={styles.balanceCard}>
      <div className={styles.topRow}>
        <div className={styles.balanceLeft}>
          <span className={styles.balanceAmount}>
            {fmt(balance)}<span className={styles.balanceCurrency}> ₴</span>
          </span>
          <span className={styles.balanceToday}>
            Сьогодні: {fmt(todaySpent)} / {fmt(dailyBudget)} ₴
          </span>
        </div>

        {showRace && (
          <>
            <div className={styles.divider} />
            <div className={styles.right}>
              <div className={styles.raceLabel}>
                <span className={styles.flag}>{race!.flag}</span>
                <span className={styles.raceName}>{race!.name.replace(' GP', '')}</span>
              </div>
              {countdown ? (
                <div className={styles.countdownGrid}>
                  <div className={styles.countdownUnit}>
                    <span className={styles.countdownNum}>{countdown.d}</span>
                    <span className={styles.countdownSub}>д</span>
                  </div>
                  <div className={styles.countdownUnit}>
                    <span className={styles.countdownNum}>{pad(countdown.h)}</span>
                    <span className={styles.countdownSub}>г</span>
                  </div>
                  <div className={styles.countdownUnit}>
                    <span className={styles.countdownNum}>{pad(countdown.m)}</span>
                    <span className={styles.countdownSub}>хв</span>
                  </div>
                  <div className={styles.countdownUnit}>
                    <span className={styles.countdownNum}>{pad(countdown.s)}</span>
                    <span className={styles.countdownSub}>с</span>
                  </div>
                </div>
              ) : (
                <div className={styles.raceDay}>RACE DAY! 🏁</div>
              )}
            </div>
          </>
        )}
      </div>

      <div className={styles.balanceBar}>
        <div
          className={`${styles.balanceBarFill} ${overBudget ? styles.barOver : ''}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  )
}

export default HeroCard

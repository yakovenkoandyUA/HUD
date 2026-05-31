import React, { useEffect, useState } from 'react'
import Card from '../../ui/Card'
import { fmt } from '../../../utils/finance'
import type { F1Race } from '../../../data/f1Season2026'
import styles from './HeroCard.module.css'

/**
 * HeroCard
 * --------
 * Hero-картка Dashboard: поєднує баланс і відлік до наступної гонки.
 *
 * Props:
 * @prop {number}       balance      — поточний баланс (грн)
 * @prop {number}       dailyBudget  — денний бюджет (грн)
 * @prop {number}       todaySpent   — витрачено сьогодні (грн)
 * @prop {F1Race|null}  race         — наступна гонка або null
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

  // const trackSvg = race?.trackSvg ?? null

  return (
    <Card variant="accent" className={styles.card}>
      {/* {trackSvg && (
        <img
          src={trackSvg}
          className={styles.watermark}
          aria-hidden="true"
          alt=""
        />
      )} */}

      <div className={styles.inner}>
        {/* Left — balance */}
        <div className={styles.left}>
          <span className={styles.label}>Баланс</span>
          <div className={styles.balanceRow}>
            <span className={styles.currency}>₴</span>
            <span className={styles.balance}>{fmt(balance)}</span>
          </div>
          {/* <div className={styles.daily}>{fmt(dailyBudget)} ₴/день</div> */}

          <div className={styles.progress}>
            <div className={styles.progressLabel}>
              <span>Сьогодні</span>
              <span className={overBudget ? styles.over : ''}>
                {fmt(todaySpent)} <span className={styles.slash}>/</span> {fmt(dailyBudget)} ₴
              </span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={`${styles.progressFill} ${overBudget ? styles.progressOver : ''}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Divider + right — hidden in compact mode */}
        {!compact && <div className={styles.divider} />}

        {!compact && <div className={styles.right}>
          {race ? (
            <>
              <div className={styles.raceLabel}>
                <span className={styles.flag}>{race.flag}</span>
                <span className={styles.raceName}>{race.name.replace(' GP', '')}</span>
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
            </>
          ) : (
            <span className={styles.done}>Сезон<br />завершено</span>
          )}
        </div>}
      </div>
    </Card>
  )
}

export default HeroCard

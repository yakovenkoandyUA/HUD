import React, { useState, useEffect } from 'react'
import styles from './RaceCountdown.module.css'

/**
 * RaceCountdown
 * -------------
 * Живий зворотній відлік до дати гонки (дні : год : хв : сек).
 *
 * Props:
 * @prop {string} raceDate — ISO дата гонки ('YYYY-MM-DD')
 */
interface RaceCountdownProps {
  raceDate: string
}

function getCountdown(raceDate: string) {
  const target = new Date(raceDate + 'T14:00:00Z').getTime()
  const diff = target - Date.now()
  if (diff <= 0) return null
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return { d, h, m, s }
}

const RaceCountdown: React.FC<RaceCountdownProps> = ({ raceDate }) => {
  const [tick, setTick] = useState(() => getCountdown(raceDate))

  useEffect(() => {
    const id = setInterval(() => setTick(getCountdown(raceDate)), 1000)
    return () => clearInterval(id)
  }, [raceDate])

  const pad = (n: number) => String(n).padStart(2, '0')

  if (!tick) {
    return <div className={styles.countdown}><span className={styles.raceDay}>RACE DAY! 🏁</span></div>
  }

  return (
    <div className={styles.countdown}>
      <span className={styles.seg}><span className={styles.num}>{tick.d}</span><span className={styles.unit}>д</span></span>
      <span className={styles.sep}>:</span>
      <span className={styles.seg}><span className={styles.num}>{pad(tick.h)}</span><span className={styles.unit}>г</span></span>
      <span className={styles.sep}>:</span>
      <span className={styles.seg}><span className={styles.num}>{pad(tick.m)}</span><span className={styles.unit}>хв</span></span>
      <span className={styles.sep}>:</span>
      <span className={styles.seg}><span className={styles.num}>{pad(tick.s)}</span><span className={styles.unit}>с</span></span>
    </div>
  )
}

export default RaceCountdown

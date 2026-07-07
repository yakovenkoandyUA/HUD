import React, { useEffect, useRef, useState } from 'react'
import styles from './RaceCountdown.module.css'

/**
 * RaceCountdown
 * -------------
 * Аналоговий SVG годинник + цифровий зворотній відлік до гонки.
 *
 * Props:
 * @prop {string} raceDate — ISO дата гонки ('YYYY-MM-DD')
 * @prop {string} raceTime — час старту UTC ('HH:MM:SSZ'), дефолт '14:00:00Z'
 */
interface RaceCountdownProps {
  raceDate: string
  raceTime?: string
}

declare const anime: { targets: unknown; transform: string; duration: number } | undefined

const RaceCountdown: React.FC<RaceCountdownProps> = ({ raceDate, raceTime = '14:00:00Z' }) => {
  const [timeLeft, setTimeLeft]     = useState({ d: 0, h: 0, m: 0, s: 0 })
  const [currentTime, setCurrentTime] = useState({ h: 0, m: 0, s: 0 })
  const [raceDay, setRaceDay]       = useState(false)
  const initialized = useRef(false)
  const hoursRef    = useRef<SVGGElement>(null)
  const minutesRef  = useRef<SVGGElement>(null)
  const secondsRef  = useRef<SVGGElement>(null)
  const maskRef     = useRef<SVGGElement>(null)

  const pad = (n: number) => String(Math.floor(n)).padStart(2, '0')

  const twelveClock = (h: number) => {
    if (h === 0) return 12
    if (h > 12) return h - 12
    return h
  }

  const rotateTo = (target: SVGGElement | null, deg: number, duration = 400) => {
    if (!target) return
    if (typeof (window as unknown as Record<string, unknown>)['anime'] === 'function') {
      ;(window as unknown as Record<string, (opts: unknown) => void>)['anime']({
        targets: target,
        transform: `rotate(${deg})`,
        duration,
      })
    } else {
      target.setAttribute('transform', `rotate(${deg})`)
    }
  }

  useEffect(() => {
    const tick = () => {
      const now  = new Date()
      const h12  = twelveClock(now.getHours())
      const m    = now.getMinutes()
      const s    = now.getSeconds()

      setCurrentTime({ h: now.getHours(), m, s })

      const hDeg = -15 + h12 * 30 + (m / 60) * 30
      const mDeg = m * 6 + (s / 60) * 6
      const sDeg = s * 6

      if (!initialized.current) {
        hoursRef.current?.setAttribute('transform', `rotate(${hDeg})`)
        minutesRef.current?.setAttribute('transform', `rotate(${mDeg})`)
        secondsRef.current?.setAttribute('transform', `rotate(${sDeg})`)
        maskRef.current?.setAttribute('transform', `rotate(${-15 + h12 * 30})`)
        initialized.current = true
      } else {
        rotateTo(hoursRef.current, hDeg, 600)
        rotateTo(minutesRef.current, mDeg, 600)
        rotateTo(secondsRef.current, sDeg, 200)
        maskRef.current?.setAttribute('transform', `rotate(${-15 + h12 * 30})`)
      }

      const target = new Date(`${raceDate}T${raceTime}`)
      const diff   = Math.max(0, target.getTime() - now.getTime())
      setRaceDay(diff === 0)
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [raceDate, raceTime])

  return (
    <div className={styles.wrap}>
      {/* Аналоговий годинник */}
      <div className={styles.clockWrap}>
        <svg viewBox="0 0 100 100" className={styles.clock}>
          <defs>
            <filter id="rc-shadow-large">
              <feDropShadow dx="0" dy="0" stdDeviation="3"/>
            </filter>
            <filter id="rc-shadow-small">
              <feDropShadow dx="0" dy="0" stdDeviation="0.2"/>
            </filter>
            <mask id="rc-mask">
              <g transform="translate(50 50)">
                <g ref={maskRef}>
                  <circle cx="0" cy="0" r="50" fill="#fff"/>
                  <path d="M 0 -50 v 50 l 28.86 -50" fill="#000"/>
                </g>
              </g>
            </mask>
          </defs>

          <circle cx="50" cy="50" r="46" fill="#141414"/>
          <circle cx="50" cy="50" r="42" fill="var(--accent)" filter="url(#rc-shadow-large)"/>

          {/* Цифри */}
          <g
            fontSize="6px"
            transform="translate(50 50)"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--gold)"
            fontFamily="'Barlow Condensed', sans-serif"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const angle = (-90 + 30 * (i + 1)) * Math.PI / 180
              const r = 34
              return (
                <text key={i} x={r * Math.cos(angle)} y={r * Math.sin(angle)}>
                  {String(i + 1).padStart(2, '0')}
                </text>
              )
            })}
          </g>

          <circle mask="url(#rc-mask)" cx="50" cy="50" r="50" fill="#141414"/>
          <circle cx="50" cy="50" r="4" filter="url(#rc-shadow-small)" fill="#141414"/>

          {/* Поточна година */}
          <text
            x="50" y="72"
            textAnchor="middle"
            fontSize="7"
            fill="var(--gold)"
            fontFamily="'JetBrains Mono', monospace"
            fontWeight="700"
          >
            {pad(currentTime.h)}
          </text>

          {/* Стрілки */}
          <g transform="translate(50 50)">
            <g ref={hoursRef}>
              <path fill="var(--gold)" d="M -0.5 8 h 1 v -28 h -1 z"/>
            </g>
            <g ref={minutesRef}>
              <path fill="var(--text2)" d="M -0.4 8 h 0.8 v -36 h -0.8 z"/>
              <circle fill="#141414" cx="0" cy="0" r="0.6"/>
            </g>
            <g ref={secondsRef}>
              <path fill="var(--accent)" d="M -0.3 10 h 0.6 v -42 h -0.6 z"/>
              <circle strokeWidth="0.4" stroke="var(--accent)" fill="#141414" cx="0" cy="0" r="0.8"/>
            </g>
          </g>
        </svg>
      </div>

      {/* Цифровий countdown */}
      <div className={styles.countdown}>
        {raceDay ? (
          <div className={styles.raceDay}>RACE DAY! 🏁</div>
        ) : (
          <div className={styles.cdGrid}>
            <div className={styles.cdCell}>
              <span className={styles.cdNum}>{pad(timeLeft.d)}</span>
              <span className={styles.cdLabel}>ДНІВ</span>
            </div>
            <div className={styles.cdCell}>
              <span className={styles.cdNum}>{pad(timeLeft.h)}</span>
              <span className={styles.cdLabel}>ГОДИН</span>
            </div>
            <div className={`${styles.cdCell} ${styles.cdAccent}`}>
              <span className={styles.cdNum}>{pad(timeLeft.m)}</span>
              <span className={styles.cdLabel}>ХВИЛИН</span>
            </div>
            <div className={`${styles.cdCell} ${styles.cdAccent}`}>
              <span className={styles.cdNum}>{pad(timeLeft.s)}</span>
              <span className={styles.cdLabel}>СЕКУНД</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RaceCountdown

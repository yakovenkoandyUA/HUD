import React, { useEffect, useState } from 'react'
import MimirFace from '../../../assets/mimir-face.svg?react'
import styles from './CitySplash.module.css'

/**
 * CitySplash
 * ----------
 * Intro screen shown once per browser session.
 * Detailed Mimir face SVG fades in with scale bounce + glow pulse.
 * "MIMIR" label fades in at 1.2s, fade-out at 3s, unmount at 3.8s.
 *
 * Props:
 * @prop {() => void} onDone — called after exit animation completes
 */
interface CitySplashProps {
  onDone: () => void
}

const CitySplash: React.FC<CitySplashProps> = ({ onDone }) => {
  const [fading,       setFading]       = useState(false)
  const [labelVisible, setLabelVisible] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setLabelVisible(true), 1200)
    const t2 = setTimeout(() => setFading(true),       3000)
    const t3 = setTimeout(() => {
      sessionStorage.setItem('hud-city-splash', '1')
      onDone()
    }, 3800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div className={`${styles.wrap} ${fading ? styles.fading : ''}`} aria-hidden="true">
      <div className={styles.content}>

        <MimirFace className={styles.mimirFace} />

        <div className={`${styles.label} ${labelVisible ? styles.labelVisible : ''}`}>
          MIMIR
        </div>

        <div className={`${styles.dots} ${labelVisible ? styles.dotsVisible : ''}`}>
          <span className={`${styles.dot} ${styles.dot1}`} />
          <span className={`${styles.dot} ${styles.dot2}`} />
          <span className={`${styles.dot} ${styles.dot3}`} />
        </div>

      </div>
    </div>
  )
}

export default CitySplash

import React, { useEffect, useRef, useState } from 'react'
import MimirFace from '@/assets/mimir-face-detailed.svg?react'
import styles from './MimirFillIcon.module.css'

/**
 * MimirFillIcon
 * --------------
 * Лик Міміра, що "наповнюється" золотим кольором знизу-вгору — рідина
 * піднімається в криниці мудрості ("DRINK DEEP") залежно від заповнення форми.
 *
 * Props:
 * @prop {number} progress — частка заповнення 0..1
 * @prop {number} [size]   — висота іконки в px (default: 96)
 */
interface MimirFillIconProps {
  progress: number
  size?: number
}

const MimirFillIcon: React.FC<MimirFillIconProps> = ({ progress, size = 96 }) => {
  const clamped = Math.min(1, Math.max(0, progress))
  const [pulse, setPulse] = useState(false)
  const prevRef = useRef(clamped)

  useEffect(() => {
    if (clamped >= 1 && prevRef.current < 1) {
      setPulse(true)
      const t = setTimeout(() => setPulse(false), 600)
      return () => clearTimeout(t)
    }
    prevRef.current = clamped
  }, [clamped])

  const fillTop = (1 - clamped) * 100

  return (
    <div
      className={`${styles.root} ${pulse ? styles.pulse : ''}`}
      style={{ height: size, width: size * (700 / 1150) }}
    >
      <MimirFace className={styles.base} />
      <div className={styles.fillWrap} style={{ clipPath: `inset(${fillTop}% 0 0 0)` }}>
        <MimirFace className={styles.fill} />
      </div>
      <div className={styles.shimmer} style={{ top: `${fillTop}%`, opacity: clamped > 0 && clamped < 1 ? 1 : 0 }} />
    </div>
  )
}

export default MimirFillIcon

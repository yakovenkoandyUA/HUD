import React, { useState } from 'react'
import { getDriverHeadshot } from '../../../utils/f1'
import styles from './DriverAvatar.module.css'

type ImgStage = 'direct' | 'proxy' | 'initials'

/**
 * DriverAvatar
 * ------------
 * Кругле фото пілота з фолбеком: пряме фото → проксі (weserv, обхід CORS) →
 * ініціали коду пілота, якщо обидва завантаження не вдались.
 *
 * @prop {string}  driverId — Ergast driverId для getDriverHeadshot
 * @prop {string}  code     — 3-літерний код пілота (фолбек-текст)
 * @prop {boolean} [gold]   — золота рамка + більший розмір (P1 на подіумі)
 */
interface DriverAvatarProps {
  driverId: string
  code: string
  gold?: boolean
}

const DriverAvatar: React.FC<DriverAvatarProps> = ({ driverId, code, gold }) => {
  const url = getDriverHeadshot(driverId)
  const [stage, setStage] = useState<ImgStage>(url ? 'direct' : 'initials')
  const size = gold ? 64 : 52

  if (stage === 'initials' || !url) {
    return (
      <div
        className={`${styles.avatar} ${gold ? styles.avatarGold : ''}`}
        style={{ width: size, height: size }}
      >
        <span className={styles.avatarInitials}>{code}</span>
      </div>
    )
  }

  const src = stage === 'proxy'
    ? `https://images.weserv.nl/?url=${encodeURIComponent(url)}`
    : url

  return (
    <div
      className={`${styles.avatar} ${gold ? styles.avatarGold : ''}`}
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={code}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        onError={() => { if (stage === 'direct') setStage('proxy'); else setStage('initials') }}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  )
}

export default DriverAvatar

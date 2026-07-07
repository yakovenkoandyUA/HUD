import React, { useEffect, useState } from 'react'
import styles from './PwaInstallBanner.module.css'

/**
 * PwaInstallBanner
 * ----------------
 * Slide-up banner above BottomNav prompting the user to install the PWA.
 * Handles two cases:
 *   - Chrome/Android: calls native install prompt
 *   - iOS Safari: shows manual "Share → Add to Home Screen" instructions
 *
 * Props:
 * @prop {boolean}    isIOS         — show iOS instructions instead of install button
 * @prop {() => void} onInstall     — triggers browser install dialog (Chrome/Android)
 * @prop {() => void} onDismiss     — hide and store 3-day snooze
 */
interface PwaInstallBannerProps {
  isIOS: boolean
  onInstall: () => void
  onDismiss: () => void
}

const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({ isIOS, onInstall, onDismiss }) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  return (
    <div className={`${styles.banner} ${visible ? styles.bannerIn : ''}`}>
      <div className={styles.icon}>◈</div>
      <div className={styles.body}>
        <p className={styles.title}>MIMIR — встановити як додаток</p>
        {isIOS ? (
          <p className={styles.sub}>
            Натисніть <span className={styles.share}>⎙ Share</span> → «Додати на початковий екран»
          </p>
        ) : (
          <p className={styles.sub}>Працює офлайн · Без браузера · Як нативний додаток</p>
        )}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.later} onClick={onDismiss}>
          Пізніше
        </button>
        {!isIOS && (
          <button type="button" className={styles.install} onClick={onInstall}>
            Встановити
          </button>
        )}
      </div>
    </div>
  )
}

export default PwaInstallBanner

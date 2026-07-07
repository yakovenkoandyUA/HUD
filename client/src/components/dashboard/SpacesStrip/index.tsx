import React, { useEffect } from 'react'
import { useSpacesStore } from '../../../store/spacesStore'
import { useProfileStore } from '../../../store/profileStore'
import styles from './SpacesStrip.module.css'

/**
 * SpacesStrip
 * -----------
 * Горизонтальна стрічка просторів на Dashboard.
 * Показує тільки якщо є хоча б один Space або увімкнений F1.
 * Space-карти не клікабельні поки немає окремого Space detail route.
 * F1-карта є віртуальним простором (не реальний Space) і клікає на /f1.
 *
 * Props:
 * @prop {() => void} onF1Click — перехід до F1 екрану
 */
interface SpacesStripProps {
  onF1Click: () => void
}

const SpacesStrip: React.FC<SpacesStripProps> = ({ onF1Click }) => {
  const { spaces, fetchSpaces } = useSpacesStore()
  const f1Enabled = useProfileStore(s => s.activeProfile?.f1Enabled ?? false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!cancelled) await fetchSpaces()
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (spaces.length === 0 && !f1Enabled) return null

  return (
    <section className={styles.root}>
      <h2 className={styles.title}>ПРОСТОРИ</h2>
      <div className={styles.strip}>
        {spaces.map(space => (
          <div key={space.id} className={styles.card} style={{ '--space-color': space.color } as React.CSSProperties}>
            <span className={styles.emoji}>{space.emoji}</span>
            <span className={styles.name}>{space.name}</span>
          </div>
        ))}

        {f1Enabled && (
          <button type="button" className={`${styles.card} ${styles.f1Card}`} onClick={onF1Click}>
            <span className={styles.f1Icon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l4-8 4 4 3-6 4 10"/>
                <path d="M3 17h18"/>
              </svg>
            </span>
            <span className={styles.name}>F1</span>
          </button>
        )}
      </div>
    </section>
  )
}

export default SpacesStrip

import React from 'react'
import { useProfileStore } from '@/shared/store/profileStore'
import styles from './ProfilePage.module.css'

const MEDIA_TABS_CONFIG: { id: string; label: string; sub: string; wip?: boolean }[] = [
  { id: 'movie',  label: 'Фільми',  sub: 'Повнометражні' },
  { id: 'series', label: 'Серіали', sub: 'Серіали та шоу' },
  { id: 'anime',  label: 'Аніме',   sub: 'Аніме та манга' },
  { id: 'game',   label: 'Ігри',    sub: 'Відеоігри' },
  { id: 'book',   label: 'Книги',   sub: 'Бібліотека',    wip: true },
]

/**
 * MeMedia
 * -------
 * Підекран "Медіа" вкладки "Я": увімкнені вкладки watchlist (фільми/серіали/аніме/ігри/книги).
 */
const MeMedia: React.FC = () => {
  const { activeProfile, updateProfile } = useProfileStore()

  const handleMediaTabToggle = (tabId: string) => {
    const current = activeProfile?.mediaEnabledTabs ?? ['movie', 'series', 'anime', 'game']
    const next = current.includes(tabId)
      ? current.filter(t => t !== tabId)
      : [...current, tabId]
    updateProfile({ mediaEnabledTabs: next })
  }

  if (!activeProfile) return null

  return (
    <>
      {MEDIA_TABS_CONFIG.map((t, i) => {
        const enabled = (activeProfile.mediaEnabledTabs ?? ['movie', 'series', 'anime', 'game']).includes(t.id)
        return (
          <React.Fragment key={t.id}>
            {i > 0 && <div className={styles.cardDivider} />}
            <div className={styles.cardRow}>
              <div className={styles.pushInfo}>
                <span className={styles.cardRowLabel}>
                  {t.label}
                  {t.wip && <span className={styles.wipBadge}>В РОЗРОБЦІ</span>}
                </span>
                <span className={styles.pushSub}>{t.sub}</span>
              </div>
              <button
                type="button"
                className={`${styles.toggle} ${!t.wip && enabled ? styles.toggleOn : ''}`}
                onClick={() => !t.wip && handleMediaTabToggle(t.id)}
                aria-label={`${enabled ? 'Вимкнути' : 'Увімкнути'} вкладку ${t.label}`}
                aria-pressed={!t.wip && enabled}
                disabled={t.wip}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>
          </React.Fragment>
        )
      })}
    </>
  )
}

export default MeMedia

import React, { useState } from 'react'
import { useProfileStore } from '@/shared/store/profileStore'
import styles from './ProfilePage.module.css'

const MEDIA_TABS: { id: string; label: string; sub: string; wip?: boolean }[] = [
  { id: 'movie',  label: 'Фільми',  sub: 'Повнометражні' },
  { id: 'series', label: 'Серіали', sub: 'Серіали та шоу' },
  { id: 'anime',  label: 'Аніме',   sub: 'Аніме та манга' },
  { id: 'game',   label: 'Ігри',    sub: 'Відеоігри' },
  { id: 'book',   label: 'Книги',   sub: 'Бібліотека' },
]

const SPORT_MODULES: { id: string; label: string; sub: string; wip?: boolean }[] = [
  { id: 'f1',         label: 'Формула 1',  sub: 'Календар, стендінги, прогнози' },
  { id: 'football',   label: 'Футбол',     sub: 'Ліги, матчі, статистика',       wip: true },
  { id: 'basketball', label: 'Баскетбол',  sub: 'НБА, матчі, рейтинги',          wip: true },
]


const ChevronIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 5l4 4 4-4"/>
  </svg>
)

/**
 * MeModules
 * ---------
 * Підекран "Модулі" вкладки "Я": вкладені акордеони Медіа і Спорт.
 */
const MeModules: React.FC = () => {
  const { activeProfile, updateProfile } = useProfileStore()
  const [mediaOpen, setMediaOpen]   = useState(true)
  const [sportOpen, setSportOpen]   = useState(true)

  if (!activeProfile) return null

  const enabledTabs = activeProfile.mediaEnabledTabs ?? ['movie', 'series', 'anime', 'game']

  const handleMediaToggle = (tabId: string) => {
    const next = enabledTabs.includes(tabId)
      ? enabledTabs.filter(t => t !== tabId)
      : [...enabledTabs, tabId]
    updateProfile({ mediaEnabledTabs: next })
  }

  const mediaTotal       = MEDIA_TABS.filter(t => !t.wip).length
  const mediaActiveCount = MEDIA_TABS.filter(t => !t.wip && enabledTabs.includes(t.id)).length
  const sportTotal       = SPORT_MODULES.filter(m => !m.wip).length
  const sportActiveCount = activeProfile.f1Enabled ? 1 : 0

  return (
    <>
      {/* ── Медіа accordion ── */}
      <div className={styles.subAccordion}>
        <button
          type="button"
          className={styles.subAccordionBtn}
          onClick={() => setMediaOpen(v => !v)}
          aria-expanded={mediaOpen}
        >
          <span className={styles.subAccordionLabel}>Медіа</span>
          <span className={styles.subAccordionCount}>{mediaActiveCount} / {mediaTotal} активно</span>
          <span className={`${styles.subAccordionChevron} ${mediaOpen ? styles.subAccordionChevronOpen : ''}`}>
            <ChevronIcon />
          </span>
        </button>
        <div className={`${styles.subAccordionBody} ${mediaOpen ? styles.subAccordionBodyOpen : ''}`}>
          {MEDIA_TABS.map((t, i) => {
            const enabled = enabledTabs.includes(t.id)
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
                    onClick={() => !t.wip && handleMediaToggle(t.id)}
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
        </div>
      </div>

      {/* ── Спорт accordion ── */}
      <div className={styles.subAccordion}>
        <button
          type="button"
          className={styles.subAccordionBtn}
          onClick={() => setSportOpen(v => !v)}
          aria-expanded={sportOpen}
        >
          <span className={styles.subAccordionLabel}>Спорт</span>
          <span className={styles.subAccordionCount}>{sportActiveCount} / {sportTotal} активно</span>
          <span className={`${styles.subAccordionChevron} ${sportOpen ? styles.subAccordionChevronOpen : ''}`}>
            <ChevronIcon />
          </span>
        </button>
        <div className={`${styles.subAccordionBody} ${sportOpen ? styles.subAccordionBodyOpen : ''}`}>
          {SPORT_MODULES.map((m, i) => {
            const enabled = m.id === 'f1' ? (activeProfile.f1Enabled ?? false) : false
            return (
              <React.Fragment key={m.id}>
                {i > 0 && <div className={styles.cardDivider} />}
                <div className={styles.cardRow}>
                  <div className={styles.pushInfo}>
                    <span className={styles.cardRowLabel}>
                      {m.label}
                      {m.wip && <span className={styles.wipBadge}>В РОЗРОБЦІ</span>}
                    </span>
                    <span className={styles.pushSub}>{m.sub}</span>
                  </div>
                  <button
                    type="button"
                    className={`${styles.toggle} ${!m.wip && enabled ? styles.toggleOn : ''}`}
                    onClick={() => {
                      if (m.wip) return
                      if (m.id === 'f1') updateProfile({ f1Enabled: !enabled })
                    }}
                    aria-label={`${enabled ? 'Вимкнути' : 'Увімкнути'} модуль ${m.label}`}
                    aria-pressed={!m.wip && enabled}
                    disabled={m.wip}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default MeModules

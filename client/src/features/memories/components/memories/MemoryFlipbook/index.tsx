import React from 'react'
import type { Memory } from '@/features/memories/types/memory'
import styles from './MemoryFlipbook.module.css'

interface CompanionEntry {
  id: string
  name: string
  avatarUrl?: string | null
}

interface CompanionMap {
  [id: string]: CompanionEntry
}

/**
 * MemoryFlipbook
 * --------------
 * Flipbook-режим: кожен місяць — горизонтальний слайдер полароїд-карток.
 *
 * @param memories        - Відфільтровані спогади
 * @param companionMap    - id→профіль для супутників
 * @param onNavigate      - Callback при кліку на спогад
 * @param currentMonthKey - Ключ поточного місяця для dot highlight
 */
interface MemoryFlipbookProps {
  memories: Memory[]
  companionMap: CompanionMap
  onNavigate: (id: string) => void
  currentMonthKey: string
}

function groupByMonth(memories: Memory[]): [string, Memory[]][] {
  const groups: Record<string, Memory[]> = {}
  ;[...memories]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .forEach(m => {
      const key = new Date(m.date)
        .toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })
        .replace(/ р\./i, '')
        .toUpperCase()
      if (!groups[key]) groups[key] = []
      groups[key].push(m)
    })
  return Object.entries(groups)
}

function coverSrc(m: Memory): string | null {
  return m.coverUrl || m.photos[0]?.url || null
}

function tripDateLabel(m: Memory): string {
  if (m.isTrip && m.dateEnd) {
    const [y1, m1, d1] = m.date.split('-').map(Number)
    const [, m2, d2] = m.dateEnd.split('-').map(Number)
    const days = Math.round(
      (Date.UTC(Number(m.dateEnd.split('-')[0]), m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000
    ) + 1
    const endDate = new Date(m.dateEnd)
    return `${d1}–${d2} ${endDate.toLocaleDateString('uk-UA', { month: 'short' })} · ${days}д`
  }
  return new Date(m.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
}

function titleGradient(title: string): string {
  let hash = 0
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0
  const hue = Math.abs(hash) % 360
  return `linear-gradient(155deg, hsl(${hue},28%,21%) 0%, hsl(${(hue + 45) % 360},22%,15%) 100%)`
}

const MemoryFlipbook: React.FC<MemoryFlipbookProps> = ({
  memories,
  companionMap,
  onNavigate,
  currentMonthKey,
}) => {
  const grouped = groupByMonth(memories)

  return (
    <div className={styles.flipbook}>
      {grouped.map(([monthLabel, items]) => (
        <div key={monthLabel} className={styles.monthSection}>
          <div className={styles.monthHeader}>
            <div className={`${styles.monthDot} ${monthLabel === currentMonthKey ? styles.monthDotCurrent : ''}`} />
            <span className={styles.monthLabel}>{monthLabel}</span>
            <div className={styles.monthLine} />
            <span className={styles.monthCount}>{items.length}</span>
          </div>

          <div className={styles.slider}>
            {items.map(m => {
              const cover = coverSrc(m)
              const companions = (m.withProfiles ?? []).slice(0, 3)

              return (
                <article
                  key={m.id}
                  className={styles.polaroid}
                  data-stacked={m.photos.length >= 5 ? '' : undefined}
                  onClick={() => onNavigate(m.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && onNavigate(m.id)}
                >
                  {/* Photo frame */}
                  <div className={styles.photoFrame}>
                    {cover ? (
                      <img src={cover} alt={m.title} className={styles.photo} loading="lazy" />
                    ) : (
                      <div className={styles.photoPlaceholder} style={{ background: titleGradient(m.title) }} />
                    )}

                    {/* Photo count — bottom-left */}
                    {m.photos.length > 0 && (
                      <div className={styles.photoBadge}>
                        <svg width="9" height="9" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <rect x="1.5" y="2.5" width="11" height="9" rx="1.3" stroke="currentColor" strokeWidth="1.3"/>
                          <circle cx="4.7" cy="5.5" r="1" fill="currentColor"/>
                          <path d="M2 9.5l3-3 2 2 2.5-3 2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {m.photos.length}
                      </div>
                    )}

                    {/* Companions — bottom-right */}
                    {companions.length > 0 && (
                      <div className={styles.companions}>
                        {companions.map(id => {
                          const c = companionMap[id]
                          if (!c) return null
                          return c.avatarUrl
                            ? <img key={id} src={c.avatarUrl} alt={c.name} className={styles.companionAvatar} title={c.name} />
                            : <span key={id} className={styles.companionInitial} title={c.name}>{c.name[0]?.toUpperCase()}</span>
                        })}
                      </div>
                    )}

                    {/* Owner badge — top-right */}
                    {m.ownerName && (
                      <div className={styles.ownerBadge} title={m.ownerName}>
                        {m.ownerAvatarUrl
                          ? <img src={m.ownerAvatarUrl} alt={m.ownerName} className={styles.ownerAvatar} />
                          : <span className={styles.ownerInitial}>{m.ownerName[0]}</span>
                        }
                      </div>
                    )}
                  </div>

                  {/* Caption */}
                  <div className={styles.caption}>
                    <p className={styles.captionTitle}>{m.title}</p>
                    <p className={styles.captionDate}>
                      {m.location
                        ? m.location.split(',')[0]
                        : tripDateLabel(m)
                      }
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default MemoryFlipbook

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useWeather } from '@/shared/hooks/useWeather'
import { useNavigate } from 'react-router-dom'
import MoodIcon from './MoodIcon'
import MoodCalendar from '../MoodCalendar'
import MoodDayDetail from '../MoodDayDetail'
import { useMoodStore } from '@/features/profile/store/moodStore'
import { useSprintStore } from '@/features/sprint/store/sprintStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { useModalHistory } from '@/shared/hooks/useModalHistory'
import { isRecurring, isRoutineDueOnDay } from '@/features/sprint/utils/sprint'
import type { UnifiedTodo } from '@/shared/types'
import styles from './DayOverlay.module.css'

const MOOD_LABELS: Record<number, string> = {
  1: 'Важко',
  2: 'Так собі',
  3: 'Нормально',
  4: 'Добре',
  5: 'Чудово',
}

function toLocalIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getCurrentSlot(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours()
  if (h >= 18) return 'evening'
  if (h >= 12) return 'afternoon'
  return 'morning'
}


/**
 * DayOverlay
 * ----------
 * Full-screen overlay "Мій день" — звички на сьогодні по слотах,
 * погода, трекер настрою з нотаткою, спільний настрій, місячний heatmap.
 *
 * Props:
 * @prop {() => void} onClose — закрити overlay
 */
interface DayOverlayProps {
  onClose: () => void
}

const MOOD_COLORS: Record<number, string> = {
  1: '#c0392b',
  2: '#e67e22',
  3: '#d4ac0d',
  4: '#27ae60',
  5: '#1e8449',
}

const DayOverlay: React.FC<DayOverlayProps> = ({ onClose }) => {
  const navigate = useNavigate()
  const { fetchLogs, fetchFamilyMoods, setMood, setNote, todayScore, todayNote, logs, familyMoods } = useMoodStore()
  const { items, fetchItems } = useSprintStore()
  const { activeProfile } = useProfileStore()

  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)
  const sheetRef   = useSwipeToDismiss(onClose, { overlayRef, bodyRef })
  useModalHistory(onClose, true)

  const weather   = useWeather(activeProfile?.city)
  const [noteValue, setNoteValue] = useState('')
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [flashScore, setFlashScore] = useState<1|2|3|4|5|null>(null)
  const [popKey, setPopKey]         = useState(0)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const today        = toLocalIso(new Date())
  const currentSlot  = getCurrentSlot()
  const currentMood  = todayScore()

  // Sync note textarea when logs load
  useEffect(() => {
    setNoteValue(todayNote() ?? '')
  }, [logs]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load mood (30 days) + sprint items + shared moods
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const from = toLocalIso(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      await fetchLogs(from, today)
      if (!cancelled) {
        fetchItems()
        fetchFamilyMoods()
      }
    }
    load()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Routines due today only
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  const routines = items.filter(i => isRecurring(i) && isRoutineDueOnDay(i, todayDate))
  const isDoneToday = (item: UnifiedTodo) => item.completionLog?.includes(today) ?? false

  const slots = {
    morning:   routines.filter(r => r.timeOfDay === 'morning'),
    afternoon: routines.filter(r => r.timeOfDay === 'afternoon'),
    evening:   routines.filter(r => r.timeOfDay === 'evening'),
    unset:     routines.filter(r => !r.timeOfDay),
  }

  const slotConfig = [
    { key: 'morning'   as const, label: 'Ранок', emoji: '🌅' },
    { key: 'afternoon' as const, label: 'День',  emoji: '☀️' },
    { key: 'evening'   as const, label: 'Вечір', emoji: '🌙' },
  ]

  const handleMoodClick = useCallback((score: 1 | 2 | 3 | 4 | 5) => {
    if (currentMood === score) return
    setMood(today, score)
    setFlashScore(score)
    setPopKey(k => k + 1)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlashScore(null), 4000)
  }, [currentMood, today, setMood])

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setNoteValue(val)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => setNote(today, val), 800)
  }

  const handleRoutineClick = (_item: UnifiedTodo) => {
    navigate('/sprint')
    onClose()
  }

  return (
    <>
    <div ref={overlayRef} className={styles.overlay} onClick={onClose}>
      <div ref={sheetRef} className={styles.sheet} onClick={e => e.stopPropagation()}>
        {flashScore !== null && (
          <div
            key={flashScore}
            className={styles.moodAccentBar}
            style={{ background: MOOD_COLORS[flashScore] }}
          />
        )}
        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.title}>МІЙ ДЕНЬ</span>
            <span className={styles.date}>{new Date().toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          {weather && (
            <div className={styles.weather}>
              <img src={weather.icon} alt={weather.desc} className={styles.weatherIcon} />
              <span className={styles.weatherTemp}>{weather.temp}°</span>
            </div>
          )}
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div ref={bodyRef} className={styles.body}>
          {/* ── Mood tracker ── */}
          <section className={styles.section}>
            <p className={styles.sectionLabel}>НАСТРІЙ</p>
            <div className={styles.moodRow}>
              {([1, 2, 3, 4, 5] as const).map(score => (
                <button
                  key={score}
                  type="button"
                  className={`${styles.moodBtn} ${currentMood === score ? styles.moodBtnActive : ''}`}
                  style={currentMood === score ? { '--mood-color': MOOD_COLORS[score] } as React.CSSProperties : undefined}
                  onClick={() => handleMoodClick(score)}
                  title={MOOD_LABELS[score]}
                >
                  <MoodIcon score={score} active={currentMood === score} size={38} />
                  <span className={styles.moodLabel}>{MOOD_LABELS[score]}</span>
                </button>
              ))}
            </div>

            {currentMood && (
              <textarea
                className={styles.moodNote}
                placeholder="Кілька слів про цей день..."
                value={noteValue}
                onChange={handleNoteChange}
                rows={2}
              />
            )}
          </section>

          {/* ── Family moods ── */}
          {familyMoods.length > 0 && (
            <section className={styles.section}>
              <p className={styles.sectionLabel}>НАСТРІЙ СІМ'Ї</p>
              <div className={styles.familyMoodList}>
                {familyMoods.map(fm => (
                  <div key={fm.userId} className={styles.familyMoodRow}>
                    {fm.avatarUrl ? (
                      <img src={fm.avatarUrl} className={styles.familyAvatar} alt={fm.name} />
                    ) : (
                      <span className={styles.familyAvatarInitial}>{fm.name[0]?.toUpperCase()}</span>
                    )}
                    <div className={styles.familyMoodInfo}>
                      <span className={styles.familyName}>{fm.name}</span>
                      {fm.note && <span className={styles.familyNote}>{fm.note}</span>}
                    </div>
                    <MoodIcon score={fm.score} active={false} size={28} />
                    <span className={styles.familyMoodLabel}>{MOOD_LABELS[fm.score]}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Routines by slot ── */}
          {slotConfig.map(({ key, label, emoji }) => {
            const list = slots[key]
            const isCurrent = key === currentSlot
            if (list.length === 0) return null
            return (
              <section key={key} className={`${styles.section} ${isCurrent ? styles.sectionCurrent : ''}`}>
                <p className={styles.sectionLabel}>
                  {emoji} {label.toUpperCase()}
                  {isCurrent && <span className={styles.nowBadge}>зараз</span>}
                </p>
                <div className={styles.routineList}>
                  {list.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className={`${styles.routineRow} ${isDoneToday(item) ? styles.routineDone : ''}`}
                      onClick={() => handleRoutineClick(item)}
                    >
                      <span className={`${styles.routineCheck} ${isDoneToday(item) ? styles.routineCheckDone : ''}`}>
                        {isDoneToday(item) && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                      <span className={styles.routineTitle}>{item.title}</span>
                    </button>
                  ))}
                </div>
              </section>
            )
          })}

          {slots.unset.length > 0 && (
            <section className={styles.section}>
              <p className={styles.sectionLabel}>РУТИНИ БЕЗ СЛОТУ</p>
              <div className={styles.routineList}>
                {slots.unset.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.routineRow} ${isDoneToday(item) ? styles.routineDone : ''}`}
                    onClick={() => handleRoutineClick(item)}
                  >
                    <span className={`${styles.routineCheck} ${isDoneToday(item) ? styles.routineCheckDone : ''}`}>
                      {isDoneToday(item) && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    <span className={styles.routineTitle}>{item.title}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {routines.length === 0 && (
            <p className={styles.emptyHint}>Немає звичок на сьогодні.</p>
          )}

          {/* ── Mood calendar ── */}
          <section className={`${styles.section} ${styles.sectionCalendar}`}>
            <MoodCalendar logs={logs} popKey={popKey} onSelectDate={setSelectedDate} />
          </section>
        </div>
      </div>
    </div>

      <MoodDayDetail date={selectedDate} onClose={() => setSelectedDate(null)} />
    </>
  )
}

export default DayOverlay

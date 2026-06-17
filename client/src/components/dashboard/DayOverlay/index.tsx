import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import MoodIcon from './MoodIcon'
import MoodCalendar from '../MoodCalendar'
import { useMoodStore } from '../../../store/moodStore'
import { useSprintStore } from '../../../store/sprintStore'
import { useProfileStore } from '../../../store/profileStore'
import { useSwipeToDismiss } from '../../../hooks/useSwipeToDismiss'
import { useModalHistory } from '../../../hooks/useModalHistory'
import { isRecurring, isRoutineDueOnDay } from '../../../utils/sprint'
import type { UnifiedTodo } from '../../../types'
import styles from './DayOverlay.module.css'

const MOOD_LABELS: Record<number, string> = {
  1: 'Важко',
  2: 'Так собі',
  3: 'Нормально',
  4: 'Добре',
  5: 'Чудово',
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getCurrentSlot(profile: { morningStart?: number; afternoonStart?: number; eveningStart?: number } | null): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours()
  const afternoon = profile?.afternoonStart ?? 12
  const evening   = profile?.eveningStart   ?? 18
  if (h >= evening)   return 'evening'
  if (h >= afternoon) return 'afternoon'
  return 'morning'
}

interface WeatherData {
  temp: string
  desc: string
  icon: string
}

/**
 * DayOverlay
 * ----------
 * Full-screen overlay "Мій день" — рутини на сьогодні по слотах,
 * погода, трекер настрою з нотаткою, сімейний настрій, місячний heatmap.
 *
 * Props:
 * @prop {() => void} onClose — закрити overlay
 */
interface DayOverlayProps {
  onClose: () => void
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

  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [noteValue, setNoteValue] = useState('')
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const today        = toIso(new Date())
  const currentSlot  = getCurrentSlot(activeProfile)
  const currentMood  = todayScore()

  // Sync note textarea when logs load
  useEffect(() => {
    setNoteValue(todayNote() ?? '')
  }, [logs]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load mood (30 days) + sprint items + family moods
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const from = toIso(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      await fetchLogs(from, today)
      if (!cancelled) {
        fetchItems()
        fetchFamilyMoods()
      }
    }
    load()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Weather via wttr.in
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const city = activeProfile?.city?.trim()
      let url = ''
      if (city) {
        url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`
      } else if (navigator.geolocation) {
        await new Promise<void>(resolve => {
          navigator.geolocation.getCurrentPosition(
            pos => { url = `https://wttr.in/${pos.coords.latitude},${pos.coords.longitude}?format=j1`; resolve() },
            () => resolve(),
            { timeout: 5000 }
          )
        })
      }
      if (!url || cancelled) return
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
        if (!res.ok || cancelled) return
        const data = await res.json() as {
          current_condition: Array<{ temp_C: string; weatherDesc: Array<{ value: string }> }>
        }
        const cc = data.current_condition?.[0]
        if (cc && !cancelled) {
          setWeather({
            temp: cc.temp_C,
            desc: cc.weatherDesc?.[0]?.value ?? '',
            icon: getWeatherEmoji(cc.weatherDesc?.[0]?.value ?? ''),
          })
        }
      } catch {
        // silent fail
      }
    }
    load()
    return () => { cancelled = true }
  }, [activeProfile?.city]) // eslint-disable-line react-hooks/exhaustive-deps

  function getWeatherEmoji(desc: string): string {
    const d = desc.toLowerCase()
    if (d.includes('thunder')) return '⛈'
    if (d.includes('snow'))    return '❄️'
    if (d.includes('rain') || d.includes('drizzle')) return '🌧'
    if (d.includes('cloud') || d.includes('overcast')) return '☁️'
    if (d.includes('fog') || d.includes('mist'))       return '🌫'
    if (d.includes('sunny') || d.includes('clear'))    return '☀️'
    return '🌤'
  }

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
    <div ref={overlayRef} className={styles.overlay} onClick={onClose}>
      <div ref={sheetRef} className={styles.sheet} onClick={e => e.stopPropagation()}>
        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.title}>МІЙ ДЕНЬ</span>
            <span className={styles.date}>{new Date().toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          {weather && (
            <div className={styles.weather}>
              <span className={styles.weatherIcon}>{weather.icon}</span>
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
            <p className={styles.emptyHint}>Немає рутин на сьогодні.</p>
          )}

          {/* ── Mood calendar ── */}
          <section className={`${styles.section} ${styles.sectionCalendar}`}>
            <MoodCalendar logs={logs} />
          </section>
        </div>
      </div>
    </div>
  )
}

export default DayOverlay

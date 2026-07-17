import { useState } from 'react'
import { getCurrentWeekStart } from '../utils/sprint'
import { addWeeks } from '../components/sprint/WeekHeader'

/**
 * useSprintCalendar
 * -----------------
 * Week/day navigation and calendar mode for the Sprint screen.
 * Persists calendar mode (week|month) in localStorage.
 *
 * @param initialDay - optional day to pre-select (from location.state)
 */
export function useSprintCalendar(initialDay?: string) {
  const _td = new Date()
  const todayStr = `${_td.getFullYear()}-${String(_td.getMonth() + 1).padStart(2, '0')}-${String(_td.getDate()).padStart(2, '0')}`

  const currentWeekStart = getCurrentWeekStart()

  const [selectedDay, setSelectedDay] = useState(initialDay ?? todayStr)
  const [weekStart,   setWeekStart]   = useState(currentWeekStart)
  const [weekExpanded, setWeekExpanded] = useState(false)
  const [calendarMode, setCalendarMode] = useState<'week' | 'month'>(
    () => (localStorage.getItem('sprint-calendar-mode') as 'week' | 'month') || 'week'
  )

  const isCurrentWeek = weekStart === currentWeekStart

  const toggleCalendarMode = () => {
    const next = calendarMode === 'week' ? 'month' : 'week'
    setCalendarMode(next)
    localStorage.setItem('sprint-calendar-mode', next)
  }

  const goToPrevWeek = () => {
    const prev = addWeeks(weekStart, -1)
    setWeekStart(prev)
    setSelectedDay(prev)
  }

  const goToNextWeek = () => {
    const next = addWeeks(weekStart, 1)
    setWeekStart(next)
    setSelectedDay(next === currentWeekStart ? todayStr : next)
  }

  return {
    todayStr,
    selectedDay,
    setSelectedDay,
    weekStart,
    isCurrentWeek,
    weekExpanded,
    setWeekExpanded,
    calendarMode,
    toggleCalendarMode,
    goToPrevWeek,
    goToNextWeek,
  }
}

import type { UnifiedTodo } from '@/shared/types'

export function isRecurring(task: UnifiedTodo): boolean {
  return !!(task.repeat && task.repeat !== 'none')
}

export function isRegular(task: UnifiedTodo): boolean {
  return !task.repeat || task.repeat === 'none'
}

export function getCurrentWeekStart(): string {
  const d = new Date()
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() + 6) % 7)
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function calcStreak(task: UnifiedTodo): number {
  if (!isRecurring(task)) return 0
  const log = new Set(task.completionLog ?? [])
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const cursor = new Date(today)
  // If today is due but not yet done — start counting from yesterday
  if (isRoutineDueOnDay(task, today) && !log.has(toIso(today))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  for (let i = 0; i < 365; i++) {
    if (isRoutineDueOnDay(task, cursor)) {
      if (log.has(toIso(cursor))) {
        streak++
      } else {
        break
      }
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function calcRecord(task: UnifiedTodo): number {
  if (!isRecurring(task)) return 0
  const log = new Set(task.completionLog ?? [])
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let record = 0
  let current = 0
  for (let i = 365 * 2; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    if (isRoutineDueOnDay(task, d)) {
      if (log.has(toIso(d))) {
        current++
        if (current > record) record = current
      } else {
        current = 0
      }
    }
  }
  return record
}

export function calcWeekRate(task: UnifiedTodo): number {
  if (!isRecurring(task)) return 0
  const log = new Set(task.completionLog ?? [])
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let due = 0
  let done = 0
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    if (isRoutineDueOnDay(task, d)) {
      due++
      if (log.has(toIso(d))) done++
    }
  }
  return due === 0 ? 0 : Math.round((done / due) * 100)
}

export function calcMonthRate(task: UnifiedTodo): number {
  if (!isRecurring(task)) return 0
  const log = new Set(task.completionLog ?? [])
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let due = 0
  let done = 0
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    if (isRoutineDueOnDay(task, d)) {
      due++
      if (log.has(toIso(d))) done++
    }
  }
  return due === 0 ? 0 : Math.round((done / due) * 100)
}

export type MonthCell = {
  day: number
  iso: string
  scheduled: boolean
  done: boolean
  future: boolean
  today: boolean
  empty: boolean
}

export function buildMonthGrid(task: UnifiedTodo, year: number, month: number): MonthCell[][] {
  const log = new Set(task.completionLog ?? [])
  const todayD = new Date()
  todayD.setHours(0, 0, 0, 0)
  const todayIso = toIso(todayD)

  const firstDay = new Date(year, month - 1, 1)
  const lastDate = new Date(year, month, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7 // Mon=0

  const cells: MonthCell[] = []

  for (let i = 0; i < startOffset; i++) {
    cells.push({ day: 0, iso: '', scheduled: false, done: false, future: false, today: false, empty: true })
  }

  for (let d = 1; d <= lastDate; d++) {
    const date = new Date(year, month - 1, d)
    const iso = toIso(date)
    const future = date > todayD
    cells.push({
      day: d,
      iso,
      scheduled: isRoutineDueOnDay(task, date),
      done: log.has(iso),
      future,
      today: iso === todayIso,
      empty: false,
    })
  }

  while (cells.length % 7 !== 0) {
    cells.push({ day: 0, iso: '', scheduled: false, done: false, future: false, today: false, empty: true })
  }

  const weeks: MonthCell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}

export interface LabelDueSuggestion {
  dueOffsetDays: number
  sampleSize:    number
}

/**
 * Евристична підказка дедлайну для нової задачі — медіанна відстань
 * (в днях) між createdAt і dueDate серед минулих задач з тим самим лейблом.
 * null якщо даних замало (< 2 задач) для надійної підказки.
 */
export function suggestDueFromLabels(tasks: UnifiedTodo[], labelIds: string[]): LabelDueSuggestion | null {
  if (labelIds.length === 0) return null
  const labelSet = new Set(labelIds)
  const offsets: number[] = []

  for (const t of tasks) {
    if (!t.dueDate || !t.createdAt || !t.labels?.length) continue
    if (!t.labels.some(l => labelSet.has(l.id))) continue
    const created = new Date(t.createdAt).getTime()
    const due     = new Date(t.dueDate).getTime()
    const diffDays = Math.round((due - created) / 86_400_000)
    if (diffDays >= 0) offsets.push(diffDays)
  }

  if (offsets.length < 2) return null
  offsets.sort((a, b) => a - b)
  const mid = Math.floor(offsets.length / 2)
  const dueOffsetDays = offsets.length % 2 ? offsets[mid] : Math.round((offsets[mid - 1] + offsets[mid]) / 2)
  return { dueOffsetDays, sampleSize: offsets.length }
}

export function isRoutineDueOnDay(task: UnifiedTodo, day: Date): boolean {
  if (isRegular(task)) return false

  const anchorIso = task.repeatStartDate ?? task.createdAt?.slice(0, 10)
  if (anchorIso) {
    const anchor = parseIso(anchorIso)
    const d = new Date(day)
    d.setHours(0, 0, 0, 0)
    if (d < anchor) return false
  }

  if (task.repeat === 'daily') return true
  if (task.repeat === 'weekly') {
    if (!task.nextDue) return false
    return day.getDay() === parseIso(task.nextDue).getDay()
  }
  if (task.repeat === 'monthly') {
    const dom = task.repeatDay ?? (task.nextDue ? parseInt(task.nextDue.split('-')[2], 10) : null)
    return dom !== null && day.getDate() === dom
  }
  if (task.repeat === 'custom' && task.repeatConfig) {
    const { unit, weekDays, interval } = task.repeatConfig
    if (unit === 'week' && weekDays && weekDays.length > 0) {
      return weekDays.includes((day.getDay() + 6) % 7)
    }
    if (anchorIso && interval && interval > 0) {
      const anchor = parseIso(anchorIso)
      const d = new Date(day)
      d.setHours(0, 0, 0, 0)
      if (unit === 'day') {
        const diffDays = Math.round((d.getTime() - anchor.getTime()) / 86400000)
        return diffDays % interval === 0
      }
      if (unit === 'month') {
        const monthDiff = (d.getFullYear() - anchor.getFullYear()) * 12 + (d.getMonth() - anchor.getMonth())
        return monthDiff >= 0 && monthDiff % interval === 0 && d.getDate() === anchor.getDate()
      }
      if (unit === 'year') {
        const yearDiff = d.getFullYear() - anchor.getFullYear()
        return yearDiff >= 0 && yearDiff % interval === 0 &&
          d.getMonth() === anchor.getMonth() && d.getDate() === anchor.getDate()
      }
    }
  }
  return false
}

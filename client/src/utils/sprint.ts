import type { UnifiedTodo } from '../types'

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

export function isRoutineDueOnDay(task: UnifiedTodo, day: Date): boolean {
  if (isRegular(task)) return false
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
    const { unit, weekDays } = task.repeatConfig
    if (unit === 'week' && weekDays && weekDays.length > 0) {
      return weekDays.includes((day.getDay() + 6) % 7)
    }
  }
  return false
}

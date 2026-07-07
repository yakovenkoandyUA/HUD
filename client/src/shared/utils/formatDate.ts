/**
 * formatDateUA
 * ------------
 * Форматує ISO date string у читабельний короткий Ukrainian формат.
 *
 * @param {string} isoDate — дата у форматі YYYY-MM-DD
 * @returns {string} — наприклад "Пн, 26 трав." або "Пн, 26 трав. 2025" (інший рік)
 */

const MONTHS_SHORT_UA = [
  'січ.','лют.','бер.','квіт.','трав.','черв.',
  'лип.','серп.','вер.','жовт.','лист.','груд.',
]

const DAYS_SHORT_UA = ['Нд','Пн','Вт','Ср','Чт','Пт','Сб']

export function formatDateUA(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dayName = DAYS_SHORT_UA[date.getDay()]
  const month   = MONTHS_SHORT_UA[m - 1]
  const currentYear = new Date().getFullYear()
  return y === currentYear
    ? `${dayName}, ${d} ${month}`
    : `${dayName}, ${d} ${month} ${y}`
}

/**
 * isOverdue
 * ---------
 * Повертає true якщо дата у минулому (до сьогодні включно не рахується).
 */
export function isOverdue(isoDate: string): boolean {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date  = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date.getTime() < today.getTime()
}

/**
 * isTodayOrTomorrow
 * -----------------
 * Повертає 'today' / 'tomorrow' або null.
 */
export function isTodayOrTomorrow(isoDate: string): 'today' | 'tomorrow' | null {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.getTime() === today.getTime())    return 'today'
  if (date.getTime() === tomorrow.getTime()) return 'tomorrow'
  return null
}

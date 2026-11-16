const KYIV_CLOCK = new Intl.DateTimeFormat('en', {
  timeZone: 'Europe/Kyiv',
  timeZoneName: 'longOffset',
})
const KYIV_DATE = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Kyiv', dateStyle: 'short' })

/** ISO calendar date in Kyiv, independent of the server's time zone. */
export function kyivDate(timestamp = Date.now()): string {
  return KYIV_DATE.format(timestamp)
}

function offsetAt(timestamp: number): number {
  const offset = KYIV_CLOCK.formatToParts(timestamp).find(part => part.type === 'timeZoneName')?.value
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(offset ?? '')
  if (!match) return 0
  return (Number(match[2]) * 60 + Number(match[3])) * 60000 * (match[1] === '-' ? -1 : 1)
}

function kyivToUtc(local: number): number {
  const day = 86400000
  const candidates = [...new Set([offsetAt(local - day), offsetAt(local + day)])]
    .map(offset => local - offset)
    .sort((a, b) => a - b)
  // During the autumn overlap use the first occurrence. During the spring
  // gap move forward by the size of the gap, like a local Date constructor.
  return candidates.find(candidate => candidate + offsetAt(candidate) === local)
    ?? candidates[candidates.length - 1]
}

function wallTime(date: string, time: string): number | null {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(`${date}T00:00:00Z`) : NaN
  if (!Number.isFinite(day) || new Date(day).toISOString().slice(0, 10) !== date) return null
  const clock = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time)
  if (!clock) return null
  return day + (Number(clock[1]) * 60 + Number(clock[2])) * 60000
}

/** Converts a Kyiv calendar date and clock time to an epoch timestamp. */
export function kyivTime(date: string, time: string): number | null {
  const local = wallTime(date, time)
  return local === null ? null : kyivToUtc(local)
}

/** Resolves date-only and timed reminders in Kyiv local time. */
export function questReminderTime(
  date: string,
  time: string | null | undefined,
  reminder: { amount: number; unit: string },
): { dueAt: number; reminderAt: number } | null {
  const local = wallTime(date, time || '09:00')
  if (local === null || !Number.isInteger(reminder.amount) || reminder.amount < 1 || reminder.amount > 999) return null
  const dueAt = kyivToUtc(local)
  const { amount, unit } = reminder
  switch (unit) {
    case 'minutes': return { dueAt, reminderAt: dueAt - amount * 60000 }
    case 'hours': return { dueAt, reminderAt: dueAt - amount * 3600000 }
    case 'days': return { dueAt, reminderAt: kyivToUtc(local - amount * 86400000) }
    case 'weeks': return { dueAt, reminderAt: kyivToUtc(local - amount * 7 * 86400000) }
    default: return null
  }
}

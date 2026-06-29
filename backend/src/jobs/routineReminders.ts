import cron from 'node-cron'
import { sendPushToUser } from '../services/webpush'
import SprintTask, { ISprintTask } from '../models/SprintTask'

function isRoutineDueToday(task: ISprintTask, today: Date): boolean {
  if (!task.repeat || task.repeat === 'none') return false
  if (task.repeat === 'daily') return true
  if (task.repeat === 'weekly') {
    if (!task.nextDue) return false
    const [y, m, d] = task.nextDue.split('-').map(Number)
    return today.getDay() === new Date(y, m - 1, d).getDay()
  }
  if (task.repeat === 'monthly') {
    const dom = task.repeatDay ?? (task.nextDue ? parseInt(task.nextDue.split('-')[2], 10) : null)
    return dom !== null && today.getDate() === dom
  }
  if (task.repeat === 'custom' && task.repeatConfig) {
    const cfg = task.repeatConfig as { unit?: string; weekDays?: number[] }
    if (cfg.unit === 'week' && cfg.weekDays?.length) {
      return cfg.weekDays.includes((today.getDay() + 6) % 7)
    }
  }
  return false
}

// 09:00 UTC = 12:00 Kyiv (UTC+3)
cron.schedule('0 9 * * *', async () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  try {
    const routines = await SprintTask.find({
      repeat: { $exists: true, $ne: 'none' },
      done: false,
    })

    const byUser: Record<string, string[]> = {}
    for (const task of routines) {
      if (!isRoutineDueToday(task, today)) continue
      if (task.completionHistory?.includes(todayIso)) continue
      if (!byUser[task.userId]) byUser[task.userId] = []
      byUser[task.userId].push(task.title)
    }

    for (const [userId, titles] of Object.entries(byUser)) {
      const count = titles.length
      const body = count === 1
        ? `«${titles[0]}» — не виконано сьогодні`
        : `${count} звичок не виконано сьогодні`
      await sendPushToUser(userId, {
        title: '⏰ Нагадування про звички',
        body,
        url: '/sprint',
      })
    }

    console.log(`[Push] Routine reminders sent to ${Object.keys(byUser).length} users`)
  } catch (err) {
    console.error('[Push] Routine reminder error:', err)
  }
})

console.log('📅 Routine reminders scheduled (09:00 UTC)')

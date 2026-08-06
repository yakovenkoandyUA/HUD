import cron from 'node-cron'
import { sendPushToUser } from '../services/webpush'
import { User } from '../models/User'
import MoodLog from '../models/MoodLog'

// Kyiv-дата через Intl (не фіксований +3h — коректно і в UTC+2 зимою, і в UTC+3 влітку)
function kyivIso(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv' }).format(d)
}

// ── Evening recap push — 21:00 Kyiv (18:00 UTC) ───────────────────────────
cron.schedule('0 18 * * *', async () => {
  try {
    // MoodLog.date зберігається за локальною датою пристрою юзера (не обов'язково Kyiv) —
    // тому "вже відмітив" перевіряємо у вікні ±1 день від Kyiv-сьогодні, щоб не спамити
    // юзерів з іншим часовим поясом пристрою, які вже зафіксували настрій.
    const dateWindow = [kyivIso(-1), kyivIso(0), kyivIso(1)]
    const [users, loggedRecently] = await Promise.all([
      User.find({}, '_id'),
      MoodLog.find({ date: { $in: dateWindow } }, 'userId'),
    ])
    const loggedSet = new Set(loggedRecently.map(l => l.userId))
    let sent = 0
    for (const user of users) {
      if (loggedSet.has(user._id.toString())) continue
      await sendPushToUser(user._id.toString(), {
        title: 'День добігає кінця',
        body:  'Як себе почуваєш? Відзнач настрій і зафіксуй підсумки',
        url:   '/',
        tag:   'day-recap',
      })
      sent++
    }
    console.log(`[Push] Day recap sent to ${sent}/${users.length} users`)
  } catch (err) {
    console.error('[Push] Day recap error:', err)
  }
})

console.log('📅 Day reminder job scheduled (21:00 Kyiv)')

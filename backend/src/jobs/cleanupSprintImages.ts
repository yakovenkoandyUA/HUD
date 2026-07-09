import cron from 'node-cron'
import SprintTask from '../models/SprintTask'
import { destroyImages } from '../utils/cloudinary'

/**
 * Щоденно о 03:00 UTC видаляє картинки з виконаних квестів/покупок
 * старших за 30 днів. Самі задачі не видаляються — тільки imageUrls/imagePublicIds.
 */
export function startCleanupSprintImages(): void {
  cron.schedule('0 3 * * *', async () => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)

    const tasks = await SprintTask.find({
      done: true,
      updatedAt: { $lt: cutoff },
      'imagePublicIds.0': { $exists: true },
    }).select('_id imagePublicIds')

    if (!tasks.length) return

    const allPublicIds = tasks.flatMap(t => t.imagePublicIds ?? []).filter(Boolean)
    await destroyImages(allPublicIds)

    await SprintTask.updateMany(
      { _id: { $in: tasks.map(t => t._id) } },
      { $set: { imageUrls: [], imagePublicIds: [] } },
    )

    console.log(`[cleanupSprintImages] cleaned ${tasks.length} tasks, ${allPublicIds.length} images`)
  })
}

/**
 * migrateRepeatField.ts
 * ---------------------
 * One-time migration: sets `repeat: 'none'` on all SprintTask and TodoItem
 * documents that don't have the field yet (created before repeat support).
 *
 * Run once on production:
 *   railway run npx ts-node src/scripts/migrateRepeatField.ts
 */
import 'dotenv/config'
import mongoose from 'mongoose'

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set')
  await mongoose.connect(uri)

  const db = mongoose.connection.db!

  const sprintResult = await db.collection('sprinttasks').updateMany(
    { repeat: { $exists: false } },
    { $set: { repeat: 'none', type: 'sprint' } },
  )
  console.log(`SprintTask: updated ${sprintResult.modifiedCount} docs`)

  const todoResult = await db.collection('todoitems').updateMany(
    { repeat: { $exists: false } },
    { $set: { repeat: 'none' } },
  )
  console.log(`TodoItem: updated ${todoResult.modifiedCount} docs`)

  await mongoose.disconnect()
  console.log('Done')
}

main().catch(err => { console.error(err); process.exit(1) })

/**
 * migrateToKotka.ts
 * -----------------
 * Re-assigns all existing documents from the old userId='admin' string
 * (used before multi-profile) to Котька's real MongoDB ObjectId.
 *
 * Run AFTER seedUsers.ts:
 *   railway run npx ts-node src/scripts/migrateToKotka.ts
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { User } from '../models/User'

const COLLECTIONS = [
  'transactions',
  'sprinttasks',
  'todoitems',
  'recipes',
  'watchlistitems',
  'savingsgoals',
  'lessons',
]

async function migrate(): Promise<void> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set')

  await mongoose.connect(uri)
  console.log('✅ Connected to MongoDB')

  const kotka = await User.findOne({ username: 'kotka' })
  if (!kotka) {
    console.error('❌ Котька not found. Run seedUsers.ts first.')
    process.exit(1)
  }

  const kotkaId = (kotka._id as { toString(): string }).toString()
  console.log(`Котька id: ${kotkaId}`)

  const db = mongoose.connection.db!
  const filter = { $or: [{ userId: 'admin' }, { userId: null }, { userId: { $exists: false } }] }

  for (const coll of COLLECTIONS) {
    try {
      const result = await db.collection(coll).updateMany(filter, { $set: { userId: kotkaId } })
      console.log(`${coll}: updated ${result.modifiedCount} docs`)
    } catch {
      console.warn(`${coll}: skipped (may not exist)`)
    }
  }

  await mongoose.disconnect()
  console.log('Migration complete.')
}

migrate().catch(e => { console.error(e); process.exit(1) })

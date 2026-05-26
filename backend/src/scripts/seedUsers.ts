/**
 * seedUsers.ts
 * ------------
 * One-time script to create initial user profiles.
 * Run on Railway: railway run npx ts-node src/scripts/seedUsers.ts
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { User } from '../models/User'

async function seed(): Promise<void> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set')

  await mongoose.connect(uri)
  console.log('✅ Connected to MongoDB')

  const users = [
    { name: 'Котька', username: 'kotka', role: 'admin' as const },
    { name: 'Коська', username: 'koska', role: 'user'  as const },
  ]

  for (const u of users) {
    const result = await User.updateOne(
      { username: u.username },
      { $setOnInsert: u },
      { upsert: true }
    )
    if (result.upsertedCount > 0) {
      console.log(`✅ Created: ${u.name} (${u.username}, ${u.role})`)
    } else {
      console.log(`⚠️  Already exists: ${u.username}`)
    }
  }

  await mongoose.disconnect()
  console.log('Done.')
}

seed().catch(e => { console.error(e); process.exit(1) })

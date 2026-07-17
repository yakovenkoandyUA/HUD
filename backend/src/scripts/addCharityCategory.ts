/**
 * addCharityCategory.ts
 * Додає категорію "Благодійність" всім юзерам що її ще не мають.
 * Run: railway run npx ts-node src/scripts/addCharityCategory.ts
 */

import Category from '../models/Category'
import { User } from '../models/User'

const CHARITY_CAT = { name: 'Благодійність', icon: 'ti-heart-handshake', color: '#F43F5E', order: 16, isDefault: true, isActive: true }

async function run(): Promise<void> {
  const { connectDB } = await import('../config/db')
  await connectDB()

  const users = await User.find({}, '_id')
  let added = 0

  for (const user of users) {
    const exists = await Category.findOne({ userId: user._id, name: 'Благодійність' })
    if (exists) continue
    await Category.create({ ...CHARITY_CAT, userId: user._id })
    added++
  }

  await Category.updateMany({ name: 'Інше' }, { $set: { order: 17 } })

  console.log(`✅ Added "Благодійність" for ${added} users, bumped "Інше" to order 17`)
  console.log('🎉 Done')
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })

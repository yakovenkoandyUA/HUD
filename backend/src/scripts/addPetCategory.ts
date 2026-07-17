/**
 * addPetCategory.ts
 * Додає категорію "Тварини" всім юзерам що її ще не мають.
 * Run: railway run npx ts-node src/scripts/addPetCategory.ts
 */

import Category from '../models/Category'
import { User } from '../models/User'

const PET_CAT = { name: 'Тварини', icon: 'ti-paw', color: '#84CC16', order: 15, isDefault: true, isActive: true }

async function run(): Promise<void> {
  const { connectDB } = await import('../config/db')
  await connectDB()

  const users = await User.find({}, '_id')
  let added = 0

  for (const user of users) {
    const exists = await Category.findOne({ userId: user._id, name: 'Тварини' })
    if (exists) continue
    await Category.create({ ...PET_CAT, userId: user._id })
    added++
  }

  // Also bump Інше to order 16
  await Category.updateMany({ name: 'Інше' }, { $set: { order: 16 } })

  console.log(`✅ Added "Тварини" for ${added} users, bumped "Інше" to order 16`)
  console.log('🎉 Done')
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })

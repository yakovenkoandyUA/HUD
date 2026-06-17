/**
 * addSportCategory.ts
 * Adds the "Спорт" category to all existing users who don't have it yet.
 * Run: railway run npx ts-node src/scripts/addSportCategory.ts
 */
import Category from '../models/Category'
import { User } from '../models/User'

const SPORT_CATEGORY = {
  name: 'Спорт',
  icon: 'ti-barbell',
  color: '#2DD4BF',
  isDefault: true,
  isActive: true,
  order: 4,
}

async function run(): Promise<void> {
  const users = await User.find({})
  let added = 0

  for (const user of users) {
    const userId = (user._id as { toString(): string }).toString()
    const existing = await Category.findOne({ userId, name: 'Спорт' })
    if (existing) continue

    await Category.create({ ...SPORT_CATEGORY, userId })
    added++
    console.log(`  ✅ Added Спорт for user ${user.email ?? user.username}`)
  }

  console.log(`Done. Added to ${added} users.`)
}

if (require.main === module) {
  import('../config/db').then(async ({ connectDB }) => {
    await connectDB()
    await run()
    process.exit(0)
  })
}

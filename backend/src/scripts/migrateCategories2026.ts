/**
 * migrateCategories2026.ts
 * Оновлює категорії витрат для всіх юзерів:
 * - Їжа → Продукти (rename)
 * - Здоров'я → Медицина (rename)
 * - Інвестиції → deactivate (більше не expense)
 * - Заощадження → deactivate (більше не expense)
 * - Додає нові: Заклади, Комунальні, Краса, Побут, Подорожі
 * - Транзакції: оновлює category string відповідно
 *
 * Run: railway run npx ts-node src/scripts/migrateCategories2026.ts
 */

import Category from '../models/Category'
import Transaction from '../models/Transaction'

const RENAMES: Record<string, string> = {
  'Їжа':       'Продукти',
  "Здоров'я":  'Медицина',
}

const DEACTIVATE = ['Інвестиції', 'Заощадження']

const NEW_CATEGORIES = [
  { name: 'Заклади',    icon: 'ti-tools-kitchen-2',  color: '#84CC16', order: 1  },
  { name: 'Комунальні', icon: 'ti-bolt',              color: '#8B5CF6', order: 4  },
  { name: 'Краса',      icon: 'ti-sparkles',          color: '#F472B6', order: 7  },
  { name: 'Побут',      icon: 'ti-home-cog',          color: '#78716C', order: 14 },
  { name: 'Подорожі',   icon: 'ti-plane',             color: '#0EA5E9', order: 12 },
]

async function migrate(): Promise<void> {
  const { connectDB } = await import('../config/db')
  await connectDB()

  // 1. Rename categories
  for (const [from, to] of Object.entries(RENAMES)) {
    const result = await Category.updateMany({ name: from }, { $set: { name: to } })
    console.log(`✅ Renamed "${from}" → "${to}": ${result.modifiedCount} docs`)

    const txResult = await Transaction.updateMany(
      { category: from },
      { $set: { category: to } }
    )
    console.log(`   Transactions updated: ${txResult.modifiedCount}`)
  }

  // 2. Deactivate Інвестиції / Заощадження
  for (const name of DEACTIVATE) {
    const result = await Category.updateMany({ name }, { $set: { isActive: false } })
    console.log(`⛔ Deactivated "${name}": ${result.modifiedCount} docs`)
  }

  // 3. Add new categories for users who don't have them yet
  const users = await Category.distinct('userId')
  for (const userId of users) {
    for (const cat of NEW_CATEGORIES) {
      const exists = await Category.findOne({ userId, name: cat.name })
      if (!exists) {
        await Category.create({ ...cat, userId, isDefault: true, isActive: true })
        console.log(`➕ Added "${cat.name}" for user ${userId}`)
      }
    }
  }

  console.log('🎉 Migration complete')
  process.exit(0)
}

migrate().catch(e => { console.error(e); process.exit(1) })

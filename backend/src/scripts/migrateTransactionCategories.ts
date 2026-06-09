import 'dotenv/config'
import Transaction from '../models/Transaction'
import Category from '../models/Category'
import { User } from '../models/User'

/**
 * migrateTransactionCategories
 * ----------------------------
 * Зіставляє старі текстові категорії транзакцій
 * з новими Category документами по userId.
 * Idempotent: пропускає транзакції що вже мають categoryId.
 */

// Маппінг ключових слів → назва базової категорії
const KEYWORD_MAP: Record<string, string> = {
  // Їжа
  'продукт': 'Їжа',
  'novus':   'Їжа',
  'атб':     'Їжа',
  'сільпо':  'Їжа',
  'metro':   'Їжа',
  'їжа':     'Їжа',
  'food':    'Їжа',
  'ресторан':'Їжа',
  'кафе':    'Їжа',
  'піца':    'Їжа',
  'суші':    'Їжа',

  // Транспорт
  'метро':        'Транспорт',
  'таксі':        'Транспорт',
  'uber':         'Транспорт',
  'bolt':         'Транспорт',
  'укрзалізниця': 'Транспорт',
  'транспорт':    'Транспорт',
  'бензин':       'Транспорт',
  'заправка':     'Транспорт',

  // Житло
  'оренда':  'Житло',
  'квартира':'Житло',
  'комунал': 'Житло',
  'інтернет':'Житло',

  // Здоров'я
  'аптека':  "Здоров'я",
  'ліки':    "Здоров'я",
  'лікар':   "Здоров'я",
  'медицина':"Здоров'я",

  // Розваги
  'кіно':    'Розваги',
  'театр':   'Розваги',
  'концерт': 'Розваги',
  'netflix': 'Підписки',
  'spotify': 'Підписки',

  // Підписки
  'підписк': 'Підписки',

  // Навчання
  'курс':    'Навчання',
  'навчан':  'Навчання',
  'книг':    'Навчання',

  // Одяг
  'одяг':    'Одяг',
  'взуття':  'Одяг',
  'zara':    'Одяг',
  'h&m':     'Одяг',

  // Подарунки
  'подарун': 'Подарунки',

  // Заощадження
  'заощадж': 'Заощадження',
  'накопич': 'Заощадження',
}

const findCategoryId = (
  oldName: string,
  userCategories: { _id: string; name: string }[]
): string | null => {
  const lower = oldName.toLowerCase().trim()

  // 1. Точний збіг по назві категорії
  const exact = userCategories.find(c => c.name.toLowerCase() === lower)
  if (exact) return exact._id

  // 2. Маппінг по ключових словах
  for (const [keyword, catName] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword.toLowerCase())) {
      const found = userCategories.find(c => c.name.toLowerCase() === catName.toLowerCase())
      if (found) return found._id
    }
  }

  // 3. "Інше: XXX" → категорія "Інше"
  if (lower.startsWith('інше:') || lower.startsWith('other:')) {
    const other = userCategories.find(c => c.name.toLowerCase() === 'інше')
    if (other) return other._id
  }

  // 4. Fallback → "Інше"
  const fallback = userCategories.find(c => c.name.toLowerCase() === 'інше')
  return fallback?._id ?? null
}

const migrateForUser = async (userId: string, username: string) => {
  const userCategories = await Category.find({ userId })
    .select('_id name')
    .lean<{ _id: string; name: string }[]>()

  if (!userCategories.length) {
    console.log(`⚠️  No categories for user ${username} — skipping`)
    return
  }

  const transactions = await Transaction.find({
    userId,
    $or: [
      { categoryId: null },
      { categoryId: { $exists: false } },
    ],
  })

  console.log(`📦 Found ${transactions.length} transactions to migrate for ${username}`)

  let migrated = 0
  let skipped  = 0

  for (const tx of transactions) {
    // Use category text field first, fall back to desc
    const oldCategory = tx.category || tx.desc || ''
    const categoryId  = findCategoryId(oldCategory, userCategories)

    if (categoryId) {
      await Transaction.updateOne({ _id: tx._id }, { $set: { categoryId } })
      migrated++
    } else {
      console.log(`  ⚠️  No match for: "${oldCategory}"`)
      skipped++
    }
  }

  console.log(`  ✅ Migrated: ${migrated}, Skipped (no fallback): ${skipped}`)
}

const migrateAll = async () => {
  const users = await User.find({})
  for (const user of users) {
    console.log(`\n👤 Processing user: ${user.username}`)
    await migrateForUser(user._id.toString(), user.username)
  }
  console.log('\n🎉 Migration complete!')
}

if (require.main === module) {
  import('../config/db').then(async ({ connectDB }) => {
    await connectDB()
    await migrateAll()
    process.exit(0)
  })
}

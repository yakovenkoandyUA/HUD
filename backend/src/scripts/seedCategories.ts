import Category from '../models/Category'
import { User } from '../models/User'

const BASE_CATEGORIES = [
  { name: 'Продукти',   icon: 'ti-shopping-cart',    color: '#22C55E', order: 0  },
  { name: 'Заклади',    icon: 'ti-tools-kitchen-2',  color: '#EAB308', order: 1  },
  { name: 'Житло',      icon: 'ti-home',             color: '#8B5CF6', order: 2  },
  { name: 'Комунальні', icon: 'ti-bolt',             color: '#06B6D4', order: 3  },
  { name: 'Побут',      icon: 'ti-home-cog',         color: '#78716C', order: 4  },
  { name: 'Медицина',   icon: 'ti-pill',             color: '#EF4444', order: 5  },
  { name: 'Краса',      icon: 'ti-sparkles',         color: '#D946EF', order: 6  },
  { name: 'Спорт',      icon: 'ti-barbell',          color: '#10B981', order: 7  },
  { name: 'Одяг',       icon: 'ti-hanger',           color: '#F472B6', order: 8  },
  { name: 'Транспорт',  icon: 'ti-car',              color: '#3B82F6', order: 9  },
  { name: 'Подорожі',   icon: 'ti-plane',            color: '#38BDF8', order: 10 },
  { name: 'Розваги',    icon: 'ti-device-gamepad-2', color: '#F97316', order: 11 },
  { name: 'Підписки',   icon: 'ti-repeat',           color: '#6366F1', order: 12 },
  { name: 'Навчання',   icon: 'ti-book',             color: '#0369A1', order: 13 },
  { name: 'Подарунки',  icon: 'ti-gift',             color: '#FB923C', order: 14 },
  { name: 'Інше',       icon: 'ti-dots',             color: '#9CA3AF', order: 15 },
]

export const seedCategoriesForUser = async (userId: string): Promise<void> => {
  const existing = await Category.findOne({ userId, isDefault: true })
  if (existing) return

  const docs = BASE_CATEGORIES.map(cat => ({
    ...cat,
    userId,
    isDefault: true,
    isActive: true,
  }))

  await Category.insertMany(docs)
  console.log(`✅ Seeded ${docs.length} base categories for user ${userId}`)
}

export const seedCategoriesForAllUsers = async (): Promise<void> => {
  const users = await User.find({})
  for (const user of users) {
    await seedCategoriesForUser((user._id as { toString(): string }).toString())
  }
  console.log(`✅ Done seeding categories for ${users.length} users`)
}

// Entry point for: railway run npx ts-node src/scripts/seedCategories.ts
if (require.main === module) {
  import('../config/db').then(async ({ connectDB }) => {
    await connectDB()
    await seedCategoriesForAllUsers()
    process.exit(0)
  })
}

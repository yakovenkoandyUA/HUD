import Category from '../models/Category'
import { User } from '../models/User'

const BASE_CATEGORIES = [
  { name: 'Продукти',     icon: 'ti-shopping-cart',     color: '#22C55E', order: 0  },
  { name: 'Заклади',      icon: 'ti-tools-kitchen-2',   color: '#84CC16', order: 1  },
  { name: 'Транспорт',    icon: 'ti-car',               color: '#3B82F6', order: 2  },
  { name: 'Житло',        icon: 'ti-home',              color: '#A855F7', order: 3  },
  { name: 'Комунальні',   icon: 'ti-bolt',              color: '#8B5CF6', order: 4  },
  { name: 'Медицина',     icon: 'ti-stethoscope',       color: '#EF4444', order: 5  },
  { name: 'Одяг',         icon: 'ti-hanger',            color: '#EC4899', order: 6  },
  { name: 'Краса',        icon: 'ti-sparkles',          color: '#F472B6', order: 7  },
  { name: 'Спорт',        icon: 'ti-barbell',           color: '#2DD4BF', order: 8  },
  { name: 'Розваги',      icon: 'ti-device-gamepad-2',  color: '#F59E0B', order: 9  },
  { name: 'Підписки',     icon: 'ti-repeat',            color: '#14B8A6', order: 10 },
  { name: 'Навчання',     icon: 'ti-book',              color: '#6366F1', order: 11 },
  { name: 'Подорожі',     icon: 'ti-plane',             color: '#0EA5E9', order: 12 },
  { name: 'Подарунки',    icon: 'ti-gift',              color: '#FB923C', order: 13 },
  { name: 'Побут',        icon: 'ti-home-cog',          color: '#78716C', order: 14 },
  { name: 'Інше',         icon: 'ti-dots',              color: '#9CA3AF', order: 15 },
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

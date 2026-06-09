import Category from '../models/Category'
import { User } from '../models/User'

const BASE_CATEGORIES = [
  { name: 'Їжа',          icon: 'ti-tools-kitchen-2',  color: '#22C55E', order: 0  },
  { name: 'Транспорт',    icon: 'ti-car',               color: '#3B82F6', order: 1  },
  { name: 'Житло',        icon: 'ti-home',              color: '#A855F7', order: 2  },
  { name: "Здоров'я",     icon: 'ti-stethoscope',       color: '#EF4444', order: 3  },
  { name: 'Одяг',         icon: 'ti-hanger',            color: '#EC4899', order: 4  },
  { name: 'Розваги',      icon: 'ti-device-gamepad-2',  color: '#F59E0B', order: 5  },
  { name: 'Підписки',     icon: 'ti-repeat',            color: '#14B8A6', order: 6  },
  { name: 'Інвестиції',   icon: 'ti-trending-up',       color: '#10B981', order: 7  },
  { name: 'Подарунки',    icon: 'ti-gift',              color: '#FB923C', order: 8  },
  { name: 'Навчання',     icon: 'ti-book',              color: '#6366F1', order: 9  },
  { name: 'Заощадження',  icon: 'ti-pig-money',         color: '#EAB308', order: 10 },
  { name: 'Інше',         icon: 'ti-dots',              color: '#9CA3AF', order: 11 },
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

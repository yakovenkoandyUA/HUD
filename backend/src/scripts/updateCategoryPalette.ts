/**
 * updateCategoryPalette.ts
 * Оновлює кольори, іконки та порядок категорій для всіх юзерів.
 * Run: railway run npx ts-node src/scripts/updateCategoryPalette.ts
 */

import Category from '../models/Category'

const UPDATES: Record<string, { icon: string; color: string; order: number }> = {
  'Продукти':   { icon: 'ti-shopping-cart',    color: '#22C55E', order: 0  },
  'Заклади':    { icon: 'ti-tools-kitchen-2',  color: '#EAB308', order: 1  },
  'Житло':      { icon: 'ti-home',             color: '#8B5CF6', order: 2  },
  'Комунальні': { icon: 'ti-bolt',             color: '#06B6D4', order: 3  },
  'Побут':      { icon: 'ti-home-cog',         color: '#F97316', order: 4  },
  'Медицина':   { icon: 'ti-pill',             color: '#EF4444', order: 5  },
  'Краса':      { icon: 'ti-sparkles',         color: '#D946EF', order: 6  },
  'Спорт':      { icon: 'ti-barbell',          color: '#10B981', order: 7  },
  'Одяг':       { icon: 'ti-hanger',           color: '#F472B6', order: 8  },
  'Транспорт':  { icon: 'ti-car',              color: '#3B82F6', order: 9  },
  'Подорожі':   { icon: 'ti-plane',            color: '#38BDF8', order: 10 },
  'Розваги':    { icon: 'ti-device-gamepad-2', color: '#F97316', order: 11 },
  'Підписки':   { icon: 'ti-repeat',           color: '#6366F1', order: 12 },
  'Навчання':   { icon: 'ti-book',             color: '#0369A1', order: 13 },
  'Подарунки':  { icon: 'ti-gift',             color: '#FB923C', order: 14 },
  'Інше':       { icon: 'ti-dots',             color: '#9CA3AF', order: 15 },
}

async function run(): Promise<void> {
  const { connectDB } = await import('../config/db')
  await connectDB()

  for (const [name, upd] of Object.entries(UPDATES)) {
    const result = await Category.updateMany({ name }, { $set: upd })
    console.log(`✅ ${name}: ${result.modifiedCount} docs → icon ${upd.icon}, color ${upd.color}, order ${upd.order}`)
  }

  console.log('🎉 Palette update complete')
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })

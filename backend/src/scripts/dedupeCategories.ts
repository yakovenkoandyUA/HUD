import Category from '../models/Category'
import Transaction from '../models/Transaction'

/**
 * One-off cleanup for the seedCategoriesForUser race condition (userId+name+parentId
 * had no unique index, so concurrent /auth/select calls could double-insert the base set).
 * Keeps the oldest doc per (userId, name, parentId), reassigns transactions off the
 * duplicates, then deletes them.
 */
export const dedupeCategories = async (): Promise<void> => {
  const all = await Category.find({}).sort({ createdAt: 1 })
  const seen = new Map<string, typeof all[number]>()
  const duplicates: typeof all = []

  for (const cat of all) {
    const key = `${cat.userId}::${cat.name}::${cat.parentId ?? ''}`
    if (seen.has(key)) {
      duplicates.push(cat)
    } else {
      seen.set(key, cat)
    }
  }

  if (duplicates.length === 0) {
    console.log('✅ No duplicate categories found')
    return
  }

  for (const dup of duplicates) {
    const key = `${dup.userId}::${dup.name}::${dup.parentId ?? ''}`
    const canonical = seen.get(key)!
    const canonicalId = (canonical._id as { toString(): string }).toString()
    const dupId = (dup._id as { toString(): string }).toString()

    const { modifiedCount } = await Transaction.updateMany(
      { categoryId: dupId },
      { categoryId: canonicalId }
    )
    if (modifiedCount > 0) {
      console.log(`  → reassigned ${modifiedCount} transaction(s) from ${dupId} to ${canonicalId} (${dup.name})`)
    }

    await dup.deleteOne()
  }

  console.log(`✅ Removed ${duplicates.length} duplicate categories`)
}

// Entry point for: railway run npx ts-node src/scripts/dedupeCategories.ts
if (require.main === module) {
  import('../config/db').then(async ({ connectDB }) => {
    await connectDB()
    await dedupeCategories()
    process.exit(0)
  })
}

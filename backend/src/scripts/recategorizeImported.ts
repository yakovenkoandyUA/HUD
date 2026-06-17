/**
 * Retroactively categorizes transactions imported from CSV or Monobank
 * that currently have an empty category.
 *
 * Run: railway run npx ts-node src/scripts/recategorizeImported.ts
 * Or locally with MONGODB_URI set: npx ts-node src/scripts/recategorizeImported.ts
 */

import { connectDB } from '../config/db'
import Transaction from '../models/Transaction'
import Category from '../models/Category'
import { categorize } from '../utils/categorizeTransaction'

async function run() {
  await connectDB()

  // Find all transactions with empty category from bank/csv sources
  const uncategorized = await Transaction.find({
    $or: [
      { source: { $in: ['monobank', 'csv'] }, category: '' },
      { source: { $in: ['monobank', 'csv'] }, category: { $exists: false } },
      { source: { $in: ['monobank', 'csv'] }, categoryId: null },
    ],
  }).lean()

  if (uncategorized.length === 0) {
    console.log('Nothing to categorize.')
    process.exit(0)
  }

  console.log(`Found ${uncategorized.length} uncategorized transactions. Processing...`)

  // Group by userId to avoid fetching categories repeatedly
  const byUser = new Map<string, typeof uncategorized>()
  for (const tx of uncategorized) {
    const uid = tx.userId
    if (!byUser.has(uid)) byUser.set(uid, [])
    byUser.get(uid)!.push(tx)
  }

  let updated = 0
  let skipped = 0

  for (const [userId, txs] of byUser) {
    const categories = await Category.find({ userId, isActive: true })

    for (const tx of txs) {
      const desc = tx.desc ?? ''
      const match = categorize(desc, categories)
      if (!match) { skipped++; continue }

      await Transaction.updateOne(
        { _id: tx._id },
        { $set: { category: match.name, categoryId: match.id } },
      )
      updated++
    }
  }

  console.log(`✅ Updated: ${updated}  |  No match (stays empty): ${skipped}`)
  process.exit(0)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})

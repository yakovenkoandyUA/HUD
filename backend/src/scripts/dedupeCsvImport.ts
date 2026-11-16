import mongoose from 'mongoose'
import { User } from '../models/User'
import Transaction from '../models/Transaction'
import * as dotenv from 'dotenv'
dotenv.config()

// Usage: npx ts-node src/scripts/dedupeCsvImport.ts <username> [--confirm]
// Fixes a CSV statement imported twice: groups the user's CSV transactions into import batches
// (rows inserted within 60s of each other), and if the LAST batch is an exact copy of the one before it,
// deletes the last batch. Dry-run without --confirm.
async function main() {
  const username = process.argv[2]
  const confirm = process.argv.includes('--confirm')
  if (!username) { console.error('Usage: dedupeCsvImport.ts <username> [--confirm]'); process.exit(1) }

  await mongoose.connect(process.env.MONGODB_URI!)
  const user = await User.findOne({ username }).select('_id')
  if (!user) { console.error(`User "${username}" not found`); process.exit(1) }

  const txs = await Transaction.find({ userId: String(user._id), source: 'csv' }).sort({ createdAt: 1 }).lean()
  const batches: typeof txs[] = []
  let lastAt = 0
  for (const t of txs) {
    const at = new Date((t as unknown as { createdAt: Date }).createdAt).getTime()
    if (batches.length === 0 || at - lastAt > 60_000) batches.push([])
    batches[batches.length - 1].push(t)
    lastAt = at
  }
  console.log(`CSV transactions: ${txs.length}, import batches: ${batches.map(b => b.length).join(', ') || 'none'}`)
  if (batches.length < 2) { console.log('Nothing to dedupe.'); await mongoose.disconnect(); return }

  const key = (t: typeof txs[number]) => `${t.date}|${t.type}|${t.amount}|${t.desc}|${t.walletId ?? 'sense'}`
  const last = batches[batches.length - 1]
  const prev = batches[batches.length - 2]
  const count = (b: typeof txs) => b.reduce((m, t) => m.set(key(t), (m.get(key(t)) ?? 0) + 1), new Map<string, number>())
  const a = count(last); const b = count(prev)
  const identical = a.size === b.size && [...a].every(([k, n]) => b.get(k) === n)
  if (!identical) {
    console.log(`Last batch (${last.length}) is NOT an exact copy of the previous one (${prev.length}) — not touching anything.`)
    await mongoose.disconnect(); return
  }
  console.log(`Last batch (${last.length} rows) is an exact copy of the previous one.`)
  if (!confirm) {
    console.log('Dry run — nothing deleted. Re-run with --confirm to delete the last batch.')
  } else {
    const del = await Transaction.deleteMany({ _id: { $in: last.map(t => t._id) } })
    console.log(`Deleted ${del.deletedCount} duplicate transactions`)
  }
  await mongoose.disconnect()
}

main().catch(err => { console.error(err); process.exit(1) })

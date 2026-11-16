import mongoose from 'mongoose'
import { User } from '../models/User'
import Transaction from '../models/Transaction'
import BankConnection from '../models/BankConnection'
import * as dotenv from 'dotenv'
dotenv.config()

// Usage: npx ts-node src/scripts/resetFinance.ts <username> [--confirm]
// Deletes ALL transactions of one user (income + expenses, every wallet) and resets the
// Monobank sync cursor so the next sync re-imports the last 30 days. Dry-run without --confirm.
async function main() {
  const username = process.argv[2]
  const confirm = process.argv.includes('--confirm')
  if (!username) { console.error('Usage: resetFinance.ts <username> [--confirm]'); process.exit(1) }

  await mongoose.connect(process.env.MONGODB_URI!)
  const user = await User.findOne({ username }).select('_id username')
  if (!user) { console.error(`User "${username}" not found`); process.exit(1) }

  const userId = String(user._id)
  const count = await Transaction.countDocuments({ userId })
  console.log(`User ${user.username} (${userId}): ${count} transactions`)

  if (!confirm) {
    console.log('Dry run — nothing deleted. Re-run with --confirm to delete.')
  } else {
    const del = await Transaction.deleteMany({ userId })
    await BankConnection.updateMany({ userId }, { lastSync: null })
    console.log(`Deleted ${del.deletedCount} transactions`)
  }
  await mongoose.disconnect()
}

main().catch(err => { console.error(err); process.exit(1) })

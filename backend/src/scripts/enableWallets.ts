import mongoose from 'mongoose'
import { User } from '../models/User'
import * as dotenv from 'dotenv'
dotenv.config()

// Usage: npx ts-node src/scripts/enableWallets.ts <username>
async function main() {
  const username = process.argv[2]
  if (!username) { console.error('Usage: enableWallets.ts <username>'); process.exit(1) }
  await mongoose.connect(process.env.MONGODB_URI!)
  const result = await User.updateOne({ username }, { walletsEnabled: true })
  console.log(`Matched: ${result.matchedCount}, updated: ${result.modifiedCount}`)
  await mongoose.disconnect()
}

main().catch(err => { console.error(err); process.exit(1) })

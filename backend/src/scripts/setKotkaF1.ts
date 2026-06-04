import mongoose from 'mongoose'
import { User } from '../models/User'
import * as dotenv from 'dotenv'
dotenv.config()

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!)
  const result = await User.updateOne({ username: 'kotka' }, { f1Enabled: true })
  console.log('Updated:', result.modifiedCount, 'user(s)')
  await mongoose.disconnect()
}

main().catch(err => { console.error(err); process.exit(1) })

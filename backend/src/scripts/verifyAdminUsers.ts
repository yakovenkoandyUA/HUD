import mongoose from 'mongoose'
import { User } from '../models/User'
import * as dotenv from 'dotenv'
dotenv.config()

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!)
  const result = await User.updateMany(
    { email: { $exists: true, $ne: null } },
    { isVerified: true, verificationToken: null }
  )
  console.log('Verified:', result.modifiedCount, 'user(s)')
  await mongoose.disconnect()
}

main().catch(err => { console.error(err); process.exit(1) })

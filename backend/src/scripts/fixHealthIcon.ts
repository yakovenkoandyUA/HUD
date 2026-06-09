import 'dotenv/config'
import Category from '../models/Category'

// One-shot: replace non-existent ti-heart-pulse with ti-stethoscope
if (require.main === module) {
  import('../config/db').then(async ({ connectDB }) => {
    await connectDB()
    const result = await Category.updateMany(
      { icon: 'ti-heart-pulse' },
      { $set: { icon: 'ti-stethoscope' } }
    )
    console.log(`✅ Updated ${result.modifiedCount} categories`)
    process.exit(0)
  })
}

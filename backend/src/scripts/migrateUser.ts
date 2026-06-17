/**
 * Migrate all data from one user account to another.
 *
 * Usage:
 *   railway run npx ts-node src/scripts/migrateUser.ts <fromUsername> <toUsername>
 *
 * Example:
 *   railway run npx ts-node src/scripts/migrateUser.ts koska yozhya1488
 */

import { connectDB } from '../config/db'
import { User } from '../models/User'
import Transaction from '../models/Transaction'
import Category from '../models/Category'
import Memory from '../models/Memory'
import WatchlistItem from '../models/WatchlistItem'
import WatchlistComment from '../models/WatchlistComment'
import Recipe from '../models/Recipe'
import CookLog from '../models/CookLog'
import MealPlan from '../models/MealPlan'
import SprintTask from '../models/SprintTask'
import TodoItem from '../models/TodoItem'
import SavingsGoal from '../models/SavingsGoal'
import RecurringPayment from '../models/RecurringPayment'
import ShoppingItem from '../models/ShoppingItem'
import Note from '../models/Note'
import Label from '../models/Label'
import Plan from '../models/Plan'
import BankConnection from '../models/BankConnection'
import { FamilyLink } from '../models/FamilyLink'
import F1Prediction from '../models/F1Prediction'
import Lesson from '../models/Lesson'
import MoodLog from '../models/MoodLog'
import PushSubscription from '../models/PushSubscription'
import { RefreshToken } from '../models/RefreshToken'

async function migrate(fromUsername: string, toUsername: string) {
  await connectDB()

  const fromUser = await User.findOne({ username: fromUsername })
  if (!fromUser) { console.error(`User @${fromUsername} not found`); process.exit(1) }

  const toUser = await User.findOne({ username: toUsername })
  if (!toUser) { console.error(`User @${toUsername} not found`); process.exit(1) }

  const fromId = (fromUser._id as { toString(): string }).toString()
  const toId   = (toUser._id as { toString(): string }).toString()

  console.log(`\nMigrating @${fromUsername} (${fromId}) → @${toUsername} (${toId})\n`)

  const results: Array<{ model: string; updated: number }> = []

  async function move(name: string, Model: { updateMany: Function }, filter: object, update: object) {
    const res = await Model.updateMany(filter, update)
    results.push({ model: name, updated: res.modifiedCount ?? 0 })
  }

  // ── Collections with userId ──────────────────────────────────────────────────
  await move('Transaction',      Transaction,      { userId: fromId }, { $set: { userId: toId } })
  await move('Category',         Category,         { userId: fromId }, { $set: { userId: toId } })
  await move('Memory',           Memory,           { userId: fromId }, { $set: { userId: toId } })
  await move('WatchlistItem',    WatchlistItem,    { userId: fromId }, { $set: { userId: toId } })
  await move('WatchlistComment', WatchlistComment, { userId: fromId }, { $set: { userId: toId } })
  await move('Recipe',           Recipe,           { userId: fromId }, { $set: { userId: toId } })
  await move('CookLog',          CookLog,          { userId: fromId }, { $set: { userId: toId } })
  await move('MealPlan',         MealPlan,         { userId: fromId }, { $set: { userId: toId } })
  await move('SprintTask',       SprintTask,       { userId: fromId }, { $set: { userId: toId } })
  await move('TodoItem',         TodoItem,         { userId: fromId }, { $set: { userId: toId } })
  await move('SavingsGoal',      SavingsGoal,      { userId: fromId }, { $set: { userId: toId } })
  await move('RecurringPayment', RecurringPayment, { userId: fromId }, { $set: { userId: toId } })
  await move('ShoppingItem',     ShoppingItem,     { userId: fromId }, { $set: { userId: toId } })
  await move('Note',             Note,             { userId: fromId }, { $set: { userId: toId } })
  await move('Label',            Label,            { userId: fromId }, { $set: { userId: toId } })
  await move('Plan',             Plan,             { userId: fromId }, { $set: { userId: toId } })
  await move('BankConnection',   BankConnection,   { userId: fromId }, { $set: { userId: toId } })
  await move('F1Prediction',     F1Prediction,     { userId: fromId }, { $set: { userId: toId } })
  await move('Lesson',           Lesson,           { userId: fromId }, { $set: { userId: toId } })
  await move('MoodLog',          MoodLog,          { userId: fromId }, { $set: { userId: toId } })
  await move('PushSubscription', PushSubscription, { userId: fromId }, { $set: { userId: toId } })
  await move('RefreshToken',     RefreshToken,     { userId: fromId }, { $set: { userId: toId } })

  // ── FamilyLink uses requester/recipient ──────────────────────────────────────
  const flReq = await FamilyLink.updateMany({ requester: fromId }, { $set: { requester: toId } })
  const flRec = await FamilyLink.updateMany({ recipient: fromId }, { $set: { recipient: toId } })
  results.push({ model: 'FamilyLink', updated: (flReq.modifiedCount ?? 0) + (flRec.modifiedCount ?? 0) })

  // ── WatchlistItem.watchedWith array ─────────────────────────────────────────
  const ww = await WatchlistItem.updateMany(
    { watchedWith: fromId },
    { $set: { 'watchedWith.$[el]': toId } },
    { arrayFilters: [{ el: fromId }] },
  )
  results.push({ model: 'WatchlistItem.watchedWith', updated: ww.modifiedCount ?? 0 })

  // ── Print summary ────────────────────────────────────────────────────────────
  console.log('Results:')
  for (const r of results) {
    if (r.updated > 0) console.log(`  ✅ ${r.model}: ${r.updated} documents`)
    else               console.log(`  ·  ${r.model}: nothing to migrate`)
  }

  const total = results.reduce((s, r) => s + r.updated, 0)
  console.log(`\nTotal: ${total} documents migrated.\n`)

  process.exit(0)
}

const [,, fromUsername, toUsername] = process.argv
if (!fromUsername || !toUsername) {
  console.error('Usage: npx ts-node src/scripts/migrateUser.ts <fromUsername> <toUsername>')
  process.exit(1)
}

migrate(fromUsername, toUsername).catch(err => {
  console.error(err)
  process.exit(1)
})

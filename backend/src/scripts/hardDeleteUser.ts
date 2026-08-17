import { User } from '../models/User'
import { RefreshToken } from '../models/RefreshToken'
import { FamilyLink } from '../models/FamilyLink'
import { PlanGroupInvite } from '../models/PlanGroupInvite'
import { Space } from '../models/Space'
import { VehicleEvent } from '../models/VehicleEvent'
import { HomeEvent } from '../models/HomeEvent'
import { PetEvent } from '../models/PetEvent'
import { PlantEvent } from '../models/PlantEvent'
import { SportEvent } from '../models/SportEvent'
import { WorkoutProgram } from '../models/WorkoutProgram'
import { WorkoutSession } from '../models/WorkoutSession'
import { Accommodation } from '../models/Accommodation'
import { Ticket } from '../models/Ticket'
import { TripPlace } from '../models/TripPlace'
import { SpaceInfoCard } from '../models/SpaceInfoCard'
import Memory from '../models/Memory'
import Plan from '../models/Plan'
import Transaction from '../models/Transaction'
import Category from '../models/Category'
import SavingsGoal from '../models/SavingsGoal'
import RecurringPayment from '../models/RecurringPayment'
import SprintTask from '../models/SprintTask'
import TodoItem from '../models/TodoItem'
import Recipe from '../models/Recipe'
import WatchlistItem from '../models/WatchlistItem'
import MoodLog from '../models/MoodLog'
import Note from '../models/Note'
import FinancialReport from '../models/FinancialReport'
import Label from '../models/Label'
import Lesson from '../models/Lesson'
import MealPlan from '../models/MealPlan'
import MimirCache from '../models/MimirCache'
import PushSubscription from '../models/PushSubscription'
import ShoppingItem from '../models/ShoppingItem'
import CookLog from '../models/CookLog'
import Drink from '../models/Drink'
import Game from '../models/Game'
import F1Prediction from '../models/F1Prediction'
import F1SessionReminder from '../models/F1SessionReminder'
import YearbookReport from '../models/YearbookReport'
import UsageCounter from '../models/UsageCounter'
import WatchlistComment from '../models/WatchlistComment'
import RecipeComment from '../models/RecipeComment'
import BankConnection from '../models/BankConnection'

/**
 * Permanently deletes a user and every piece of data they own, plus scrubs
 * references to them left in other users' documents. Called by the 30-day
 * account-deletion cron (backend/src/jobs/accountDeletionCron.ts) and usable
 * standalone for a manual/admin-triggered run.
 *
 * BillingOrder, ProcessedBillingEvent and Feedback are deliberately left
 * untouched (financial audit trail / support history) — see BACKLOG.md.
 */
export const hardDeleteUser = async (userId: string): Promise<void> => {
  const ownedSpaces = await Space.find({ ownerId: userId }).select('_id')
  const ownedSpaceIds = ownedSpaces.map(s => (s._id as { toString(): string }).toString())

  await Promise.all([
    Memory.deleteMany({ userId }),
    Plan.deleteMany({ userId }),
    Transaction.deleteMany({ userId }),
    Category.deleteMany({ userId }),
    SavingsGoal.deleteMany({ userId }),
    RecurringPayment.deleteMany({ userId }),
    SprintTask.deleteMany({ userId }),
    TodoItem.deleteMany({ userId }),
    Recipe.deleteMany({ userId }),
    WatchlistItem.deleteMany({ userId }),
    MoodLog.deleteMany({ userId }),
    Note.deleteMany({ userId }),
    FinancialReport.deleteMany({ userId }),
    Label.deleteMany({ userId }),
    Lesson.deleteMany({ userId }),
    MealPlan.deleteMany({ userId }),
    MimirCache.deleteMany({ userId }),
    PushSubscription.deleteMany({ userId }),
    ShoppingItem.deleteMany({ userId }),
    CookLog.deleteMany({ userId }),
    Drink.deleteMany({ userId }),
    Game.deleteMany({ userId }),
    F1Prediction.deleteMany({ userId }),
    F1SessionReminder.deleteMany({ userId }),
    YearbookReport.deleteMany({ userId }),
    UsageCounter.deleteMany({ userId }),
    WatchlistComment.deleteMany({ userId }),
    RecipeComment.deleteMany({ userId }),
    BankConnection.deleteMany({ userId }),
    RefreshToken.deleteMany({ userId }),
    // Own events not tied to an owned space (e.g. events added inside someone else's space)
    VehicleEvent.deleteMany({ userId }),
    HomeEvent.deleteMany({ userId }),
    PetEvent.deleteMany({ userId }),
    PlantEvent.deleteMany({ userId }),
    SportEvent.deleteMany({ userId }),
    WorkoutProgram.deleteMany({ userId }),
    WorkoutSession.deleteMany({ userId }),
    Accommodation.deleteMany({ userId }),
    Ticket.deleteMany({ userId }),
    TripPlace.deleteMany({ userId }),
    SpaceInfoCard.deleteMany({ userId }),
  ])

  // Spaces the user owns — the space itself is gone, so every sub-collection
  // record scoped to it must go too, regardless of who authored it.
  if (ownedSpaceIds.length > 0) {
    await Promise.all([
      VehicleEvent.deleteMany({ spaceId: { $in: ownedSpaceIds } }),
      HomeEvent.deleteMany({ spaceId: { $in: ownedSpaceIds } }),
      PetEvent.deleteMany({ spaceId: { $in: ownedSpaceIds } }),
      PlantEvent.deleteMany({ spaceId: { $in: ownedSpaceIds } }),
      SportEvent.deleteMany({ spaceId: { $in: ownedSpaceIds } }),
      WorkoutProgram.deleteMany({ spaceId: { $in: ownedSpaceIds } }),
      WorkoutSession.deleteMany({ spaceId: { $in: ownedSpaceIds } }),
      Accommodation.deleteMany({ spaceId: { $in: ownedSpaceIds } }),
      Ticket.deleteMany({ spaceId: { $in: ownedSpaceIds } }),
      TripPlace.deleteMany({ spaceId: { $in: ownedSpaceIds } }),
      SpaceInfoCard.deleteMany({ spaceId: { $in: ownedSpaceIds } }),
      Note.deleteMany({ spaceId: { $in: ownedSpaceIds } }),
      SprintTask.deleteMany({ spaceId: { $in: ownedSpaceIds } }),
      Transaction.deleteMany({ spaceId: { $in: ownedSpaceIds } }),
      Memory.deleteMany({ spaceId: { $in: ownedSpaceIds } }),
      Plan.deleteMany({ spaceId: { $in: ownedSpaceIds } }),
    ])
    await Space.deleteMany({ _id: { $in: ownedSpaceIds } })
  }

  // Scrub references left in OTHER users' documents.
  await Promise.all([
    FamilyLink.deleteMany({ $or: [{ requester: userId }, { recipient: userId }] }),
    PlanGroupInvite.deleteMany({ $or: [{ payerId: userId }, { inviteeId: userId }] }),
    User.updateMany({ planGroupPayerId: userId }, { planGroupPayerId: null, planGroupJoinedAt: null }),
    Space.updateMany({ 'members.userId': userId }, { $pull: { members: { userId } } }),
    WatchlistItem.updateMany({ watchedWith: userId }, { $pull: { watchedWith: userId } }),
    WatchlistItem.updateMany({ 'watchedEpisodes.userId': userId }, { $pull: { watchedEpisodes: { userId } } }),
    Recipe.updateMany({ 'ratings.userId': userId }, { $pull: { ratings: { userId } } }),
    SprintTask.updateMany({ assignedTo: userId }, { $pull: { assignedTo: userId } }),
    Memory.updateMany({ withProfiles: userId }, { $pull: { withProfiles: userId } }),
  ])

  await User.findByIdAndDelete(userId)
}

// Entry point for: railway run npx ts-node src/scripts/hardDeleteUser.ts <userId>
if (require.main === module) {
  const userId = process.argv[2]
  if (!userId) {
    console.error('Usage: ts-node hardDeleteUser.ts <userId>')
    process.exit(1)
  }
  import('../config/db').then(async ({ connectDB }) => {
    await connectDB()
    await hardDeleteUser(userId)
    console.log(`✅ Hard-deleted user ${userId}`)
    process.exit(0)
  })
}

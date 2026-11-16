import { Space } from '../models/Space'

/** Category whose expenses are routed into the user's "Житло" (home) space automatically. */
const UTILITIES_CATEGORY = 'комунальні'

export function isUtilitiesCategory(name: string | null | undefined): boolean {
  return (name ?? '').trim().toLowerCase() === UTILITIES_CATEGORY
}

/**
 * The user's active "Житло" space (null if none).
 * Matches a space of type `home` OR any space literally named "Житло" (users often create it as a blank space).
 * No `finance` module requirement: blank spaces have no such toggle and always show their transactions.
 * If there are several, the oldest one wins.
 */
export async function findHomeSpaceId(userId: string): Promise<string | null> {
  const space = await Space.findOne({
    archived: { $ne: true },
    $and: [
      { $or: [{ ownerId: userId }, { 'members.userId': userId }] },
      { $or: [{ type: 'home' }, { name: /^\s*житло\s*$/i }] },
    ],
  }).sort({ createdAt: 1 }).select('_id').lean()
  return space ? String(space._id) : null
}

import { Request, Response, NextFunction } from 'express'
import { Space } from '../models/Space'
import { User } from '../models/User'
import { assertLimit, assertFeature } from '../utils/entitlements'

function memberPublic(u: InstanceType<typeof User>, role: string) {
  return {
    userId:    (u._id as { toString(): string }).toString(),
    role,
    name:      u.name,
    username:  u.username,
    avatarUrl: u.avatarUrl,
  }
}

function serializeSpace(space: InstanceType<typeof Space>, memberUsers: InstanceType<typeof User>[]) {
  const userMap = new Map(memberUsers.map(u => [(u._id as { toString(): string }).toString(), u]))
  return {
    id:        (space._id as { toString(): string }).toString(),
    name:      space.name,
    type:      space.type,
    color:     space.color,
    emoji:     space.emoji,
    coverUrl:       space.coverUrl ?? '',
    budget:         space.budget ?? null,
    budgetCurrency: space.budgetCurrency ?? 'UAH',
    ownerId:        space.ownerId,
    archived:  space.archived ?? false,
    members:   space.members
      .map(m => {
        const u = userMap.get(m.userId)
        return u ? memberPublic(u, m.role) : null
      })
      .filter(Boolean),
    vehicleProfile: space.vehicleProfile ?? null,
    homeProfile:    space.homeProfile    ?? null,
    petProfile:     space.petProfile     ?? null,
    tripProfile:    space.tripProfile    ?? null,
    createdAt: space.createdAt,
  }
}

/** GET /api/spaces — всі простори де я власник або учасник
 *  ?archived=true — повернути тільки архівні; без параметру — тільки активні */
export async function getSpaces(req: Request, res: Response): Promise<void> {
  try {
    const showArchived = req.query.archived === 'true'
    const spaces = await Space.find({
      'members.userId': req.userId,
      archived: showArchived ? true : { $ne: true },
    })
    const allUserIds = [...new Set(spaces.flatMap(s => s.members.map(m => m.userId)))]
    const users = await User.find({ _id: { $in: allUserIds } })
    res.json(spaces.map(s => serializeSpace(s, users)))
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

/** POST /api/spaces — створити новий простір */
export async function createSpace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, type, color, emoji } = req.body as {
      name?: string; type?: string; color?: string; emoji?: string
    }
    if (!name?.trim()) { res.status(400).json({ error: 'Name required' }); return }

    if (req.user) {
      const count = await Space.countDocuments({ ownerId: req.userId })
      assertLimit(req.user, 'maxSpaces', count)
      const resolvedType = (type ?? 'shared') as string
      if (resolvedType !== 'personal') {
        assertFeature(req.user, 'sharedSpaces')
      }
    }

    const space = await Space.create({
      name:    name.trim(),
      type:    type ?? 'shared',
      color:   color ?? '#9b59b6',
      emoji:   emoji ?? '',
      ownerId: req.userId,
      members: [{ userId: req.userId, role: 'owner' }],
    })

    const me = await User.findById(req.userId)
    res.status(201).json(serializeSpace(space, me ? [me] : []))
  } catch (err) {
    next(err)
  }
}

/** GET /api/spaces/:id */
export async function getSpace(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({
      _id: req.params.id,
      'members.userId': req.userId,
    })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const userIds = space.members.map(m => m.userId)
    const users = await User.find({ _id: { $in: userIds } })
    res.json(serializeSpace(space, users))
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

/** PATCH /api/spaces/:id — оновити назву/тип/колір/емодзі (тільки власник) */
export async function updateSpace(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, ownerId: req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const allowed = ['name', 'type', 'color', 'emoji', 'coverUrl', 'budget', 'budgetCurrency', 'archived'] as const
    allowed.forEach(key => {
      if (req.body[key] !== undefined) (space as unknown as Record<string, unknown>)[key] = req.body[key]
    })
    await space.save()

    const userIds = space.members.map(m => m.userId)
    const users = await User.find({ _id: { $in: userIds } })
    res.json(serializeSpace(space, users))
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

/** DELETE /api/spaces/:id (тільки власник) */
export async function deleteSpace(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOneAndDelete({ _id: req.params.id, ownerId: req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

/** POST /api/spaces/:id/members — додати учасника по username (тільки власник) */
export async function addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, ownerId: req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const { username } = req.body as { username?: string }
    if (!username) { res.status(400).json({ error: 'Username required' }); return }

    const user = await User.findOne({ username: username.trim().toLowerCase() })
    if (!user) { res.status(404).json({ error: 'User not found' }); return }

    const uid = (user._id as { toString(): string }).toString()
    if (space.members.some(m => m.userId === uid)) {
      res.status(409).json({ error: 'Already a member' }); return
    }

    if (req.user) {
      // members count excludes owner (index 0), so current non-owner members = space.members.length - 1
      assertLimit(req.user, 'maxMembersPerSharedSpace', space.members.length - 1)
    }

    space.members.push({ userId: uid, role: 'member' })
    await space.save()

    const userIds = space.members.map(m => m.userId)
    const users = await User.find({ _id: { $in: userIds } })
    res.json(serializeSpace(space, users))
  } catch (err) {
    next(err)
  }
}

/** DELETE /api/spaces/:id/members/:userId — видалити учасника (власник або сам учасник) */
export async function removeMember(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const targetId = req.params.userId
    const isOwner = space.ownerId === req.userId
    const isSelf  = targetId === req.userId

    if (!isOwner && !isSelf) { res.status(403).json({ error: 'Forbidden' }); return }
    if (targetId === space.ownerId) { res.status(400).json({ error: 'Cannot remove owner' }); return }

    space.members = space.members.filter(m => m.userId !== targetId) as typeof space.members
    await space.save()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

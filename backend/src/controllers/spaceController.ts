import { Request, Response, NextFunction } from 'express'
import { Types } from 'mongoose'
import { Space } from '../models/Space'
import { User } from '../models/User'
import Memory from '../models/Memory'
import SprintTask from '../models/SprintTask'
import Note from '../models/Note'
import { assertLimit, assertFeature } from '../utils/entitlements'
import { sendPushToUser } from '../services/webpush'

function memberPublic(u: InstanceType<typeof User>, role: string) {
  return {
    userId:    (u._id as { toString(): string }).toString(),
    role,
    name:      u.name,
    username:  u.username,
    avatarUrl: u.avatarUrl,
  }
}

interface SpaceStats {
  memoriesCount:  number
  openTasksCount: number
  notesCount:     number
  lastActivityAt: string | null
}

function serializeSpace(
  space: InstanceType<typeof Space>,
  memberUsers: InstanceType<typeof User>[],
  stats?: SpaceStats,
) {
  const userMap = new Map(memberUsers.map(u => [(u._id as { toString(): string }).toString(), u]))
  return {
    id:        (space._id as { toString(): string }).toString(),
    name:      space.name,
    type:      space.type,
    color:     space.color,
    emoji:     space.emoji,
    coverUrl:       space.coverUrl ?? '',
    coverPosition:  space.coverPosition ?? 'center',
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
    notes:          space.notes ?? '',
    modules:        space.modules ?? [],
    vehicleProfile: space.vehicleProfile ?? null,
    homeProfile:    space.homeProfile    ?? null,
    petProfile:     space.petProfile     ?? null,
    tripProfile:    space.tripProfile    ?? null,
    sportProfile:   space.sportProfile   ?? null,
    plantProfile:   space.plantProfile   ?? null,
    createdAt: space.createdAt,
    memoriesCount:  stats?.memoriesCount  ?? 0,
    openTasksCount: stats?.openTasksCount ?? 0,
    notesCount:     stats?.notesCount     ?? 0,
    lastActivityAt: stats?.lastActivityAt ?? null,
  }
}

const DEFAULT_MODULES: Record<string, string[]> = {
  vehicle: ['finance'],
  home:    ['finance', 'tasks'],
  pet:     [],
  trip:    ['finance', 'memories'],
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
    const spaceIds   = spaces.map(s => (s._id as { toString(): string }).toString())

    const [users, memoryAgg, taskAgg, noteAgg] = await Promise.all([
      User.find({ _id: { $in: allUserIds } }),
      Memory.aggregate<{ _id: string; count: number; lastDate: string | null }>([
        { $match: { spaceId: { $in: spaceIds } } },
        { $group: { _id: '$spaceId', count: { $sum: 1 }, lastDate: { $max: '$date' } } },
      ]),
      SprintTask.aggregate<{ _id: string; openCount: number; lastDate: Date | null }>([
        { $match: { spaceId: { $in: spaceIds } } },
        { $group: {
          _id:       '$spaceId',
          openCount: { $sum: { $cond: ['$done', 0, 1] } },
          lastDate:  { $max: '$updatedAt' },
        }},
      ]),
      Note.aggregate<{ _id: Types.ObjectId; count: number; lastDate: Date | null }>([
        { $match: { spaceId: { $in: spaceIds.map(id => new Types.ObjectId(id)) } } },
        { $group: { _id: '$spaceId', count: { $sum: 1 }, lastDate: { $max: '$updatedAt' } } },
      ]),
    ])

    // Build per-spaceId stats maps
    const memMap  = new Map(memoryAgg.map(r => [r._id, r]))
    const taskMap = new Map(taskAgg.map(r => [r._id, r]))
    const noteMap = new Map(noteAgg.map(r => [r._id.toString(), r]))

    const statsForSpace = (id: string): SpaceStats => {
      const mem  = memMap.get(id)
      const task = taskMap.get(id)
      const note = noteMap.get(id)

      const dates: Date[] = []
      if (mem?.lastDate)  dates.push(new Date(mem.lastDate))
      if (task?.lastDate) dates.push(new Date(task.lastDate))
      if (note?.lastDate) dates.push(new Date(note.lastDate))
      const latest = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : null

      return {
        memoriesCount:  mem?.count      ?? 0,
        openTasksCount: task?.openCount ?? 0,
        notesCount:     note?.count     ?? 0,
        lastActivityAt: latest ? latest.toISOString() : null,
      }
    }

    res.json(spaces.map(s => serializeSpace(s, users, statsForSpace((s._id as { toString(): string }).toString()))))
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

    const resolvedType = type ?? 'shared'

    if (req.user) {
      const count = await Space.countDocuments({ ownerId: req.userId })
      assertLimit(req.user, 'maxSpaces', count)
      if (resolvedType !== 'personal') {
        assertFeature(req.user, 'sharedSpaces')
      }
    }
    const space = await Space.create({
      name:    name.trim(),
      type:    resolvedType,
      color:   color ?? '#9b59b6',
      emoji:   emoji ?? '',
      ownerId: req.userId,
      members: [{ userId: req.userId, role: 'owner' }],
      modules: DEFAULT_MODULES[resolvedType] ?? [],
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

    const allowed = ['name', 'type', 'color', 'emoji', 'notes', 'coverUrl', 'coverPosition', 'budget', 'budgetCurrency', 'archived', 'modules'] as const
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

    const owner = users.find(u => (u._id as { toString(): string }).toString() === space.ownerId)
    const ownerName = owner?.name ?? 'Хтось'
    sendPushToUser(uid, {
      title: `${ownerName} запросив тебе`,
      body:  `Тебе додано до простору «${space.name}»`,
      url:   `/spaces/${space._id}`,
    }).catch(() => { /* push optional */ })

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

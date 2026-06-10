import { Request, Response } from 'express'
import Recipe from '../models/Recipe'
import { User } from '../models/User'
import { getAcceptedFamilyIds } from './familyController'

export async function getAll(req: Request, res: Response): Promise<void> {
  const scope = (req.query.scope as string) ?? 'mine'
  const myId = req.userId as string

  let filter: Record<string, unknown>
  if (scope === 'mine') {
    filter = { userId: myId }
  } else if (scope === 'family') {
    const familyIds = await getAcceptedFamilyIds(myId)
    filter = { userId: { $in: [myId, ...familyIds] } }
  } else {
    filter = {}
  }

  const items = await Recipe.find(filter).sort({ createdAt: -1 })

  if (scope === 'mine') {
    res.json(items)
    return
  }

  // Attach ownerName + ownerAvatarUrl + isOwn for family/all scopes
  const ownerIds = [...new Set(items.map(r => r.userId))]
  const owners = await User.find({ _id: { $in: ownerIds } }).select('_id username name avatarUrl')
  const ownerMap = new Map<string, { name?: string; username?: string; avatarUrl?: string | null }>(
    owners.map(u => [u._id.toString(), u.toObject()])
  )

  const result = items.map(r => {
    const owner = ownerMap.get(r.userId)
    return {
      ...r.toObject(),
      ownerName:     owner?.name ?? owner?.username ?? null,
      ownerAvatarUrl: owner?.avatarUrl ?? null,
      isOwn:         r.userId === myId,
    }
  })

  res.json(result)
}

export async function create(req: Request, res: Response): Promise<void> {
  const item = await Recipe.create({ ...req.body, userId: req.userId })
  res.status(201).json(item)
}

export async function update(req: Request, res: Response): Promise<void> {
  const item = await Recipe.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  )
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(item)
}

export async function remove(req: Request, res: Response): Promise<void> {
  await Recipe.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  res.status(204).end()
}

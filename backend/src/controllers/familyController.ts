import { Request, Response } from 'express'
import { FamilyLink } from '../models/FamilyLink'
import { User } from '../models/User'

/** Returns all accepted family member userIds for a given userId */
export async function getAcceptedFamilyIds(userId: string): Promise<string[]> {
  const links = await FamilyLink.find({
    $or: [{ requester: userId }, { recipient: userId }],
    status: 'accepted',
  })
  return links.map(l => l.requester === userId ? l.recipient : l.requester)
}

function userPublic(u: InstanceType<typeof User>) {
  return {
    id: (u._id as { toString(): string }).toString(),
    name: u.name,
    username: u.username,
    avatarUrl: u.avatarUrl,
  }
}

/** GET /api/family — my accepted + pending links */
export async function getFamily(req: Request, res: Response): Promise<void> {
  try {
    const links = await FamilyLink.find({
      $or: [{ requester: req.userId }, { recipient: req.userId }],
    })

    const userIds = links.flatMap(l => [l.requester, l.recipient])
      .filter(id => id !== req.userId)
    const users = await User.find({ _id: { $in: userIds } })
    const userMap = new Map(users.map(u => [(u._id as { toString(): string }).toString(), u]))

    const accepted = links
      .filter(l => l.status === 'accepted')
      .map(l => {
        const memberId = l.requester === req.userId ? l.recipient : l.requester
        const u = userMap.get(memberId)
        return u ? { linkId: (l._id as { toString(): string }).toString(), relationshipType: l.relationshipType ?? null, ...userPublic(u) } : null
      })
      .filter(Boolean)

    const pendingSent = links
      .filter(l => l.status === 'pending' && l.requester === req.userId)
      .map(l => {
        const u = userMap.get(l.recipient)
        return u ? { linkId: (l._id as { toString(): string }).toString(), ...userPublic(u) } : null
      })
      .filter(Boolean)

    const pendingReceived = links
      .filter(l => l.status === 'pending' && l.recipient === req.userId)
      .map(l => {
        const u = userMap.get(l.requester)
        return u ? { linkId: (l._id as { toString(): string }).toString(), ...userPublic(u) } : null
      })
      .filter(Boolean)

    res.json({ accepted, pendingSent, pendingReceived })
  } catch {
    res.status(500).json({ error: 'Failed to fetch family' })
  }
}

/** GET /api/family/search?q= — search users by username */
export async function searchUsers(req: Request, res: Response): Promise<void> {
  const q = (req.query.q as string | undefined)?.trim()
  if (!q || q.length < 2) {
    res.json([])
    return
  }
  try {
    const users = await User.find({
      _id: { $ne: req.userId },
      username: { $regex: q, $options: 'i' },
    }).limit(10)
    res.json(users.map(userPublic))
  } catch {
    res.status(500).json({ error: 'Search failed' })
  }
}

/** POST /api/family/request — { targetUserId } */
export async function sendRequest(req: Request, res: Response): Promise<void> {
  const { targetUserId, relationshipType } = req.body as { targetUserId?: string; relationshipType?: string }
  if (!targetUserId) {
    res.status(400).json({ error: 'targetUserId required' })
    return
  }
  if (targetUserId === req.userId) {
    res.status(400).json({ error: 'Cannot add yourself' })
    return
  }

  try {
    const target = await User.findById(targetUserId)
    if (!target) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    // Check if link already exists in either direction
    const existing = await FamilyLink.findOne({
      $or: [
        { requester: req.userId, recipient: targetUserId },
        { requester: targetUserId, recipient: req.userId },
      ],
    })
    if (existing) {
      res.status(409).json({ error: 'Link already exists', status: existing.status })
      return
    }

    const link = await FamilyLink.create({ requester: req.userId, recipient: targetUserId, relationshipType: relationshipType ?? null })
    res.status(201).json({ linkId: (link._id as { toString(): string }).toString(), status: link.status })
  } catch {
    res.status(500).json({ error: 'Failed to send request' })
  }
}

/** POST /api/family/accept/:linkId */
export async function acceptRequest(req: Request, res: Response): Promise<void> {
  try {
    const link = await FamilyLink.findOne({ _id: req.params.linkId, recipient: req.userId, status: 'pending' })
    if (!link) {
      res.status(404).json({ error: 'Request not found' })
      return
    }
    link.status = 'accepted'
    await link.save()
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to accept request' })
  }
}

/** DELETE /api/family/:linkId — reject or remove */
export async function removeLink(req: Request, res: Response): Promise<void> {
  try {
    await FamilyLink.findOneAndDelete({
      _id: req.params.linkId,
      $or: [{ requester: req.userId }, { recipient: req.userId }],
    })
    res.status(204).end()
  } catch {
    res.status(500).json({ error: 'Failed to remove link' })
  }
}

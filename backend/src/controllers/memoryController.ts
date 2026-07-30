import { Request, Response } from 'express'
import Memory from '../models/Memory'
import { User } from '../models/User'

/** Memories the current user can see: own + tagged (withProfiles) */
function visibleFilter(userId: string, extra: Record<string, unknown> = {}) {
  return {
    $or: [{ userId }, { withProfiles: userId }],
    ...extra,
  }
}

async function ownerMap(items: { userId: string }[], myId: string) {
  const foreignIds = [...new Set(items.map(m => m.userId).filter(uid => uid !== myId))]
  if (foreignIds.length === 0) return new Map<string, { name: string; avatarUrl: string | null }>()
  const owners = await User.find({ _id: { $in: foreignIds } }, { name: 1, avatarUrl: 1 })
  const map = new Map<string, { name: string; avatarUrl: string | null }>()
  owners.forEach(u => {
    map.set((u._id as { toString(): string }).toString(), { name: u.name, avatarUrl: u.avatarUrl })
  })
  return map
}

export async function getAll(req: Request, res: Response): Promise<void> {
  try {
    const filter: Record<string, unknown> = visibleFilter(req.userId!)
    if (req.query.spaceId) filter.spaceId = req.query.spaceId

    const items = await Memory.find(filter).sort({ date: -1 })
    const oMap  = await ownerMap(items, req.userId!)

    const result = items.map(m => {
      const obj = m.toObject()
      if (m.userId !== req.userId) {
        const owner = oMap.get(m.userId)
        return { ...obj, ownerName: owner?.name, ownerAvatarUrl: owner?.avatarUrl ?? null }
      }
      return obj
    })

    res.json(result)
  } catch {
    res.status(500).json({ error: 'Failed to fetch memories' })
  }
}

/** Normalize location string for fuzzy comparison */
function normalizeLoc(loc: string): string {
  return loc.trim().toLowerCase().replace(/[,.\-–]/g, ' ').replace(/\s+/g, ' ')
}

/** Returns true if locations overlap (one contains the other or share a significant token) */
function locationsMatch(a: string, b: string): boolean {
  const na = normalizeLoc(a)
  const nb = normalizeLoc(b)
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.includes(nb) || nb.includes(na)) return true
  // Match if the first meaningful token (city) is shared
  const tokenA = na.split(' ')[0]
  const tokenB = nb.split(' ')[0]
  return tokenA.length > 2 && tokenA === tokenB
}

/** Returns true if two ISO dates fall within ±7 days ignoring the year (annual proximity) */
function isAnnualProximity(dateA: string, dateB: string): boolean {
  const a = new Date(dateA)
  const b = new Date(dateB)
  if (a.getFullYear() === b.getFullYear()) return false
  const dayOfYearA = Math.floor((a.getTime() - new Date(a.getFullYear(), 0, 0).getTime()) / 86400000)
  const dayOfYearB = Math.floor((b.getTime() - new Date(b.getFullYear(), 0, 0).getTime()) / 86400000)
  const diff = Math.abs(dayOfYearA - dayOfYearB)
  return diff <= 7 || diff >= 358 // 358 = 365-7, handles year-boundary wrap
}

/**
 * GET /api/memories/:id/related — top 6 memories relevance-scored against
 * `:id`: +3 per shared tag, +2 fuzzy location match, +1 same month+year,
 * +0.5 same month different year, +1 "annual proximity" (±7 days ignoring
 * year — anniversaries). Minimum score 2 to qualify. Used by the
 * "ПОВ'ЯЗАНІ СПОГАДИ" carousel in MemoryDetail (frontend `fetchRelated`).
 */
export async function getRelated(req: Request, res: Response): Promise<void> {
  const current = await Memory.findOne(visibleFilter(req.userId!, { _id: req.params.id }))
  if (!current) { res.status(404).json({ error: 'Not found' }); return }

  const others = await Memory.find(visibleFilter(req.userId!, { _id: { $ne: current._id } }))

  const currentMonth    = current.date.slice(0, 7)
  const currentYear     = current.date.slice(0, 4)
  const currentTags     = new Set((current.tags ?? []).map(t => t.toLowerCase()))
  const currentLocation = current.location ?? ''

  const scored = others.map(m => {
    let score = 0

    // Tags: +3 per shared tag
    const tags = (m.tags ?? []).map(t => t.toLowerCase())
    score += tags.filter(t => currentTags.has(t)).length * 3

    // Location: fuzzy match +2
    if (currentLocation && locationsMatch(currentLocation, m.location ?? '')) score += 2

    // Same month + year: +1
    if (currentMonth && m.date.slice(0, 7) === currentMonth) score += 1

    // Same month, different year: +0.5
    if (
      currentMonth &&
      m.date.slice(5, 7) === currentMonth.slice(5, 7) &&
      m.date.slice(0, 4) !== currentYear
    ) score += 0.5

    // Annual proximity: ±7 days across years: +1
    if (isAnnualProximity(current.date, m.date)) score += 1

    return { m, score }
  })

  const top = scored
    .filter(s => s.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(s => s.m)

  const oMap = await ownerMap(top, req.userId!)

  const result = top.map(m => {
    const obj = m.toObject()
    if (m.userId !== req.userId) {
      const owner = oMap.get(m.userId)
      return { ...obj, ownerName: owner?.name, ownerAvatarUrl: owner?.avatarUrl ?? null }
    }
    return obj
  })

  res.json(result)
}

export async function create(req: Request, res: Response): Promise<void> {
  const item = await Memory.create({ ...req.body, userId: req.userId })
  res.status(201).json(item)
}

export async function update(req: Request, res: Response): Promise<void> {
  const item = await Memory.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId! },
    req.body,
    { new: true }
  )
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(item)
}

export async function remove(req: Request, res: Response): Promise<void> {
  const item = await Memory.findOneAndDelete({ _id: req.params.id, userId: req.userId! })
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.status(204).end()
}

/** Add photo: owner or tagged member */
export async function addPhoto(req: Request, res: Response): Promise<void> {
  const memory = await Memory.findOne(visibleFilter(req.userId!, { _id: req.params.id }))
  if (!memory) { res.status(404).json({ error: 'Not found' }); return }

  let addedByName = ''
  if (memory.userId !== req.userId!) {
    const contributor = await User.findById(req.userId!, { name: 1 })
    addedByName = contributor?.name ?? ''
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  memory.photos.push({ url: req.body.url, caption: req.body.caption ?? '', addedBy: req.userId!, addedByName } as any)
  await memory.save()
  res.json(memory)
}

/** Delete photo: only memory owner */
export async function deletePhoto(req: Request, res: Response): Promise<void> {
  const memory = await Memory.findOne({ _id: req.params.id, userId: req.userId! })
  if (!memory) { res.status(403).json({ error: 'Forbidden' }); return }

  const photo = memory.photos.find(p => String(p._id) === req.params.photoId)
  if (!photo) { res.status(404).json({ error: 'Photo not found' }); return }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  memory.photos = memory.photos.filter(p => String(p._id) !== req.params.photoId) as any
  await memory.save()
  res.json(memory)
}

/** Update photo caption: only memory owner */
export async function updatePhoto(req: Request, res: Response): Promise<void> {
  const memory = await Memory.findOne({ _id: req.params.id, userId: req.userId! })
  if (!memory) { res.status(403).json({ error: 'Forbidden' }); return }

  const photo = memory.photos.find(p => String(p._id) === req.params.photoId)
  if (!photo) { res.status(404).json({ error: 'Photo not found' }); return }

  if (req.body.caption !== undefined) photo.caption = req.body.caption
  if (req.body.url     !== undefined) photo.url     = req.body.url
  await memory.save()
  res.json(memory)
}

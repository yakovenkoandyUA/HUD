import { Request, Response } from 'express'
import { Space } from '../models/Space'
import { VehicleEvent } from '../models/VehicleEvent'
import { destroyImages, publicIdFromUrl } from '../utils/cloudinary'

/** GET /api/spaces/:id/vehicle/profile */
export async function getVehicleProfile(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    if (space.type !== 'vehicle') { res.status(400).json({ error: 'Not a vehicle space' }); return }
    res.json(space.vehicleProfile ?? {})
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** PATCH /api/spaces/:id/vehicle/profile */
export async function updateVehicleProfile(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    if (space.type !== 'vehicle') { res.status(400).json({ error: 'Not a vehicle space' }); return }

    const allowed = ['make','model','year','plateNumber','vin','frameNumber','currentMileage','fuelType','purchaseDate','photoUrl','nextServiceMileage'] as const
    if (!space.vehicleProfile) {
      space.vehicleProfile = { make:'', model:'', year:null, plateNumber:'', vin:'', frameNumber:'', currentMileage:null, fuelType:'', purchaseDate:null, photoUrl:'', nextServiceMileage:null }
    }
    allowed.forEach(key => {
      if (req.body[key] !== undefined) (space.vehicleProfile as unknown as Record<string, unknown>)[key] = req.body[key]
    })
    await space.save()
    res.json(space.vehicleProfile)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** GET /api/spaces/:id/vehicle/events */
export async function getVehicleEvents(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const { type, limit } = req.query as { type?: string; limit?: string }
    const filter: Record<string, unknown> = { spaceId: req.params.id }
    if (type) filter.type = type

    const events = await VehicleEvent.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit ? parseInt(limit, 10) : 200)

    res.json(events)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** POST /api/spaces/:id/vehicle/events */
export async function createVehicleEvent(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    if (space.type !== 'vehicle') { res.status(400).json({ error: 'Not a vehicle space' }); return }

    const { type, date } = req.body as { type?: string; date?: string }
    if (!type || !date) { res.status(400).json({ error: 'type and date are required' }); return }

    const event = await VehicleEvent.create({
      spaceId:      req.params.id,
      userId:       req.userId,
      type,
      date,
      mileage:      req.body.mileage      ?? null,
      cost:         req.body.cost         ?? null,
      currency:     req.body.currency     ?? 'UAH',
      vendor:       req.body.vendor       ?? '',
      notes:        req.body.notes        ?? '',
      attachments:  req.body.attachments  ?? [],
      liters:       req.body.liters       ?? null,
      fuelType:     req.body.fuelType     ?? '',
      docType:      req.body.docType      ?? '',
      docExpiresAt: req.body.docExpiresAt ?? null,
    })

    // оновити currentMileage в профілі якщо новий пробіг більший
    if (req.body.mileage != null && space.vehicleProfile) {
      const current = space.vehicleProfile.currentMileage
      if (current == null || req.body.mileage > current) {
        space.vehicleProfile.currentMileage = req.body.mileage
        await space.save()
      }
    }

    res.status(201).json(event)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** PATCH /api/spaces/:id/vehicle/events/:eventId */
export async function updateVehicleEvent(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const event = await VehicleEvent.findOne({ _id: req.params.eventId, spaceId: req.params.id })
    if (!event) { res.status(404).json({ error: 'Event not found' }); return }

    const allowed = ['type','date','mileage','cost','currency','vendor','notes','attachments','liters','fuelType','docType','docExpiresAt'] as const
    allowed.forEach(key => {
      if (req.body[key] !== undefined) (event as unknown as Record<string, unknown>)[key] = req.body[key]
    })
    await event.save()
    res.json(event)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** DELETE /api/spaces/:id/vehicle/events/:eventId */
export async function deleteVehicleEvent(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const event = await VehicleEvent.findOneAndDelete({ _id: req.params.eventId, spaceId: req.params.id })
    if (!event) { res.status(404).json({ error: 'Event not found' }); return }

    if (event.attachments?.length) {
      const ids = event.attachments.map(publicIdFromUrl).filter(Boolean) as string[]
      destroyImages(ids).catch(() => {})
    }

    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** GET /api/spaces/:id/vehicle/stats */
export async function getVehicleStats(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const events = await VehicleEvent.find({ spaceId: req.params.id })

    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const thisYear  = String(now.getFullYear())

    let totalCostMonth = 0
    let totalCostYear  = 0
    let totalLiters    = 0
    let fuelMileageStart: number | null = null
    let fuelMileageEnd:   number | null = null

    // documents expiring within 30 days
    const soon = new Date()
    soon.setDate(soon.getDate() + 30)
    const expiringDocs: { docType: string; docExpiresAt: string }[] = []

    for (const e of events) {
      if (e.cost != null) {
        if (e.date.startsWith(thisMonth)) totalCostMonth += e.cost
        if (e.date.startsWith(thisYear))  totalCostYear  += e.cost
      }
      if (e.type === 'fuel' && e.liters != null) {
        totalLiters += e.liters
        if (e.mileage != null) {
          if (fuelMileageStart == null || e.mileage < fuelMileageStart) fuelMileageStart = e.mileage
          if (fuelMileageEnd   == null || e.mileage > fuelMileageEnd)   fuelMileageEnd   = e.mileage
        }
      }
      if (e.type === 'document' && e.docExpiresAt) {
        const exp = new Date(e.docExpiresAt)
        if (exp <= soon && exp >= now) {
          expiringDocs.push({ docType: e.docType, docExpiresAt: e.docExpiresAt })
        }
      }
    }

    // avg fuel consumption l/100km
    let avgFuelConsumption: number | null = null
    if (totalLiters > 0 && fuelMileageStart != null && fuelMileageEnd != null && fuelMileageEnd > fuelMileageStart) {
      avgFuelConsumption = parseFloat(((totalLiters / (fuelMileageEnd - fuelMileageStart)) * 100).toFixed(1))
    }

    // cost per km
    let costPerKm: number | null = null
    if (fuelMileageStart != null && fuelMileageEnd != null && fuelMileageEnd > fuelMileageStart) {
      costPerKm = parseFloat((totalCostYear / (fuelMileageEnd - fuelMileageStart)).toFixed(2))
    }

    res.json({
      totalCostMonth:    parseFloat(totalCostMonth.toFixed(2)),
      totalCostYear:     parseFloat(totalCostYear.toFixed(2)),
      avgFuelConsumption,
      costPerKm,
      currentMileage:    space.vehicleProfile?.currentMileage ?? null,
      expiringDocs,
    })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

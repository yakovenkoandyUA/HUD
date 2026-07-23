import { Request, Response } from 'express'
import { Space } from '../models/Space'
import { Ticket } from '../models/Ticket'

/** GET /api/spaces/:id/tickets */
export async function getTickets(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const tickets = await Ticket.find({ spaceId: req.params.id }).sort({ date: 1, departureTime: 1 })
    res.json(tickets)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** POST /api/spaces/:id/tickets */
export async function createTicket(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    if (space.type !== 'trip') { res.status(400).json({ error: 'Not a trip space' }); return }

    const { transport, date } = req.body as { transport?: string; date?: string }
    if (!transport || !date) { res.status(400).json({ error: 'transport and date are required' }); return }

    const ticket = await Ticket.create({
      spaceId:       req.params.id,
      userId:        req.userId,
      transport,
      date,
      from:          req.body.from          ?? '',
      to:            req.body.to            ?? '',
      departureTime: req.body.departureTime ?? '',
      arrivalTime:   req.body.arrivalTime   ?? '',
      carrier:       req.body.carrier       ?? '',
      flightNumber:  req.body.flightNumber  ?? '',
      seat:          req.body.seat          ?? '',
      bookingCode:   req.body.bookingCode   ?? '',
      attachmentUrl: req.body.attachmentUrl ?? '',
      status:        req.body.status        ?? 'planned',
    })

    res.status(201).json(ticket)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** PATCH /api/spaces/:id/tickets/:ticketId */
export async function updateTicket(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const ticket = await Ticket.findOne({ _id: req.params.ticketId, spaceId: req.params.id })
    if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return }

    const allowed = ['transport','date','from','to','departureTime','arrivalTime','carrier','flightNumber','seat','bookingCode','attachmentUrl','status'] as const
    allowed.forEach(key => {
      if (req.body[key] !== undefined) (ticket as unknown as Record<string, unknown>)[key] = req.body[key]
    })
    await ticket.save()
    res.json(ticket)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** DELETE /api/spaces/:id/tickets/:ticketId */
export async function deleteTicket(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const ticket = await Ticket.findOneAndDelete({ _id: req.params.ticketId, spaceId: req.params.id })
    if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return }

    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

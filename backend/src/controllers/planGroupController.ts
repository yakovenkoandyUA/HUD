import { Request, Response } from 'express'
import { User } from '../models/User'
import { PlanGroupInvite } from '../models/PlanGroupInvite'
import { GROUP_SEATS, isGroupPlan, isOwnPlanActive } from '../utils/planGroup'

function userPublic(u: InstanceType<typeof User>) {
  return {
    id: (u._id as { toString(): string }).toString(),
    name: u.name,
    username: u.username,
    avatarUrl: u.avatarUrl,
  }
}

/** GET /api/plan-group — payer view (members + pending invites) or member view (payer info) */
export async function getPlanGroup(req: Request, res: Response): Promise<void> {
  try {
    const me = await User.findById(req.userId)
    if (!me) { res.status(404).json({ error: 'Not found' }); return }

    const received = await PlanGroupInvite.find({ inviteeId: me._id, status: 'pending' })
    const payerIds = received.map(i => i.payerId)
    const payers = await User.find({ _id: { $in: payerIds } })
    const payerMap = new Map(payers.map(u => [(u._id as { toString(): string }).toString(), u]))
    const receivedInvites = received
      .map(i => {
        const p = payerMap.get(i.payerId.toString())
        return p ? { inviteId: (i._id as { toString(): string }).toString(), ...userPublic(p) } : null
      })
      .filter(Boolean)

    if (isGroupPlan(me.plan) && isOwnPlanActive(me)) {
      const members = await User.find({ planGroupPayerId: me._id })
      const pendingInvites = await PlanGroupInvite.find({ payerId: me._id, status: 'pending' })
      const inviteeIds = pendingInvites.map(i => i.inviteeId)
      const invitees = await User.find({ _id: { $in: inviteeIds } })
      const inviteeMap = new Map(invitees.map(u => [(u._id as { toString(): string }).toString(), u]))

      res.json({
        role: 'payer',
        plan: me.plan,
        seatsLimit: GROUP_SEATS[me.plan],
        seatsUsed: members.length + 1,
        members: members.map(userPublic),
        pendingInvites: pendingInvites
          .map(i => {
            const u = inviteeMap.get(i.inviteeId.toString())
            return u ? { inviteId: (i._id as { toString(): string }).toString(), ...userPublic(u) } : null
          })
          .filter(Boolean),
        receivedInvites,
      })
      return
    }

    if (me.planGroupPayerId) {
      const payer = await User.findById(me.planGroupPayerId)
      if (payer && isGroupPlan(payer.plan) && isOwnPlanActive(payer)) {
        res.json({ role: 'member', plan: payer.plan, payer: userPublic(payer), receivedInvites })
        return
      }
    }

    res.json({ role: 'none', receivedInvites })
  } catch {
    res.status(500).json({ error: 'Failed to fetch plan group' })
  }
}

/** POST /api/plan-group/invite — { identifier } payer invites by username/email */
export async function inviteToGroup(req: Request, res: Response): Promise<void> {
  const identifier = (req.body as { identifier?: string }).identifier?.trim()
  if (!identifier) { res.status(400).json({ error: 'identifier required' }); return }

  try {
    const payer = await User.findById(req.userId)
    if (!payer) { res.status(404).json({ error: 'Not found' }); return }
    if (!isGroupPlan(payer.plan) || !isOwnPlanActive(payer)) {
      res.status(403).json({ error: 'Only active Duo/Group payers can invite' })
      return
    }

    const invitee = await User.findOne({
      _id: { $ne: payer._id },
      $or: [{ username: identifier.toLowerCase() }, { email: identifier.toLowerCase() }],
    })
    if (!invitee) { res.status(404).json({ error: 'User not found' }); return }
    if (invitee.planGroupPayerId?.toString() === payer._id!.toString()) {
      res.status(409).json({ error: 'Already a member' })
      return
    }

    const existingInvite = await PlanGroupInvite.findOne({ payerId: payer._id, inviteeId: invitee._id, status: 'pending' })
    if (existingInvite) { res.status(409).json({ error: 'Invite already pending' }); return }

    const membersCount = await User.countDocuments({ planGroupPayerId: payer._id })
    const pendingCount = await PlanGroupInvite.countDocuments({ payerId: payer._id, status: 'pending' })
    const seatsLimit = GROUP_SEATS[payer.plan]
    if (membersCount + pendingCount + 1 >= seatsLimit) {
      res.status(403).json({ error: 'No seats left', code: 'SEATS_FULL', seatsLimit })
      return
    }

    const invite = await PlanGroupInvite.create({ payerId: payer._id, inviteeId: invitee._id })
    res.status(201).json({ inviteId: (invite._id as { toString(): string }).toString() })
  } catch {
    res.status(500).json({ error: 'Failed to send invite' })
  }
}

/** POST /api/plan-group/invite/:id/accept — invitee accepts */
export async function acceptGroupInvite(req: Request, res: Response): Promise<void> {
  try {
    const invite = await PlanGroupInvite.findOne({ _id: req.params.id, inviteeId: req.userId, status: 'pending' })
    if (!invite) { res.status(404).json({ error: 'Invite not found' }); return }

    const payer = await User.findById(invite.payerId)
    if (!payer || !isGroupPlan(payer.plan) || !isOwnPlanActive(payer)) {
      res.status(410).json({ error: 'Plan no longer active' })
      return
    }

    const membersCount = await User.countDocuments({ planGroupPayerId: payer._id })
    if (membersCount + 1 >= GROUP_SEATS[payer.plan]) {
      res.status(403).json({ error: 'No seats left', code: 'SEATS_FULL' })
      return
    }

    await User.findByIdAndUpdate(req.userId, { planGroupPayerId: payer._id, planGroupJoinedAt: new Date() })
    invite.status = 'accepted'
    invite.respondedAt = new Date()
    await invite.save()
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to accept invite' })
  }
}

/** POST /api/plan-group/invite/:id/decline — invitee declines */
export async function declineGroupInvite(req: Request, res: Response): Promise<void> {
  try {
    const invite = await PlanGroupInvite.findOne({ _id: req.params.id, inviteeId: req.userId, status: 'pending' })
    if (!invite) { res.status(404).json({ error: 'Invite not found' }); return }
    invite.status = 'declined'
    invite.respondedAt = new Date()
    await invite.save()
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to decline invite' })
  }
}

/** DELETE /api/plan-group/invite/:id — payer cancels a pending invite */
export async function cancelGroupInvite(req: Request, res: Response): Promise<void> {
  try {
    const invite = await PlanGroupInvite.findOne({ _id: req.params.id, payerId: req.userId, status: 'pending' })
    if (!invite) { res.status(404).json({ error: 'Invite not found' }); return }
    invite.status = 'cancelled'
    invite.respondedAt = new Date()
    await invite.save()
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to cancel invite' })
  }
}

/** DELETE /api/plan-group/member/:userId — payer removes a member */
export async function removeGroupMember(req: Request, res: Response): Promise<void> {
  try {
    const result = await User.findOneAndUpdate(
      { _id: req.params.userId, planGroupPayerId: req.userId },
      { planGroupPayerId: null, planGroupJoinedAt: null },
    )
    if (!result) { res.status(404).json({ error: 'Member not found' }); return }
    res.status(204).end()
  } catch {
    res.status(500).json({ error: 'Failed to remove member' })
  }
}

/** POST /api/plan-group/leave — member leaves voluntarily */
export async function leaveGroup(req: Request, res: Response): Promise<void> {
  try {
    await User.findByIdAndUpdate(req.userId, { planGroupPayerId: null, planGroupJoinedAt: null })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to leave group' })
  }
}

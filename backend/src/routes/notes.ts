import { Router } from 'express'
import Note from '../models/Note'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { createNoteSchema, updateNoteSchema } from '../validation/schemas'

const router = Router()

router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    const filter: Record<string, unknown> = { userId: req.userId }
    if (req.query.spaceId) filter.spaceId = req.query.spaceId
    const notes = await Note.find(filter).sort({ createdAt: -1 })
    res.json(notes)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', validate(createNoteSchema), async (req, res) => {
  try {
    const { text, spaceId } = req.body as { text: string; spaceId?: string | null }
    const note = await Note.create({ text: text.trim(), userId: req.userId, spaceId: spaceId ?? null })
    res.status(201).json(note)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

router.patch('/:id', validate(updateNoteSchema), async (req, res) => {
  try {
    const { text } = req.body as { text: string }
    const note = await Note.findOne({ _id: req.params.id, userId: req.userId })
    if (!note) return res.status(404).json({ error: 'Not found' })
    note.text = text.trim()
    await note.save()
    res.json(note)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.userId })
    if (!note) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router

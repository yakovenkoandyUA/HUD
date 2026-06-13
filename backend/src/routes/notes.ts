import { Router } from 'express'
import Note from '../models/Note'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { createNoteSchema, updateNoteSchema } from '../validation/schemas'

const router = Router()

router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.userId }).sort({ createdAt: -1 })
    res.json(notes)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', validate(createNoteSchema), async (req, res) => {
  try {
    const { text } = req.body as { text: string }
    const note = await Note.create({ text: text.trim(), userId: req.userId })
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

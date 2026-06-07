import { Router, Request, Response } from 'express'
import WatchlistComment from '../models/WatchlistComment'
import { User } from '../models/User'
import { requireAuth } from '../middleware/auth'

const router = Router({ mergeParams: true })
router.use(requireAuth)

// GET /api/watchlist/:id/comments
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const comments = await WatchlistComment
      .find({ watchlistItemId: req.params.id })
      .sort({ createdAt: 1 })
    res.json(comments)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/watchlist/:id/comments
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { text } = req.body
  if (!text?.trim()) {
    res.status(400).json({ error: 'Text is required' }); return
  }

  try {
    const user = await User.findById(req.userId)
    if (!user) { res.status(404).json({ error: 'User not found' }); return }

    const comment = await WatchlistComment.create({
      watchlistItemId: req.params.id,
      userId:   req.userId,
      username: user.username,
      avatarUrl: user.avatarUrl ?? null,
      text: text.trim(),
    })
    res.status(201).json(comment)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/watchlist/:id/comments/:commentId
router.delete('/:commentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const comment = await WatchlistComment.findOne({
      _id: req.params.commentId,
      userId: req.userId,
    })
    if (!comment) { res.status(404).json({ error: 'Not found' }); return }
    await comment.deleteOne()
    res.status(204).end()
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router

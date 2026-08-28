import { Router } from 'express'
import {
  getTasks, createTask, updateTask, removeTask, getTrash, restoreTask, purgeTask,
  reorderTasks,
  getTodos, createTodo, updateTodo, removeTodo, rollbackImages,
} from '../controllers/sprintController'
import { breakdownTask } from '../controllers/sprintAiController'
import { requireAuth } from '../middleware/auth'
import { requireVerified } from '../middleware/requireVerified'
import { loadUser } from '../middleware/loadUser'
import { requireFeature } from '../utils/entitlements'
import { validate } from '../middleware/validate'
import { createTaskSchema, updateTaskSchema, breakdownTaskSchema } from '../validation/schemas'

const router = Router()

router.use(requireAuth)

router.post('/ai/breakdown', requireVerified, loadUser, requireFeature('sprintAi'), validate(breakdownTaskSchema), breakdownTask)

router.get('/tasks', getTasks)
router.get('/tasks/trash', getTrash)
router.patch('/tasks/reorder', reorderTasks)
router.post('/tasks', validate(createTaskSchema), createTask)
router.patch('/tasks/:id', validate(updateTaskSchema), updateTask)
router.delete('/tasks/:id', removeTask)
router.post('/tasks/:id/restore', restoreTask)
router.delete('/tasks/:id/purge', purgeTask)

router.post('/images/rollback', rollbackImages)

router.get('/todos', getTodos)
router.post('/todos', createTodo)
router.patch('/todos/:id', updateTodo)
router.delete('/todos/:id', removeTodo)

export default router

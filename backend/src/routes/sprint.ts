import { Router } from 'express'
import {
  getTasks, createTask, updateTask, removeTask, getTrash, restoreTask, purgeTask,
  getTodos, createTodo, updateTodo, removeTodo,
} from '../controllers/sprintController'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

router.get('/tasks', getTasks)
router.get('/tasks/trash', getTrash)
router.post('/tasks', createTask)
router.patch('/tasks/:id', updateTask)
router.delete('/tasks/:id', removeTask)
router.post('/tasks/:id/restore', restoreTask)
router.delete('/tasks/:id/purge', purgeTask)

router.get('/todos', getTodos)
router.post('/todos', createTodo)
router.patch('/todos/:id', updateTodo)
router.delete('/todos/:id', removeTodo)

export default router

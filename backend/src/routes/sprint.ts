import { Router } from 'express'
import {
  getTasks, createTask, updateTask, removeTask,
  getTodos, createTodo, updateTodo, removeTodo,
} from '../controllers/sprintController'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

router.get('/tasks', getTasks)
router.post('/tasks', createTask)
router.put('/tasks/:id', updateTask)
router.delete('/tasks/:id', removeTask)

router.get('/todos', getTodos)
router.post('/todos', createTodo)
router.put('/todos/:id', updateTodo)
router.delete('/todos/:id', removeTodo)

export default router

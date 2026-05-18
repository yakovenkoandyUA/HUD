import React, { useState } from 'react'
import TopBar from '../../components/layout/TopBar'
import WeekHeader from '../../components/sprint/WeekHeader'
import SprintProgress from '../../components/sprint/SprintProgress'
import SprintItem from '../../components/sprint/SprintItem'
import LessonItem from '../../components/lessons/LessonItem'
import LessonForm from '../../components/lessons/LessonForm'
import TodoItem from '../../components/sprint/TodoItem'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import PriorityBadge from '../../components/ui/PriorityBadge'
import { useSprintStore } from '../../store/sprintStore'
import { useLessonStore } from '../../store/lessonStore'
import { useUiStore } from '../../store/uiStore'
import { getCurrentWeekStart } from '../../utils/sprint'
import type { Lesson, SprintTask, TodoPriority } from '../../types'
import styles from './Sprint.module.css'

type Tab = 'sprint' | 'lessons' | 'todo'

const Sprint: React.FC = () => {
  const { tasks, addTask, toggleTask, deleteTask, todos, addTodo, addTodos, toggleTodo, deleteTodo } = useSprintStore()
  const { lessons, addLesson, updateLesson, deleteLesson } = useLessonStore()
  const { showToast } = useUiStore()
  const [tab, setTab] = useState<Tab>('sprint')

  // Sprint tab state
  const [showAddTask, setShowAddTask] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskCategory, setTaskCategory] = useState<SprintTask['category']>('dev')

  // Lessons tab state
  const [showAddLesson, setShowAddLesson] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)

  // Todo tab state
  const [showAddTodo, setShowAddTodo] = useState(false)
  const [todoMode, setTodoMode] = useState<'single' | 'list'>('single')
  const [todoTitle, setTodoTitle] = useState('')
  const [todoListText, setTodoListText] = useState('')
  const [todoPriority, setTodoPriority] = useState<TodoPriority>('normal')

  const weekStart = getCurrentWeekStart()
  const weekTasks = tasks.filter((t) => t.weekStart === weekStart)
  const done = weekTasks.filter((t) => t.done).length

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskTitle.trim()) return
    addTask(taskTitle, taskCategory)
    setTaskTitle('')
    setShowAddTask(false)
    showToast('Завдання додано', 'success')
  }

  const handleSaveLesson = (data: Omit<Lesson, 'id'>) => {
    if (editingLesson) {
      updateLesson(editingLesson.id, data)
      showToast('Урок оновлено', 'success')
    } else {
      addLesson(data.title, data.description, data.date)
      showToast('Урок додано', 'success')
    }
    setShowAddLesson(false)
    setEditingLesson(null)
  }

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson)
    setShowAddLesson(true)
  }

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault()
    if (todoMode === 'single') {
      if (!todoTitle.trim()) return
      addTodo(todoTitle.trim(), todoPriority)
      setTodoTitle('')
      showToast('Справу додано', 'success')
    } else {
      const lines = todoListText.split('\n').map((l) => l.trim()).filter(Boolean)
      if (!lines.length) return
      addTodos(lines.map((t) => ({ title: t, priority: todoPriority })))
      setTodoListText('')
      showToast(`Додано ${lines.length} справ`, 'success')
    }
    setShowAddTodo(false)
  }

  const CATEGORIES: SprintTask['category'][] = ['mentorship', 'dev', 'personal', 'learning']
  const CATEGORY_LABEL: Record<SprintTask['category'], string> = {
    mentorship: 'Менторство', dev: 'Розробка', personal: 'Особисте', learning: 'Навчання',
  }

  const PRIORITIES: TodoPriority[] = ['urgent', 'normal', 'low']

  const sortedTodos = [...todos].sort((a, b) => {
    const order = { urgent: 0, normal: 1, low: 2 }
    return order[a.priority] - order[b.priority]
  })

  return (
		<div className={styles.screen}>
			<TopBar title="Sprint" />
			<div className={styles.tabs}>
				<button className={`${styles.tab} ${tab === 'sprint' ? styles.active : ''}`} onClick={() => setTab('sprint')}>
					Спрінти
				</button>
				{/* <button className={`${styles.tab} ${tab === 'lessons' ? styles.active : ''}`} onClick={() => setTab('lessons')}>Уроки</button> */}
				<button className={`${styles.tab} ${tab === 'todo' ? styles.active : ''}`} onClick={() => setTab('todo')}>
					Запаси
				</button>
			</div>
			<div className={styles.content}>
				{tab === 'sprint' && (
					<>
						<WeekHeader weekStart={weekStart} />
						<SprintProgress done={done} total={weekTasks.length} />
						<Button fullWidth onClick={() => setShowAddTask(true)}>
							Завдання
						</Button>
						<ul className={styles.list}>
							{weekTasks.map(t => (
								<SprintItem key={t.id} task={t} onToggle={() => toggleTask(t.id)} onDelete={() => deleteTask(t.id)} />
							))}
						</ul>
						{weekTasks.length === 0 && <p className={styles.empty}>Завдань на цей тиждень немає</p>}
					</>
				)}
				{tab === 'lessons' && (
					<>
						<Button
							fullWidth
							onClick={() => {
								setEditingLesson(null)
								setShowAddLesson(true)
							}}
						>
							Урок
						</Button>
						<ul className={styles.lessonList}>
							{lessons.map(l => (
								<LessonItem key={l.id} lesson={l} onEdit={() => handleEditLesson(l)} onDelete={() => deleteLesson(l.id)} />
							))}
						</ul>
						{lessons.length === 0 && <p className={styles.empty}>Уроків ще немає</p>}
					</>
				)}
				{tab === 'todo' && (
					<>
						<Button fullWidth onClick={() => setShowAddTodo(true)}>
							Новий припас
						</Button>
						<ul className={styles.list}>
							{sortedTodos.map(t => (
								<TodoItem key={t.id} todo={t} onToggle={() => toggleTodo(t.id)} onDelete={() => deleteTodo(t.id)} />
							))}
						</ul>
						{todos.length === 0 && <p className={styles.empty}>Список справ порожній</p>}
					</>
				)}
			</div>

			<Modal isOpen={showAddTask} onClose={() => setShowAddTask(false)} title="Нове завдання">
				<form onSubmit={handleAddTask} className={styles.taskForm}>
					<Input label="Назва" value={taskTitle} onChange={setTaskTitle} placeholder="Що потрібно зробити?" />
					<div className={styles.catRow}>
						{CATEGORIES.map(c => (
							<button key={c} type="button" className={`${styles.catBtn} ${taskCategory === c ? styles.catActive : ''}`} onClick={() => setTaskCategory(c)}>
								{CATEGORY_LABEL[c]}
							</button>
						))}
					</div>
					<Button type="submit" fullWidth>
						Додати
					</Button>
				</form>
			</Modal>

			<Modal
				isOpen={showAddLesson}
				onClose={() => {
					setShowAddLesson(false)
					setEditingLesson(null)
				}}
				title={editingLesson ? 'Редагувати урок' : 'Новий урок'}
			>
				<LessonForm
					initial={editingLesson ?? undefined}
					onSave={handleSaveLesson}
					onCancel={() => {
						setShowAddLesson(false)
						setEditingLesson(null)
					}}
				/>
			</Modal>

			<Modal isOpen={showAddTodo} onClose={() => setShowAddTodo(false)} title="Нова справа">
				<form onSubmit={handleAddTodo} className={styles.taskForm}>
					<div className={styles.modeRow}>
						<button type="button" className={`${styles.modeBtn} ${todoMode === 'single' ? styles.modeBtnActive : ''}`} onClick={() => setTodoMode('single')}>
							Одна річ
						</button>
						<button type="button" className={`${styles.modeBtn} ${todoMode === 'list' ? styles.modeBtnActive : ''}`} onClick={() => setTodoMode('list')}>
							Закупиться на повну
						</button>
					</div>
					<div className={styles.priorityRow}>
						{PRIORITIES.map(p => (
							<button key={p} type="button" className={`${styles.priBtn} ${todoPriority === p ? styles.priBtnActive : ''}`} onClick={() => setTodoPriority(p)} aria-label={p}>
								<PriorityBadge priority={p} />
							</button>
						))}
					</div>
					{todoMode === 'single' ? (
						<input className={styles.todoInput} value={todoTitle} onChange={e => setTodoTitle(e.target.value)} placeholder="Що треба зробити/купити?" autoFocus />
					) : (
						<textarea
							className={styles.todoTextarea}
							value={todoListText}
							onChange={e => setTodoListText(e.target.value)}
							placeholder={'Кожен рядок — окремий пункт:\nМолоко\nХліб\nКорм для кота'}
							rows={4}
							autoFocus
						/>
					)}
					<Button type="submit" fullWidth>
						Додати
					</Button>
				</form>
			</Modal>
		</div>
	)
}

export default Sprint

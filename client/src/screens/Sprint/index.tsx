import React, { useState } from 'react'
import TopBar from '../../components/layout/TopBar'
import WeekHeader from '../../components/sprint/WeekHeader'
import SprintProgress from '../../components/sprint/SprintProgress'
import SprintItem from '../../components/sprint/SprintItem'
import LessonItem from '../../components/lessons/LessonItem'
import LessonForm from '../../components/lessons/LessonForm'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import { useSprintStore } from '../../store/sprintStore'
import { useLessonStore } from '../../store/lessonStore'
import { useUiStore } from '../../store/uiStore'
import { getCurrentWeekStart } from '../../utils/sprint'
import type { Lesson, SprintTask } from '../../types'
import styles from './Sprint.module.css'

type Tab = 'sprint' | 'lessons'

const Sprint: React.FC = () => {
  const { tasks, addTask, toggleTask, deleteTask } = useSprintStore()
  const { lessons, addLesson, updateLesson, deleteLesson } = useLessonStore()
  const { showToast } = useUiStore()
  const [tab, setTab] = useState<Tab>('sprint')
  const [showAddTask, setShowAddTask] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskCategory, setTaskCategory] = useState<SprintTask['category']>('dev')
  const [showAddLesson, setShowAddLesson] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)

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

  const CATEGORIES: SprintTask['category'][] = ['mentorship', 'dev', 'personal', 'learning']
  const CATEGORY_LABEL: Record<SprintTask['category'], string> = {
    mentorship: 'Менторство', dev: 'Розробка', personal: 'Особисте', learning: 'Навчання',
  }

  return (
    <div className={styles.screen}>
      <TopBar title="Sprint" />
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'sprint' ? styles.active : ''}`} onClick={() => setTab('sprint')}>Спрінти</button>
        <button className={`${styles.tab} ${tab === 'lessons' ? styles.active : ''}`} onClick={() => setTab('lessons')}>Уроки</button>
      </div>
      <div className={styles.content}>
        {tab === 'sprint' && (
          <>
            <WeekHeader weekStart={weekStart} />
            <SprintProgress done={done} total={weekTasks.length} />
            <Button fullWidth onClick={() => setShowAddTask(true)}>+ Завдання</Button>
            <ul className={styles.list}>
              {weekTasks.map((t) => (
                <SprintItem key={t.id} task={t} onToggle={() => toggleTask(t.id)} onDelete={() => deleteTask(t.id)} />
              ))}
            </ul>
            {weekTasks.length === 0 && <p className={styles.empty}>Завдань на цей тиждень немає</p>}
          </>
        )}
        {tab === 'lessons' && (
          <>
            <Button fullWidth onClick={() => { setEditingLesson(null); setShowAddLesson(true) }}>+ Урок</Button>
            <ul className={styles.lessonList}>
              {lessons.map((l) => (
                <LessonItem key={l.id} lesson={l} onEdit={() => handleEditLesson(l)} onDelete={() => deleteLesson(l.id)} />
              ))}
            </ul>
            {lessons.length === 0 && <p className={styles.empty}>Уроків ще немає</p>}
          </>
        )}
      </div>

      <Modal isOpen={showAddTask} onClose={() => setShowAddTask(false)} title="Нове завдання">
        <form onSubmit={handleAddTask} className={styles.taskForm}>
          <Input label="Назва" value={taskTitle} onChange={setTaskTitle} placeholder="Що потрібно зробити?" />
          <div className={styles.catRow}>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`${styles.catBtn} ${taskCategory === c ? styles.catActive : ''}`}
                onClick={() => setTaskCategory(c)}
              >
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
          <Button type="submit" fullWidth>Додати</Button>
        </form>
      </Modal>

      <Modal
        isOpen={showAddLesson}
        onClose={() => { setShowAddLesson(false); setEditingLesson(null) }}
        title={editingLesson ? 'Редагувати урок' : 'Новий урок'}
      >
        <LessonForm
          initial={editingLesson ?? undefined}
          onSave={handleSaveLesson}
          onCancel={() => { setShowAddLesson(false); setEditingLesson(null) }}
        />
      </Modal>
    </div>
  )
}

export default Sprint

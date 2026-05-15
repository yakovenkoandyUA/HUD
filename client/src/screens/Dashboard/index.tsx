import React, { useState } from 'react'
import TopBar from '../../components/layout/TopBar'
import ClockBlock from '../../components/dashboard/ClockBlock'
import BalanceMini from '../../components/dashboard/BalanceMini'
import NextRaceMini from '../../components/dashboard/NextRaceMini'
import SprintMini from '../../components/dashboard/SprintMini'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import TopupForm from '../../components/finance/TopupForm'
import { useFinanceStore } from '../../store/financeStore'
import { useSprintStore } from '../../store/sprintStore'
import { useUiStore } from '../../store/uiStore'
import { F1_SEASON_2025 } from '../../data/f1Season2025'
import { getNextRace, getDaysToRace } from '../../utils/f1'
import { calcDailyBudget } from './helpers'
import { getCurrentWeekStart } from '../../utils/sprint'
import styles from './Dashboard.module.css'

const Dashboard: React.FC = () => {
  const { balance, addTopup } = useFinanceStore()
  const { tasks, addTask } = useSprintStore()
  const { showToast } = useUiStore()
  const [showTopup, setShowTopup] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')

  const nextRace = getNextRace(F1_SEASON_2025)
  const daysToRace = nextRace ? getDaysToRace(nextRace) : 0
  const dailyBudget = calcDailyBudget(balance)
  const weekStart = getCurrentWeekStart()
  const weekTasks = tasks.filter((t) => t.weekStart === weekStart)

  const handleTopup = (amount: number, description: string) => {
    addTopup(amount, description)
    setShowTopup(false)
    showToast(`+${amount} ₴ додано`, 'success')
  }

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskTitle.trim()) return
    addTask(taskTitle, 'dev')
    setTaskTitle('')
    setShowAddTask(false)
    showToast('Завдання додано', 'success')
  }

  return (
    <div className={styles.screen}>
      <TopBar />
      <div className={styles.content}>
        <ClockBlock />
        <div className={styles.grid}>
          <BalanceMini balance={balance} dailyBudget={dailyBudget} />
          <NextRaceMini race={nextRace} daysLeft={daysToRace} />
        </div>
        <SprintMini tasks={weekTasks} />
        <div className={styles.actions}>
          <Button variant="primary" fullWidth onClick={() => setShowTopup(true)}>+ Витрата</Button>
          <Button variant="secondary" fullWidth onClick={() => setShowAddTask(true)}>+ Завдання</Button>
        </div>
      </div>

      <Modal isOpen={showTopup} onClose={() => setShowTopup(false)} title="Додати витрату">
        <TopupForm onTopup={handleTopup} />
      </Modal>

      <Modal isOpen={showAddTask} onClose={() => setShowAddTask(false)} title="Нове завдання">
        <form onSubmit={handleAddTask} className={styles.taskForm}>
          <input
            className={styles.taskInput}
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="Назва завдання..."
            autoFocus
          />
          <Button type="submit" fullWidth>Додати</Button>
        </form>
      </Modal>
    </div>
  )
}

export default Dashboard

import React, { useState } from 'react'
import TopBar from '../../components/layout/TopBar'
import BalanceMini from '../../components/dashboard/BalanceMini'
import NextRaceMini from '../../components/dashboard/NextRaceMini'
import SprintMini from '../../components/dashboard/SprintMini'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import ExpenseForm from '../../components/finance/ExpenseForm'
import { useFinanceStore } from '../../store/financeStore'
import { useSprintStore } from '../../store/sprintStore'
import { useUiStore } from '../../store/uiStore'
import { F1_SEASON_2026 } from '../../data/f1Season2026'
import { getNextRace, getDaysToRace } from '../../utils/f1'
import { calcDailyBudget } from './helpers'
import { getCurrentWeekStart } from '../../utils/sprint'
import type { ExpenseCategory } from '../../types'
import styles from './Dashboard.module.css'

const Dashboard: React.FC = () => {
  const { balance, addExpense } = useFinanceStore()
  const { tasks, addTask } = useSprintStore()
  const { showToast } = useUiStore()
  const [showExpense, setShowExpense] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')

  const nextRace = getNextRace(F1_SEASON_2026)
  const daysToRace = nextRace ? getDaysToRace(nextRace) : 0
  const dailyBudget = calcDailyBudget(balance)
  const weekStart = getCurrentWeekStart()
  const weekTasks = tasks.filter((t) => t.weekStart === weekStart)

  const handleExpense = (amount: number, description: string, category?: string) => {
    addExpense(amount, description, category as ExpenseCategory | undefined)
    setShowExpense(false)
    showToast(`−${amount} ₴ витрачено`, 'info')
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
      <TopBar showClock />
      <div className={styles.content}>
        <div className={styles.grid}>
          <BalanceMini balance={balance} dailyBudget={dailyBudget} />
          <NextRaceMini race={nextRace} daysLeft={daysToRace} />
        </div>
        <SprintMini tasks={weekTasks} />
        <div className={styles.actions}>
          <Button variant="primary" fullWidth onClick={() => setShowExpense(true)}>Витрата</Button>
          <Button variant="secondary" fullWidth onClick={() => setShowAddTask(true)}>Завдання</Button>
        </div>
      </div>

      <Modal isOpen={showExpense} onClose={() => setShowExpense(false)} title="Додати витрату">
        <ExpenseForm onExpense={handleExpense} />
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

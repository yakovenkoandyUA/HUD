import React, { useState } from 'react'
import TopBar from '../../components/layout/TopBar'
import HeroCard from '../../components/dashboard/HeroCard'
import SprintMini from '../../components/dashboard/SprintMini'
import TodosMini from '../../components/dashboard/TodosMini'
import LessonsMini from '../../components/dashboard/LessonsMini'
import Modal from '../../components/ui/Modal'
import CarHero from '../../components/dashboard/CarHero'
import ExpenseForm from '../../components/finance/ExpenseForm'
import { useFinanceStore } from '../../store/financeStore'
import { useSprintStore } from '../../store/sprintStore'
import { useLessonStore } from '../../store/lessonStore'
import { useUiStore } from '../../store/uiStore'
import { F1_SEASON_2026 } from '../../data/f1Season2026'
import { getNextRace } from '../../utils/f1'
import { calcDailyBudget } from './helpers'
import { getCurrentWeekStart } from '../../utils/sprint'
import type { ExpenseCategory } from '../../types'
import styles from './Dashboard.module.css'

const Dashboard: React.FC = () => {
  const { balance, transactions, addExpense } = useFinanceStore()
  const { tasks } = useSprintStore()
  const { lessons } = useLessonStore()
  const { showToast } = useUiStore()
  const [showExpense, setShowExpense] = useState(false)

  const nextRace = getNextRace(F1_SEASON_2026)
  const dailyBudget = calcDailyBudget(balance)
  const weekStart = getCurrentWeekStart()
  const weekTasks = tasks.filter((t) => t.weekStart === weekStart)

  const today = new Date().toISOString().split('T')[0]
  const todaySpent = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(today))
    .reduce((sum, t) => sum + t.amount, 0)

  const handleExpense = (amount: number, description: string, category?: string) => {
    addExpense(amount, description, category as ExpenseCategory | undefined)
    setShowExpense(false)
    showToast(`−${amount} ₴ витрачено`, 'info')
  }

  return (
    <div className={styles.screen}>
      <TopBar showClock />
      <div className={styles.content}>
        <HeroCard
          balance={balance}
          dailyBudget={dailyBudget}
          todaySpent={todaySpent}
          race={nextRace}
        />
        <SprintMini tasks={weekTasks} />
        <TodosMini />
        <LessonsMini lessons={lessons} />
        <div className={styles.heroWrap}>
          <CarHero />
        </div>
      </div>

      <button
        type="button"
        className={styles.fab}
        onClick={() => setShowExpense(true)}
        aria-label="Додати витрату"
      >
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <path d="M3 11h16M11 3v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      <Modal isOpen={showExpense} onClose={() => setShowExpense(false)} title="Додати витрату">
        <ExpenseForm onExpense={handleExpense} />
      </Modal>
    </div>
  )
}

export default Dashboard

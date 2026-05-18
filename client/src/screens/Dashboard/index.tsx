import React, { useState } from 'react'
import TopBar from '../../components/layout/TopBar'
import BalanceMini from '../../components/dashboard/BalanceMini'
import NextRaceMini from '../../components/dashboard/NextRaceMini'
import SprintMini from '../../components/dashboard/SprintMini'
import TodosMini from '../../components/dashboard/TodosMini'
import LessonsMini from '../../components/dashboard/LessonsMini'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import CarHero from '../../components/dashboard/CarHero'
import ExpenseForm from '../../components/finance/ExpenseForm'
import { useFinanceStore } from '../../store/financeStore'
import { useSprintStore } from '../../store/sprintStore'
import { useLessonStore } from '../../store/lessonStore'
import { useUiStore } from '../../store/uiStore'
import { F1_SEASON_2026 } from '../../data/f1Season2026'
import { getNextRace, getDaysToRace } from '../../utils/f1'
import { calcDailyBudget } from './helpers'
import { getCurrentWeekStart } from '../../utils/sprint'
import type { ExpenseCategory } from '../../types'
import styles from './Dashboard.module.css'

const Dashboard: React.FC = () => {
  const { balance, addExpense } = useFinanceStore()
  const { tasks } = useSprintStore()
  const { lessons } = useLessonStore()
  const { showToast } = useUiStore()
  const [showExpense, setShowExpense] = useState(false)

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

  return (
		<div className={styles.screen}>
			<TopBar showClock />
			<div className={styles.content}>
				<div className={styles.grid}>
					<BalanceMini balance={balance} dailyBudget={dailyBudget} />
					<NextRaceMini race={nextRace} daysLeft={daysToRace} />
				</div>
				<SprintMini tasks={weekTasks} />
				<TodosMini />
				<LessonsMini lessons={lessons} />
				<div className={styles.actions}>
					<Button variant="primary" fullWidth onClick={() => setShowExpense(true)}>
						Витрата
					</Button>
				</div>
				<div className={styles.heroWrap}>
					<CarHero />
				</div>
			</div>

			<Modal isOpen={showExpense} onClose={() => setShowExpense(false)} title="Додати витрату">
				<ExpenseForm onExpense={handleExpense} />
			</Modal>
		</div>
	)
}

export default Dashboard

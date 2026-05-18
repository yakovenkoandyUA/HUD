import React, { useState } from 'react'
import TopBar from '../../components/layout/TopBar'
import BalanceHero from '../../components/finance/BalanceHero'
import TodayCard from '../../components/finance/TodayCard'
import StatsGrid from '../../components/finance/StatsGrid'
import ShoppingTracker from '../../components/finance/ShoppingTracker'
import GoalsList from '../../components/finance/GoalsList'
import TopupForm from '../../components/finance/TopupForm'
import ExpenseForm from '../../components/finance/ExpenseForm'
import TransactionList from '../../components/finance/TransactionList'
import Modal from '../../components/ui/Modal'
import { useFinanceStore } from '../../store/financeStore'
import { useUiStore } from '../../store/uiStore'
import { getDaysLeftInMonth, getDaysElapsed, calcDailyBudget } from '../../utils/finance'
import type { ExpenseCategory } from '../../types'
import styles from './Finance.module.css'

const IconExpense: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path d="M7.5 2v11M3 9.5l4.5 4 4.5-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const IconTopup: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path d="M7.5 13V2M3 5.5l4.5-4 4.5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const Finance: React.FC = () => {
  const { balance, transactions, addTopup, addExpense, deleteTransaction } = useFinanceStore()
  const { showToast } = useUiStore()
  const [showTopup, setShowTopup] = useState(false)
  const [showExpense, setShowExpense] = useState(false)

  const daysLeft = getDaysLeftInMonth()
  const daysElapsed = getDaysElapsed()
  const dailyBudget = calcDailyBudget(balance)

  const today = new Date().toISOString().slice(0, 10)
  const todaySpent = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(today))
    .reduce((s, t) => s + t.amount, 0)

  const monthStart = new Date().toISOString().slice(0, 7)
  const totalTopup = transactions
    .filter((t) => t.type === 'topup' && t.date.startsWith(monthStart))
    .reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(monthStart))
    .reduce((s, t) => s + t.amount, 0)

  const progressPct = totalTopup > 0 ? Math.round((totalExpense / totalTopup) * 100) : 0
  const bonus = dailyBudget * daysElapsed - totalExpense

  const handleTopup = (amount: number, description: string) => {
    addTopup(amount, description)
    setShowTopup(false)
    showToast(`+${amount} ₴ додано`, 'success')
  }

  const handleExpense = (amount: number, description: string, category?: string) => {
    addExpense(amount, description, category as ExpenseCategory | undefined)
    setShowExpense(false)
    showToast(`−${amount} ₴ витрачено`, 'info')
  }

  const handleDelete = (id: string) => {
    deleteTransaction(id)
    showToast('Транзакцію видалено', 'info')
  }

  return (
		<div className={styles.screen}>
			<TopBar title="Фінанси" />
			<div className={styles.content}>
				<GoalsList />

				<BalanceHero balance={balance} dailyBudget={dailyBudget} monthSpent={totalExpense} daysLeft={daysLeft} progressPct={progressPct} />

				<TodayCard todaySpent={todaySpent} dailyBudget={dailyBudget} />

				<StatsGrid totalTopup={totalTopup} totalExpense={totalExpense} daysLeft={daysLeft} bonus={bonus} />

				<div className={styles.actions}>
					<button className={styles.btnExpense} onClick={() => setShowExpense(true)}>
						<IconExpense />
						Витрата
					</button>
					<button className={styles.btnTopup} onClick={() => setShowTopup(true)}>
						<IconTopup />
						Поповнення
					</button>
				</div>

				<ShoppingTracker transactions={transactions} />

				<div className={styles.section}>
					<h3 className={styles.sectionTitle}>Останні транзакції</h3>
					<TransactionList transactions={transactions} onDelete={handleDelete} />
				</div>
			</div>

			<Modal isOpen={showTopup} onClose={() => setShowTopup(false)} title="Поповнення">
				<TopupForm onTopup={handleTopup} />
			</Modal>

			<Modal isOpen={showExpense} onClose={() => setShowExpense(false)} title="Витрата">
				<ExpenseForm onExpense={handleExpense} />
			</Modal>
		</div>
	)
}

export default Finance

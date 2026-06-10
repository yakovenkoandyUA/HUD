import React, { useState, useEffect } from 'react'
import AppHeader from '../../components/AppHeader'
import BalanceHero from '../../components/finance/BalanceHero'
import GoalsList from '../../components/finance/GoalsList'
import TopupForm from '../../components/finance/TopupForm'
import ExpenseForm from '../../components/finance/ExpenseForm'
import TransactionList from '../../components/finance/TransactionList'
// import ExpenseChart from '../../components/finance/ExpenseChart'
import MonthlyReport from '../../components/finance/MonthlyReport'
import RecurringPayments from '../../components/finance/RecurringPayments'
import ShoppingTracker from '../../components/finance/ShoppingTracker'
import Modal from '../../components/ui/Modal'
import { useFinanceStore } from '../../store/financeStore'
import { useUiStore } from '../../store/uiStore'
import { getDaysLeftInMonth, getDaysElapsed, calcDailyBudget, getPeriodStart, fmt } from '../../utils/finance'
import { getToken } from '../../services/api'
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
  const { balance, transactions, addTopup, addExpense, deleteTransaction, fetchTransactions } = useFinanceStore()
  const { showToast } = useUiStore()
  const [showTopup, setShowTopup] = useState(false)
  const [showExpense, setShowExpense] = useState(false)

  useEffect(() => {
    if (!getToken()) return
    fetchTransactions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const daysLeft = getDaysLeftInMonth()
  const daysElapsed = getDaysElapsed()
  const dailyBudget = calcDailyBudget(balance)

  const today = new Date().toISOString().slice(0, 10)
  const todaySpent = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(today))
    .reduce((s, t) => s + t.amount, 0)

  const periodStart = getPeriodStart()
  const totalTopup = transactions
    .filter((t) => t.type === 'topup' && t.date >= periodStart)
    .reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions
    .filter((t) => t.type === 'expense' && t.date >= periodStart)
    .reduce((s, t) => s + t.amount, 0)

  const progressPct = totalTopup > 0 ? Math.round((totalExpense / totalTopup) * 100) : 0
  const avgPerDay = daysElapsed > 0 ? Math.round(totalExpense / daysElapsed) : 0
  const delta = dailyBudget - todaySpent

  const handleTopup = (amount: number, description: string) => {
    addTopup(amount, description)
    setShowTopup(false)
    showToast(`+${amount} ₴ додано`, 'success')
  }

  const handleExpense = (amount: number, description: string, category?: string) => {
    addExpense(amount, description, category)
    setShowExpense(false)
    showToast(`−${amount} ₴ витрачено`, 'info')
  }

  const handleDelete = (id: string) => {
    deleteTransaction(id)
    showToast('Транзакцію видалено', 'info')
  }

  return (
		<div className={styles.screen}>
			<AppHeader />
			<div className={styles.content}>
				<BalanceHero balance={balance} dailyBudget={dailyBudget} monthSpent={totalExpense} daysLeft={daysLeft} progressPct={progressPct} todaySpent={todaySpent} />

				<GoalsList />

				<RecurringPayments />

				{/* ── Merged TodayCard + StatsGrid ── */}
				<div className={styles.statsCard}>
					<div className={styles.statsToday}>
						<span className={styles.statsTodayLabel}>Сьогодні</span>
						<span className={styles.statsTodayValue}>{fmt(todaySpent)} ₴</span>
						<span className={`${styles.statsTodayDelta} ${delta >= 0 ? styles.pos : styles.neg}`}>
							{delta >= 0 ? '+' : ''}
							{fmt(delta)} ₴ від бюджету
						</span>
					</div>
					<div className={styles.statsCardDivider} />
					<div className={styles.statsRow}>
						<div className={styles.statsTile}>
							<span className={styles.statsTileLabel}>Поповнення</span>
							<span className={`${styles.statsTileValue} ${styles.accent}`}>{fmt(totalTopup)} ₴</span>
						</div>
						<div className={styles.statsTile}>
							<span className={styles.statsTileLabel}>Витрати</span>
							<span className={`${styles.statsTileValue} ${styles.neg}`}>{fmt(totalExpense)} ₴</span>
						</div>
					</div>
					<div className={styles.statsRow}>
						<div className={styles.statsTile}>
							<span className={styles.statsTileLabel}>Днів залишилось</span>
							<span className={styles.statsTileValue}>{daysLeft}</span>
						</div>
						<div className={styles.statsTile}>
							<span className={styles.statsTileLabel}>Середнє/день</span>
							<span className={`${styles.statsTileValue} ${avgPerDay <= dailyBudget ? styles.accent : styles.neg}`}>{fmt(avgPerDay)} ₴</span>
						</div>
					</div>
				</div>

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

				{/* <ExpenseChart transactions={transactions} /> */}
				<ShoppingTracker transactions={transactions} />
				<MonthlyReport transactions={transactions} />

				<div className={styles.section}>
					<TransactionList transactions={transactions} onDelete={handleDelete} />
				</div>
			</div>

			<Modal isOpen={showTopup} onClose={() => setShowTopup(false)} title="Поповнення" draggable>
				<TopupForm onTopup={handleTopup} />
			</Modal>

			<Modal isOpen={showExpense} onClose={() => setShowExpense(false)} title="Витрата" draggable>
				<ExpenseForm onExpense={handleExpense} />
			</Modal>
		</div>
	)
}

export default Finance

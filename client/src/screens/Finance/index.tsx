import React, { useState } from 'react'
import TopBar from '../../components/layout/TopBar'
import BalanceHero from '../../components/finance/BalanceHero'
import TodayCard from '../../components/finance/TodayCard'
import StatsGrid from '../../components/finance/StatsGrid'
import TopupForm from '../../components/finance/TopupForm'
import ExpenseForm from '../../components/finance/ExpenseForm'
import TransactionList from '../../components/finance/TransactionList'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { useFinanceStore } from '../../store/financeStore'
import { useUiStore } from '../../store/uiStore'
import { getDaysLeftInMonth, getDaysElapsed, calcDailyBudget } from '../../utils/finance'
import styles from './Finance.module.css'

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

  const handleExpense = (amount: number, description: string) => {
    addExpense(amount, description)
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
        <BalanceHero
          balance={balance}
          dailyBudget={dailyBudget}
          monthSpent={totalExpense}
          daysLeft={daysLeft}
          progressPct={progressPct}
        />
        <TodayCard todaySpent={todaySpent} dailyBudget={dailyBudget} />
        <StatsGrid totalTopup={totalTopup} totalExpense={totalExpense} daysLeft={daysLeft} bonus={bonus} />
        <div className={styles.actions}>
          <Button fullWidth onClick={() => setShowExpense(true)}>+ Витрата</Button>
          <Button variant="secondary" fullWidth onClick={() => setShowTopup(true)}>+ Поповнення</Button>
        </div>
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

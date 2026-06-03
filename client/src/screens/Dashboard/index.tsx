import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader'
import HeroCard from '../../components/dashboard/HeroCard'
import RaceHeroCard from '../../components/dashboard/RaceHeroCard'
import TasksAccordion from '../../components/dashboard/TasksAccordion'
import NasaApod from '../../components/dashboard/NasaApod'
import WeekHeader from '../../components/sprint/WeekHeader'
import Modal from '../../components/ui/Modal'
import ExpenseForm from '../../components/finance/ExpenseForm'
import { useNasaApod } from '../../hooks/useNasaApod'
import { useFinanceStore } from '../../store/financeStore'
import { useSprintStore } from '../../store/sprintStore'
import { useUiStore } from '../../store/uiStore'
import { F1_SEASON_2026 } from '../../data/f1Season2026'
import { getNextRace, getRaceThisWeek } from '../../utils/f1'
import { getCurrentWeekStart, isRecurring } from '../../utils/sprint'
import { calcDailyBudget } from './helpers'
import type { ExpenseCategory } from '../../types'
import styles from './Dashboard.module.css'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { balance, transactions, addExpense, fetchTransactions } = useFinanceStore()
  const sprintItems  = useSprintStore(s => s.items)
  const routineItems = sprintItems.filter(t => isRecurring(t))
  const { showToast, theme } = useUiStore()
  const [showExpense, setShowExpense] = useState(false)
  const [showApod, setShowApod] = useState(false)
  const { data: apodData, loading: apodLoading, error: apodError, fetchApod } = useNasaApod()

  useEffect(() => {
    fetchTransactions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogoLongPress = useCallback(() => {
    setShowApod(true)
    fetchApod()
  }, [fetchApod])
  const isRetro = theme === 'retro'
  const bgRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const content = contentRef.current
    const bg = bgRef.current
    if (!content || !bg) return
    const onScroll = () => {
      bg.style.transform = `translateY(${-content.scrollTop * 0.3}px)`
    }
    content.addEventListener('scroll', onScroll, { passive: true })
    return () => content.removeEventListener('scroll', onScroll)
  }, [isRetro])

  const nextRace      = getNextRace(F1_SEASON_2026)
  const raceThisWeek  = getRaceThisWeek(F1_SEASON_2026)
  const weekStart     = getCurrentWeekStart()
  const dailyBudget   = calcDailyBudget(balance)
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
      {isRetro && <div ref={bgRef} className={styles.bg} />}
      <AppHeader onLogoLongPress={handleLogoLongPress} />
      <div ref={contentRef} className={styles.content}>
        {raceThisWeek ? (
          <RaceHeroCard race={raceThisWeek} onClick={() => navigate(`/f1/${raceThisWeek.round}`)} />
        ) : (
          <WeekHeader weekStart={weekStart} hideTitle routineItems={routineItems} />
        )}
        <TasksAccordion />
        <HeroCard
          balance={balance}
          dailyBudget={dailyBudget}
          todaySpent={todaySpent}
          race={nextRace}
          compact={!!raceThisWeek}
        />
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

      <Modal isOpen={showExpense} onClose={() => setShowExpense(false)} title="Додати витрату" draggable>
        <ExpenseForm onExpense={handleExpense} />
      </Modal>

      <NasaApod
        isOpen={showApod}
        onClose={() => setShowApod(false)}
        data={apodData}
        loading={apodLoading}
        error={apodError}
      />
    </div>
  )
}

export default Dashboard

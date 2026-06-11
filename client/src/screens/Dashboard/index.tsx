import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader'
import GreetingBlock from '../../components/dashboard/GreetingBlock'
import HeroCard from '../../components/dashboard/HeroCard'
import RaceHeroCard from '../../components/dashboard/RaceHeroCard'
import TasksAccordion from '../../components/dashboard/TasksAccordion'
import WeekHeader from '../../components/sprint/WeekHeader'
import Modal from '../../components/ui/Modal'
import ExpenseForm from '../../components/finance/ExpenseForm'
import { useFinanceStore } from '../../store/financeStore'
import { useSprintStore } from '../../store/sprintStore'
import { fmt } from '../../utils/finance'
import { useUiStore } from '../../store/uiStore'
import { useProfileStore } from '../../store/profileStore'
import { F1_SEASON_2026 } from '../../data/f1Season2026'
import { getNextRace, getRaceThisWeek } from '../../utils/f1'
import { getCurrentWeekStart, isRecurring, isRoutineDueOnDay } from '../../utils/sprint'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import { calcDailyBudget } from './helpers'
import type { ExpenseCategory } from '../../types'
import styles from './Dashboard.module.css'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { balance, transactions, addExpense, fetchTransactions } = useFinanceStore()
  const { items: sprintItems, addItem, toggleItem } = useSprintStore()
  const { showToast, theme } = useUiStore()
  const f1Enabled = useProfileStore(s => s.activeProfile?.f1Enabled ?? false)

  const [showExpense, setShowExpense] = useState(false)
  const [fabOpen, setFabOpen]         = useState(false)
  const [questTitle, setQuestTitle]   = useState('')
  const [shopTitle, setShopTitle]     = useState('')
  const [showQuest, setShowQuest]     = useState(false)
  const [showShop, setShowShop]       = useState(false)

  const fabRef  = useRef<HTMLDivElement>(null)
  const bgRef   = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchTransactions() }, [])
  usePullToRefresh(contentRef, { onRefresh: fetchTransactions })

  useEffect(() => {
    if (!fabOpen) return
    const handler = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) setFabOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [fabOpen])

  const isRetro = theme === 'retro'

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

  const nextRace      = f1Enabled ? getNextRace(F1_SEASON_2026) : null
  const raceThisWeek  = f1Enabled ? getRaceThisWeek(F1_SEASON_2026) : null
  const weekStart     = getCurrentWeekStart()
  const dailyBudget   = calcDailyBudget(balance)
  const today         = new Date().toISOString().split('T')[0]
  const todaySpent    = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(today))
    .reduce((sum, t) => sum + t.amount, 0)

  const todayDate = new Date()
  const todayIso  = today

  const isDoneToday = (t: (typeof sprintItems)[number]) =>
    isRecurring(t) ? !!(t.completionLog?.some(d => d >= todayIso)) : t.done

  const routineItems = sprintItems.filter(t => isRecurring(t) && isRoutineDueOnDay(t, todayDate))

  const activeTaskCount = sprintItems.filter(t => !isRecurring(t) && !t.done).length

  const sparklineData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayDate)
    d.setDate(todayDate.getDate() - (6 - i))
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(iso))
      .reduce((sum, t) => sum + t.amount, 0)
  })

  const raceInDays = nextRace
    ? Math.ceil((new Date(nextRace.date + 'T14:00:00Z').getTime() - Date.now()) / 86400000)
    : null

  const handleExpense = (amount: number, description: string, category?: string) => {
    addExpense(amount, description, category as ExpenseCategory | undefined)
    setShowExpense(false)
    showToast(`−${amount} ₴ витрачено`, 'info')
  }

  const handleAddQuest = () => {
    const title = questTitle.trim()
    if (!title) return
    addItem({ type: 'todo', title, priority: 'normal' })
    setQuestTitle('')
    setShowQuest(false)
    showToast('Квест додано', 'success')
  }

  const handleAddShopping = () => {
    const title = shopTitle.trim()
    if (!title) return
    addItem({ type: 'shopping', title, priority: 'normal' })
    setShopTitle('')
    setShowShop(false)
    showToast('Покупку додано', 'success')
  }

  return (
    <div className={styles.screen}>
      {isRetro && <div ref={bgRef} className={styles.bg} />}
      <AppHeader />
      <div ref={contentRef} className={styles.content}>
        <GreetingBlock />

        {/* ── Today Strip ── */}
        <div className={styles.todayStrip}>
          <button type="button" className={styles.stripChip} onClick={() => navigate('/finance')}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="3" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M1 5h10" stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="8.5" cy="7.5" r="0.8" fill="currentColor"/>
            </svg>
            <span>{fmt(balance)} ₴</span>
          </button>
          {activeTaskCount > 0 && (
            <button type="button" className={styles.stripChip} onClick={() => navigate('/sprint')}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 3h8M2 6h6M2 9h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <span>{activeTaskCount} задач</span>
            </button>
          )}
          {f1Enabled && nextRace && raceInDays !== null && raceInDays > 0 && raceInDays < 30 && (
            <button type="button" className={styles.stripChip} onClick={() => navigate('/f1')}>
              <span className={styles.stripFlag}>{nextRace.flag}</span>
              <span>{nextRace.name.replace(' GP', '')} · {raceInDays}д</span>
            </button>
          )}
        </div>

        {raceThisWeek ? (
          <RaceHeroCard race={raceThisWeek} onClick={() => navigate(`/f1/${raceThisWeek.round}`)} />
        ) : (
          <WeekHeader weekStart={weekStart} hideTitle routineItems={routineItems} />
        )}

        {routineItems.length > 0 && (
          <div className={styles.routineChips}>
            {routineItems.map(r => {
              const done = isDoneToday(r)
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`${styles.routineChip} ${done ? styles.routineChipDone : ''}`}
                  onClick={() => toggleItem(r.id)}
                >
                  {done && (
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path d="M1.5 4.5l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {r.title}
                </button>
              )
            })}
          </div>
        )}

        <TasksAccordion />
        <HeroCard
          balance={balance}
          dailyBudget={dailyBudget}
          todaySpent={todaySpent}
          race={nextRace}
          compact={!!raceThisWeek}
          sparklineData={sparklineData}
        />
      </div>

      {/* ── Expandable FAB ── */}
      <div ref={fabRef} className={styles.fabContainer}>
        {fabOpen && (
          <div className={styles.fabMenu}>
            <button
              type="button"
              className={styles.fabMenuBtn}
              onClick={() => { setShowExpense(true); setFabOpen(false) }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Витрата
            </button>
            <button
              type="button"
              className={styles.fabMenuBtn}
              onClick={() => { setShowQuest(true); setFabOpen(false) }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Квест
            </button>
            <button
              type="button"
              className={styles.fabMenuBtn}
              onClick={() => { setShowShop(true); setFabOpen(false) }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Покупка
            </button>
          </div>
        )}
        <button
          type="button"
          className={`${styles.fab} ${fabOpen ? styles.fabActive : ''}`}
          onClick={() => setFabOpen(v => !v)}
          aria-label="Меню дій"
        >
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <path d="M3 11h16M11 3v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <Modal isOpen={showExpense} onClose={() => setShowExpense(false)} title="Додати витрату" draggable>
        <ExpenseForm onExpense={handleExpense} />
      </Modal>

      <Modal isOpen={showQuest} onClose={() => setShowQuest(false)} title="Новий квест" draggable>
        <div className={styles.quickAddForm}>
          <input
            className={styles.quickAddInput}
            placeholder="Назва квесту…"
            value={questTitle}
            onChange={e => setQuestTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddQuest()}
            autoFocus
          />
          <button type="button" className={styles.quickAddBtn} onClick={handleAddQuest}>
            Додати
          </button>
        </div>
      </Modal>

      <Modal isOpen={showShop} onClose={() => setShowShop(false)} title="Нова покупка" draggable>
        <div className={styles.quickAddForm}>
          <input
            className={styles.quickAddInput}
            placeholder="Назва покупки…"
            value={shopTitle}
            onChange={e => setShopTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddShopping()}
            autoFocus
          />
          <button type="button" className={styles.quickAddBtn} onClick={handleAddShopping}>
            Додати
          </button>
        </div>
      </Modal>

    </div>
  )
}

export default Dashboard

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
import { useProfileStore } from '../../store/profileStore'
import { F1_SEASON_2026 } from '../../data/f1Season2026'
import { getNextRace, getRaceThisWeek } from '../../utils/f1'
import { getCurrentWeekStart, isRecurring, isRoutineDueOnDay } from '../../utils/sprint'
import { calcDailyBudget } from './helpers'
import type { ExpenseCategory } from '../../types'
import styles from './Dashboard.module.css'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { balance, transactions, addExpense, fetchTransactions } = useFinanceStore()
  const { items: sprintItems, addItem } = useSprintStore()
  const { showToast, theme } = useUiStore()
  const f1Enabled = useProfileStore(s => s.activeProfile?.f1Enabled ?? false)

  const [showExpense, setShowExpense] = useState(false)
  const [showApod, setShowApod]       = useState(false)
  const [fabOpen, setFabOpen]         = useState(false)
  const [questTitle, setQuestTitle]   = useState('')
  const [shopTitle, setShopTitle]     = useState('')
  const [showQuest, setShowQuest]     = useState(false)
  const [showShop, setShowShop]       = useState(false)

  const { data: apodData, loading: apodLoading, error: apodError, fetchApod } = useNasaApod()
  const fabRef  = useRef<HTMLDivElement>(null)
  const bgRef   = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchTransactions() }, [])

  useEffect(() => {
    if (!fabOpen) return
    const handler = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) setFabOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [fabOpen])

  const handleLogoLongPress = useCallback(() => {
    setShowApod(true)
    fetchApod()
  }, [fetchApod])

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
  const unfinishedRoutines = routineItems.filter(t => !isDoneToday(t))

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
      <AppHeader onLogoLongPress={handleLogoLongPress} />
      <div ref={contentRef} className={styles.content}>
        {raceThisWeek ? (
          <RaceHeroCard race={raceThisWeek} onClick={() => navigate(`/f1/${raceThisWeek.round}`)} />
        ) : (
          <WeekHeader weekStart={weekStart} hideTitle routineItems={routineItems} />
        )}

        {unfinishedRoutines.length > 0 && (
          <div className={styles.todayRoutines}>
            {/* <span className={styles.routinesIcon}>🔄</span> */}
            <span className={styles.routinesLabel}>Сьогодні:</span>
            <span className={styles.routinesNames}>
              {unfinishedRoutines.map(r => r.title).join(' · ')}
            </span>
          </div>
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

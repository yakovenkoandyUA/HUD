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
import { useUiStore } from '../../store/uiStore'
import { useProfileStore } from '../../store/profileStore'
import { useMealPlanStore } from '../../store/mealPlanStore'
import { useRecipesStore } from '../../store/recipesStore'
import { F1_SEASON_2026 } from '../../data/f1Season2026'
import { getNextRace, getRaceThisWeek } from '../../utils/f1'
import { getCurrentWeekStart, isRecurring, isRoutineDueOnDay } from '../../utils/sprint'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import { calcDailyBudget } from './helpers'
import type { ExpenseCategory } from '../../types'
import DayOverlay from '../../components/dashboard/DayOverlay'
import styles from './Dashboard.module.css'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { balance, transactions, addExpense, fetchTransactions } = useFinanceStore()
  const { items: sprintItems, addItem, toggleItem } = useSprintStore()
  const { showToast, theme } = useUiStore()
  const f1Enabled  = useProfileStore(s => s.activeProfile?.f1Enabled ?? false)
  const salaryDay  = useProfileStore(s => s.activeProfile?.salaryDay ?? 1)
  const { plan: mealPlan, fetchPlan: fetchMealPlan } = useMealPlanStore()
  const { recipes, fetchRecipes } = useRecipesStore()

  const [showDay, setShowDay]         = useState(false)
  const [showExpense, setShowExpense] = useState(false)
  const [fabOpen, setFabOpen]         = useState(false)
  const [questTitle, setQuestTitle]   = useState('')
  const [shopTitle, setShopTitle]     = useState('')
  const [showQuest, setShowQuest]     = useState(false)
  const [showShop, setShowShop]       = useState(false)

  const fabRef  = useRef<HTMLDivElement>(null)
  const bgRef   = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTransactions()
    fetchMealPlan()
    if (recipes.length === 0) fetchRecipes()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
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
  const dailyBudget   = calcDailyBudget(balance, salaryDay)
  const today         = new Date().toISOString().split('T')[0]
  const todaySpent    = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(today))
    .reduce((sum, t) => sum + t.amount, 0)

  const todayDate = new Date()
  const todayIso  = today

  const isDoneToday = (t: (typeof sprintItems)[number]) =>
    isRecurring(t) ? !!(t.completionLog?.some(d => d >= todayIso)) : t.done

  const routineItems = sprintItems.filter(t => isRecurring(t) && isRoutineDueOnDay(t, todayDate))

  const todayMeals = (mealPlan[today] ?? [])
    .map(id => recipes.find(r => r.id === id))
    .filter(Boolean) as typeof recipes

  const sparklineData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayDate)
    d.setDate(todayDate.getDate() - (6 - i))
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(iso))
      .reduce((sum, t) => sum + t.amount, 0)
  })

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

        {todayMeals.length > 0 && (
          <button
            type="button"
            className={styles.todayMealsRow}
            onClick={() => navigate('/recipes/planner')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2M5 11v11M21 2v20M21 2a5 5 0 0 0-5 5v4h5"/>
            </svg>
            <span className={styles.todayMealsLabel}>СЬОГОДНІ:</span>
            <span className={styles.todayMealsText}>
              {todayMeals.map(r => r.title).join(' · ')}
            </span>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={styles.todayMealsChevron}>
              <path d="M6 4l4 4-4 4"/>
            </svg>
          </button>
        )}

        <HeroCard
          balance={balance}
          dailyBudget={dailyBudget}
          todaySpent={todaySpent}
          race={nextRace}
          compact={!!raceThisWeek}
          sparklineData={sparklineData}
        />

        <button
          type="button"
          className={styles.dayBtn}
          onClick={() => setShowDay(true)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
          </svg>
          МІЙ ДЕНЬ
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', opacity: 0.4 }}>
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
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
            <button
              type="button"
              className={styles.fabMenuBtn}
              onClick={() => { setFabOpen(false); navigate('/notes', { state: { autoFocus: true } }) }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 12.5V14h1.5l8.87-8.87-1.5-1.5L2 12.5z" fill="currentColor"/>
                <path d="M13.71 3.29a1 1 0 0 0-1.42 0l-1 1 1.42 1.42 1-1a1 1 0 0 0 0-1.42z" fill="currentColor"/>
              </svg>
              Нотатка
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

      {showDay && <DayOverlay onClose={() => setShowDay(false)} />}

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

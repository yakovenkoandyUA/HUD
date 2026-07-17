import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '@/shared/components/layout/AppHeader'
import GreetingBlock from './components/dashboard/GreetingBlock'
import HeroCard from './components/dashboard/HeroCard'
import RaceCountdownStrip from './components/dashboard/RaceCountdownStrip'
import DaySummaryCard from './components/dashboard/DaySummaryCard'
import Modal from '@/shared/components/ui/Modal'
import ExpenseForm from '@/features/finance/components/finance/ExpenseForm'
import AddSprintItemModal from '@/features/sprint/components/sprint/AddSprintItemModal'
import WeatherModal from './components/dashboard/WeatherModal'
import type { WeatherData } from '@/shared/hooks/useWeather'
import { useFinanceStore } from '@/features/finance/store/financeStore'
import { useSprintStore } from '@/features/sprint/store/sprintStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { useMealPlanStore } from '@/features/recipes/store/mealPlanStore'
import { useRecipesStore } from '@/features/recipes/store/recipesStore'
import { useNotesStore } from '@/features/notes/notesStore'
import { F1_SEASON_2026 } from '@/features/f1/data/f1Season2026'
import { getNextRace } from '@/features/f1/utils/f1'
import { isRecurring, isRoutineDueOnDay } from '@/features/sprint/utils/sprint'
import { usePullToRefresh } from '@/shared/hooks/usePullToRefresh'
import { calcDailyBudget } from './helpers'
import { useAchievementsStore } from '@/shared/store/achievementsStore'

import type { ExpenseCategory } from '@/shared/types'
import SpacesStrip from './components/dashboard/SpacesStrip'
import DayOverlay from './components/dashboard/DayOverlay'
import MimirHint, { type MimirPose } from '@/shared/components/ui/MimirHint'
import { useMimirHint } from '@/shared/hooks/useMimirHint'
import { useMimirAiHint } from '@/shared/hooks/useMimirAiHint'
import styles from './Dashboard.module.css'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { balance, transactions, addExpense, fetchTransactions } = useFinanceStore()
  const { items: sprintItems, fetchItems } = useSprintStore()
  const { showToast } = useUiStore()
  const f1Enabled         = useProfileStore(s => s.activeProfile?.f1Enabled ?? false)
  const salaryDay         = useProfileStore(s => s.activeProfile?.salaryDay ?? 1)
  const { plan: mealPlan, fetchPlan: fetchMealPlan } = useMealPlanStore()
  const { recipes, fetchRecipes } = useRecipesStore()
  const { notes, fetchNotes } = useNotesStore()
  const { seen: welcomeSeen, markSeen: markWelcomeSeen } = useMimirHint('dashboard-welcome')
  const { hint: aiHint, markShown: markAiShown } = useMimirAiHint()

  const [showDay, setShowDay]           = useState(false)
  const [showExpense, setShowExpense]   = useState(false)
  const [fabOpen, setFabOpen]           = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalDefaultType, setAddModalDefaultType] = useState<'todo' | 'shopping'>('todo')
  const [weatherData, setWeatherData]   = useState<WeatherData | null>(null)
  const [weatherOpen, setWeatherOpen]   = useState(false)

  const fabRef     = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTransactions()
    fetchMealPlan()
    fetchItems()
    fetchNotes()
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

  const nextRace    = f1Enabled ? getNextRace(F1_SEASON_2026) : null
  const dailyBudget = calcDailyBudget(balance, salaryDay)
  const today       = new Date().toISOString().split('T')[0]
  const todayDate   = new Date()
  const todaySpent  = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(today))
    .reduce((sum, t) => sum + t.amount, 0)

  const isDoneToday = (t: (typeof sprintItems)[number]) =>
    isRecurring(t) ? !!(t.completionLog?.some(d => d >= today)) : t.done

  const routineItems = sprintItems
    .filter(t => isRecurring(t))
    .filter(t => isRoutineDueOnDay(t, todayDate))

  const activeQuests  = sprintItems.filter(t => !isRecurring(t) && t.type !== 'shopping' && !t.done).length
  const shoppingCount = sprintItems.filter(t => t.type === 'shopping' && !t.done).length
  const latestNoteDate = notes[0]?.updatedAt ?? ''

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
    useAchievementsStore.getState().unlock('first-transaction')
    setShowExpense(false)
    showToast(`−${amount} ₴ витрачено`, 'info')
  }

  const openAddModal = (type: 'todo' | 'shopping') => {
    setAddModalDefaultType(type)
    setShowAddModal(true)
    setFabOpen(false)
  }

  const todayTeasers = routineItems
    .filter(r => !isDoneToday(r))
    .slice(0, 2)
    .map(r => r.title)

  return (
    <div className={styles.screen}>
      <AppHeader />
      <div ref={contentRef} className={styles.content}>

        {/* 1 — Daily Banner: date + weather + today teasers */}
        <GreetingBlock
          onWeatherClick={(d) => { setWeatherData(d); setWeatherOpen(true) }}
          onOpenDay={() => setShowDay(true)}
          todayTeasers={todayTeasers}
        />

        {/* 2 — Spaces: compact horizontal strip */}
        <SpacesStrip />

        {/* Mimir hint (height:0, floats over content) */}
        {!welcomeSeen ? (
          <div className={styles.mimirFloat}>
            <MimirHint
              pose="excited"
              oneTime
              textKey="Криниця мудрості відкрита. Я Мімір — твій особистий охоронець порядку. Переглянь розділи знизу."
              onDismiss={markWelcomeSeen}
            />
          </div>
        ) : aiHint ? (
          <div className={styles.mimirFloat}>
            <MimirHint
              pose={aiHint.pose as MimirPose}
              textKey={aiHint.text}
              oneTime
              onDismiss={markAiShown}
              showUpgrade={!aiHint.isAi}
            />
          </div>
        ) : null}

        {/* 4 — Status tiles: 2×2 grid */}
        <div className={styles.tilesWrap}>
          <DaySummaryCard
            activeQuests={activeQuests}
            shoppingCount={shoppingCount}
            meals={todayMeals.map(r => r.title)}
            notesCount={notes.length}
            latestNoteDate={latestNoteDate}
            onQuestsClick={() => navigate('/sprint', { state: { selectedDay: today, filterType: 'task' } })}
            onShoppingClick={() => navigate('/sprint', { state: { selectedDay: today, filterType: 'shopping' } })}
            onMealsClick={() => todayMeals.length === 1
              ? navigate(`/recipes/${todayMeals[0].id}`)
              : navigate('/recipes/planner')
            }
            onNotesClick={() => navigate('/notes')}
          />
        </div>

        {/* 5 — Finance */}
        <div className={styles.sectionWrap}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>ФІНАНСИ</span>
            <button type="button" className={styles.sectionLink} onClick={() => navigate('/finance')}>
              детальніше
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
          <HeroCard
            balance={balance}
            dailyBudget={dailyBudget}
            todaySpent={todaySpent}
            sparklineData={sparklineData}
          />
        </div>

        {/* 6 — F1 countdown strip */}
        {f1Enabled && nextRace && (
          <RaceCountdownStrip race={nextRace} />
        )}

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
              onClick={() => openAddModal('todo')}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Квест
            </button>
            <button
              type="button"
              className={styles.fabMenuBtn}
              onClick={() => openAddModal('shopping')}
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

      {weatherData && (
        <WeatherModal
          isOpen={weatherOpen}
          onClose={() => setWeatherOpen(false)}
          weather={weatherData}
        />
      )}

      {showDay && <DayOverlay onClose={() => setShowDay(false)} />}

      <Modal isOpen={showExpense} onClose={() => setShowExpense(false)} title="Додати витрату" draggable>
        <ExpenseForm onExpense={handleExpense} />
      </Modal>

      <AddSprintItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        defaultType={addModalDefaultType}
      />
    </div>
  )
}

export default Dashboard

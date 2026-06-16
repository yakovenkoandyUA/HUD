import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader'
import CustomDatePicker from '../../components/ui/CustomDatePicker'
import GreetingBlock from '../../components/dashboard/GreetingBlock'
import HeroCard from '../../components/dashboard/HeroCard'
import RaceHeroCard from '../../components/dashboard/RaceHeroCard'
import RaceCountdownStrip from '../../components/dashboard/RaceCountdownStrip'
import DaySummaryCard from '../../components/dashboard/DaySummaryCard'
import WeekHeader from '../../components/sprint/WeekHeader'
import Modal from '../../components/ui/Modal'
import ExpenseForm from '../../components/finance/ExpenseForm'
import { useFinanceStore } from '../../store/financeStore'
import { useSprintStore } from '../../store/sprintStore'
import { useUiStore } from '../../store/uiStore'
import { useProfileStore } from '../../store/profileStore'
import { useMealPlanStore } from '../../store/mealPlanStore'
import { useRecipesStore } from '../../store/recipesStore'
import { useNotesStore } from '../../store/notesStore'
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
  const { items: sprintItems, addItem, toggleItem, fetchItems } = useSprintStore()
  const { showToast } = useUiStore()
  const f1Enabled  = useProfileStore(s => s.activeProfile?.f1Enabled ?? false)
  const salaryDay  = useProfileStore(s => s.activeProfile?.salaryDay ?? 1)
  const { plan: mealPlan, fetchPlan: fetchMealPlan } = useMealPlanStore()
  const { recipes, fetchRecipes } = useRecipesStore()
  const { notes, fetchNotes } = useNotesStore()

  const [showDay, setShowDay]         = useState(false)
  const [showExpense, setShowExpense] = useState(false)
  const [fabOpen, setFabOpen]         = useState(false)
  const [questTitle, setQuestTitle]       = useState('')
  const [questDueDate, setQuestDueDate]   = useState<string | null>(null)
  const [questReminder, setQuestReminder] = useState(false)
  const [showQuestDate, setShowQuestDate] = useState(false)
  const [shopTitle, setShopTitle]         = useState('')
  const [showQuest, setShowQuest]         = useState(false)
  const [showShop, setShowShop]           = useState(false)

  const fabRef  = useRef<HTMLDivElement>(null)
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

  const allRoutines  = sprintItems.filter(t => isRecurring(t))
  const routineItems = allRoutines.filter(t => isRoutineDueOnDay(t, todayDate))

  const activeQuests  = sprintItems.filter(t => !isRecurring(t) && t.type !== 'shopping' && !t.done).length
  const shoppingCount = sprintItems.filter(t => t.type === 'shopping' && !t.done).length
  const latestNote    = notes[0]?.text.split('\n')[0] ?? ''

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
    addItem({
      type: 'todo',
      title,
      priority: 'normal',
      ...(questDueDate ? { dueDate: questDueDate } : {}),
      ...(questDueDate && questReminder ? { reminder: { amount: 1, unit: 'days' as const } } : {}),
    })
    setQuestTitle('')
    setQuestDueDate(null)
    setQuestReminder(false)
    setShowQuestDate(false)
    setShowQuest(false)
    showToast(questReminder ? 'Квест додано · нагадаю за день' : 'Квест додано', 'success')
  }

  const handleCloseQuest = () => {
    setShowQuest(false)
    setQuestTitle('')
    setQuestDueDate(null)
    setQuestReminder(false)
    setShowQuestDate(false)
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
      <AppHeader />
      <div ref={contentRef} className={styles.content}>
        <GreetingBlock />

        <div className={styles.calendarWrap}>
          {raceThisWeek ? (
            <RaceHeroCard race={raceThisWeek} onClick={() => navigate(`/f1/${raceThisWeek.round}`)} />
          ) : (
            <WeekHeader
              weekStart={weekStart}
              hideTitle
              routineItems={allRoutines}
              onDaySelect={(iso) => navigate('/sprint', { state: { selectedDay: iso } })}
            />
          )}
        </div>

        {f1Enabled && nextRace && !raceThisWeek && (
          <RaceCountdownStrip race={nextRace} />
        )}

        <DaySummaryCard
          routineItems={routineItems}
          isDoneToday={isDoneToday}
          onToggle={toggleItem}
          activeQuests={activeQuests}
          shoppingCount={shoppingCount}
          meals={todayMeals.map(r => r.title)}
          notesCount={notes.length}
          latestNote={latestNote}
          onOpenDay={() => setShowDay(true)}
          onQuestsClick={() => navigate('/sprint')}
          onShoppingClick={() => navigate('/sprint', { state: { filterType: 'shopping' } })}
          onMealsClick={() => navigate('/recipes/planner')}
          onNotesClick={() => navigate('/notes')}
        />

        <div style={{ marginTop: 12 }}>
          <HeroCard
            balance={balance}
            dailyBudget={dailyBudget}
            todaySpent={todaySpent}
            sparklineData={sparklineData}
          />
        </div>

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

      <Modal isOpen={showQuest} onClose={handleCloseQuest} title="Новий квест" draggable>
        <div className={styles.questForm}>
          <input
            className={styles.quickAddInput}
            placeholder="Назва квесту…"
            value={questTitle}
            onChange={e => setQuestTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !showQuestDate && handleAddQuest()}
            autoFocus
          />
          <div className={styles.questMeta}>
            <button
              type="button"
              className={`${styles.questMetaBtn} ${questDueDate ? styles.questMetaBtnActive : ''}`}
              onClick={() => setShowQuestDate(v => !v)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {questDueDate
                ? new Date(questDueDate + 'T00:00:00').toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
                : 'Дедлайн'}
            </button>

            {questDueDate && (
              <>
                <button
                  type="button"
                  className={`${styles.questMetaBtn} ${questReminder ? styles.questMetaBtnBell : ''}`}
                  onClick={() => setQuestReminder(v => !v)}
                  title="Нагадати за день"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  {questReminder ? 'За день' : 'Нагадати'}
                </button>
                <button
                  type="button"
                  className={styles.questClearDate}
                  onClick={() => { setQuestDueDate(null); setQuestReminder(false); setShowQuestDate(false) }}
                  aria-label="Прибрати дату"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </>
            )}

            <button type="button" className={styles.quickAddBtn} style={{ marginLeft: 'auto' }} onClick={handleAddQuest}>
              Додати
            </button>
          </div>

          {showQuestDate && (
            <div className={styles.questDatePicker}>
              <CustomDatePicker
                value={questDueDate ?? undefined}
                onChange={(iso) => { setQuestDueDate(iso); setShowQuestDate(false) }}
                onClose={() => setShowQuestDate(false)}
                minDate={new Date()}
              />
            </div>
          )}
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

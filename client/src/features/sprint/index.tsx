import React, { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import DoodleIllustration from '@/shared/components/ui/DoodleIllustration'
import FabHint from '@/shared/components/ui/FabHint'
import AppHeader from '@/shared/components/AppHeader'
import TrashBin from './components/sprint/TrashBin'
import WeekHeader, { addWeeks } from './components/sprint/WeekHeader'
import TaskCard from './components/sprint/TaskCard'
import TaskDetailModal from './components/sprint/TaskDetailModal'
import WeekExpandedView from './components/sprint/WeekExpandedView'
import AddSprintItemModal from './components/sprint/AddSprintItemModal'
import { useSprintStore } from '@/features/sprint/store/sprintStore'
import { useMealPlanStore } from '@/features/recipes/store/mealPlanStore'
import { useRecipesStore } from '@/features/recipes/store/recipesStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { getCurrentWeekStart, isRecurring, isRoutineDueOnDay } from './utils/sprint'
import { getToken } from '@/shared/services/api'
import type { UnifiedTodo } from '@/shared/types'
import styles from './Sprint.module.css'

type FilterType   = 'task' | 'shopping'
type StatusFilter = 'active' | 'done'

const GHOST_HINT_LIMIT     = 1
const LONGPRESS_HINT_LIMIT = 1

const SWIPE_GHOST_TASK: UnifiedTodo = {
	id: '__swipe-tutorial-ghost__',
	title: 'Спробуй видалити мене свайпом вліво ←',
	done: false,
	type: 'sprint',
	createdAt: new Date(0).toISOString(),
}

// Exponential urgency: відчуття "підйому" від низу до верху
function deadlineUrgency(dueDate: string, todayIso: string): number {
	const [ty, tm, td] = todayIso.split('-').map(Number)
	const [dy, dm, dd] = dueDate.split('-').map(Number)
	const daysLeft = Math.round((Date.UTC(dy, dm - 1, dd) - Date.UTC(ty, tm - 1, td)) / 86400000)
	if (daysLeft < 0)   return 10000  // прострочено
	if (daysLeft === 0) return 5000   // сьогодні
	if (daysLeft === 1) return 2000   // завтра
	if (daysLeft <= 3)  return 800    // 2–3 дні
	if (daysLeft <= 5)  return 300    // 4–5 днів
	if (daysLeft <= 7)  return 80     // 6–7 днів (було 100, зменшено)
	if (daysLeft <= 14) return 20     // 8–14 днів
	return 0                          // 15+ днів — як без дедлайну
}

// ── Component ─────────────────────────────────────────────────────────────────

const Sprint: React.FC = () => {
	const { items, loading, toggleItem, deleteItem, fetchItems, migrateFromLocalStorage } = useSprintStore()
	const { plan: mealPlan, fetchPlan: fetchMealPlan } = useMealPlanStore()
	const { recipes, fetchRecipes } = useRecipesStore()
	const myUserId = useProfileStore(s => s.activeProfile?.id)
	const sprintTutorialSeen = useProfileStore(s => s.activeProfile?.sprintTutorialSeen ?? false)
	const sprintTutorialShownCount = useProfileStore(s => s.activeProfile?.sprintTutorialShownCount ?? 0)
	const weekdayLongPressTutorialSeen = useProfileStore(s => s.activeProfile?.weekdayLongPressTutorialSeen ?? false)
	const weekdayLongPressShownCount = useProfileStore(s => s.activeProfile?.weekdayLongPressShownCount ?? 0)
	const updateProfile = useProfileStore(s => s.updateProfile)
	const location = useLocation()
	const navigate = useNavigate()
	const locationState = location.state as { selectedDay?: string; filterType?: FilterType } | null
	const [filterType, setFilterType]     = useState<FilterType>(locationState?.filterType ?? 'task')
	const [filterStatus, setFilterStatus] = useState<StatusFilter>('active')

	// "Заморожуємо" рішення показувати підказку на момент монтування — інакше інкремент
	// лічильника в фоні одразу ховав би підказку реактивно (миготіння в той же сеанс).
	const [ghostHintEligible]     = useState(() => !sprintTutorialSeen && sprintTutorialShownCount < GHOST_HINT_LIMIT)
	const [longPressHintEligible] = useState(() => !weekdayLongPressTutorialSeen && weekdayLongPressShownCount < LONGPRESS_HINT_LIMIT)

	const [showAdd, setShowAdd]           = useState(false)
	const [quickAddDate, setQuickAddDate] = useState<string | null>(null)
	const [detailTaskId, setDetailTaskId] = useState<string | null>(null)
	const [weekExpanded, setWeekExpanded] = useState(false)
	const [binHidden, setBinHidden]       = useState(true)
	const binTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const handleSwipeTutorialDone = () => {
		updateProfile({ sprintTutorialSeen: true })
	}

	const _td = new Date()
	const todayStr = `${_td.getFullYear()}-${String(_td.getMonth() + 1).padStart(2, '0')}-${String(_td.getDate()).padStart(2, '0')}`
	const [selectedDay, setSelectedDay] = useState(locationState?.selectedDay ?? todayStr)
	const [calendarMode, setCalendarMode] = useState<'week' | 'month'>(() =>
		(localStorage.getItem('sprint-calendar-mode') as 'week' | 'month') || 'week'
	)
	const toggleCalendarMode = () => {
		const next = calendarMode === 'week' ? 'month' : 'week'
		setCalendarMode(next)
		localStorage.setItem('sprint-calendar-mode', next)
	}

	useEffect(
		() => () => {
			if (binTimerRef.current !== null) clearTimeout(binTimerRef.current)
		},
		[],
	)

	// Лічильники показів — підказка ховається назавжди після ліміту, навіть якщо
	// користувач ніколи не виконав жест (свайп / long-press), не лише на завершення дії.
	useEffect(() => {
		if (ghostHintEligible) updateProfile({ sprintTutorialShownCount: sprintTutorialShownCount + 1 })
	}, []) // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (longPressHintEligible) updateProfile({ weekdayLongPressShownCount: weekdayLongPressShownCount + 1 })
	}, []) // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (!getToken()) return
		const run = async () => {
			await migrateFromLocalStorage()
			fetchItems()
			fetchMealPlan()
			if (recipes.length === 0) fetchRecipes()
		}
		run()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const currentWeekStart = getCurrentWeekStart()
	const [weekStart, setWeekStart] = useState(currentWeekStart)
	const isCurrentWeek = weekStart === currentWeekStart

	const goToPrevWeek = () => {
		const prev = addWeeks(weekStart, -1)
		setWeekStart(prev)
		setSelectedDay(prev)
	}
	const goToNextWeek = () => {
		const next = addWeeks(weekStart, 1)
		setWeekStart(next)
		setSelectedDay(next === currentWeekStart ? todayStr : next)
	}
	const routineItems = items.filter(t => isRecurring(t))

	const filteredItems = items.filter(t => {
		if (isRecurring(t)) return false
		if (filterType === 'task'     && t.type === 'shopping') return false
		if (filterType === 'shopping' && t.type !== 'shopping') return false
		if (filterType === 'task') {
			if (filterStatus === 'active') return !t.done
			if (filterStatus === 'done')   return t.done
		}
		return true
	})

	const isDayToday = selectedDay === todayStr
	const [selY, selM, selD] = selectedDay.split('-').map(Number)
	const selectedDate = new Date(selY, selM - 1, selD)

	const rawDayQuests = isDayToday
		? filteredItems
		: [
			...routineItems.filter(t => isRoutineDueOnDay(t, selectedDate)),
			...items.filter(t => {
				if (isRecurring(t)) return false
				if (filterType === 'task'     && t.type === 'shopping') return false
				if (filterType === 'shopping' && t.type !== 'shopping') return false
				return t.dueDate === selectedDay
			}),
		]
	const dayHasAnyItems = isDayToday
		|| items.some(t => !isRecurring(t) && t.dueDate === selectedDay)

	const dayQuests = [...rawDayQuests].sort((a: UnifiedTodo, b: UnifiedTodo) => {
		// 1. Pinned
		if (a.isPinned && !b.isPinned) return -1
		if (!a.isPinned && b.isPinned) return 1
		// 2. Assigned to current user
		const aAssigned = myUserId ? (a.assignedTo?.includes(myUserId) ?? false) : false
		const bAssigned = myUserId ? (b.assignedTo?.includes(myUserId) ?? false) : false
		if (aAssigned && !bAssigned) return -1
		if (!aAssigned && bAssigned) return 1
		// 3. Deadline urgency (exponential)
		const ua = a.dueDate ? deadlineUrgency(a.dueDate, todayStr) : 0
		const ub = b.dueDate ? deadlineUrgency(b.dueDate, todayStr) : 0
		if (ua !== ub) return ub - ua
		// 4. Family tasks (ownerName) above solo tasks
		if (a.ownerName && !b.ownerName) return -1
		if (!a.ownerName && b.ownerName) return 1
		// 5. Newest first
		return b.createdAt.localeCompare(a.createdAt)
	})

	const showSwipeGhost = ghostHintEligible && !sprintTutorialSeen && isDayToday && filterType === 'task' && filterStatus === 'active'

	useEffect(() => {
		if (binTimerRef.current !== null) clearTimeout(binTimerRef.current)
		if (dayQuests.length === 0 && !showSwipeGhost) {
			binTimerRef.current = setTimeout(() => setBinHidden(true), 300)
		} else {
			binTimerRef.current = setTimeout(() => setBinHidden(false), 0)
		}
	}, [dayQuests.length, showSwipeGhost])

	const handleDayLongPress = (day: Date) => {
		const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
		setSelectedDay(iso)
		setQuickAddDate(iso)
		setShowAdd(true)
		if (!weekdayLongPressTutorialSeen) updateProfile({ weekdayLongPressTutorialSeen: true })
	}

	return (
		<div className={styles.screen}>
			<AppHeader />

			<div className={styles.content}>
				<WeekHeader
					weekStart={weekStart}
					isCurrentWeek={isCurrentWeek}
					onExpand={() => setWeekExpanded(true)}
					routineItems={routineItems}
					selectedDay={selectedDay}
					onDaySelect={iso => {
						if (iso === selectedDay && iso !== todayStr) setSelectedDay(todayStr)
						else setSelectedDay(iso)
					}}
					onLongPress={handleDayLongPress}
					showLongPressHint={longPressHintEligible && !weekdayLongPressTutorialSeen}
					onPrevWeek={goToPrevWeek}
					onNextWeek={goToNextWeek}
					calendarMode={calendarMode}
					onToggleCalendarMode={toggleCalendarMode}
				/>

				{/* ── Meal plan strip ── */}
				{(() => {
					const dayMeals = (mealPlan[selectedDay] ?? []).map(id => recipes.find(r => r.id === id)).filter(Boolean) as typeof recipes
					if (dayMeals.length === 0) return null
					return (
						<div className={styles.mealStrip}>
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={styles.mealStripIcon}>
								<path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2M5 11v11M21 2v20M21 2a5 5 0 0 0-5 5v4h5" />
							</svg>
							{dayMeals.map(r => (
								<button key={r.id} type="button" className={styles.mealChip} onClick={() => navigate(`/recipes/${r.id}`)}>
									{r.title}
								</button>
							))}
						</div>
					)
				})()}

				{/* ── Tab bar ── */}
				{dayHasAnyItems && (
					<div className={styles.tabBar}>
						{(['task', 'shopping'] as const).map(type => (
							<button
								key={type}
								className={`${styles.tab} ${filterType === type ? styles.tabActive : ''}`}
								onClick={() => setFilterType(type)}
							>
								{type === 'task' ? 'КВЕСТИ' : 'ПОКУПКИ'}
							</button>
						))}
					</div>
				)}

				{/* ── Status row ── */}
				<div className={styles.statusRow}>
					{filterType === 'task' && isDayToday && (
						<div className={styles.statusLeft}>
							{(['active', 'done'] as const).map((status, i) => (
								<React.Fragment key={status}>
									{i > 0 && <span className={styles.statusSep}>·</span>}
									<button
										className={`${styles.statusBtn} ${filterStatus === status ? styles.statusBtnActive : ''}`}
										onClick={() => setFilterStatus(status)}
									>
										{status === 'active' ? 'АКТИВНІ' : 'ЗАВЕРШЕНІ'}
									</button>
								</React.Fragment>
							))}
						</div>
					)}
				</div>

				{/* ── List ── */}
				<div key={`${filterType}-${filterStatus}-${selectedDay}`} className={styles.tabContent}>
					{loading && items.length === 0 ? (
						<p className={styles.dayEmptyText}>Завантаження...</p>
					) : dayQuests.length === 0 && !showSwipeGhost ? (
						<div className={styles.dayEmpty}>
							<DoodleIllustration variant={filterType === 'shopping' ? 'shopping' : 'sprint'} size={72} />
							<p className={styles.dayEmptyText}>
								{filterType === 'shopping' ? 'Список покупок порожній' : 'Квестів на цей день немає'}
							</p>
						</div>
					) : (
						<ul className={styles.list}>
							{showSwipeGhost && (
								<TaskCard
									item={SWIPE_GHOST_TASK}
									onToggle={() => {}}
									onDelete={handleSwipeTutorialDone}
									onOpenDetail={() => {}}
								/>
							)}
							{dayQuests.map(t => (
								<TaskCard key={t.id} item={t} onToggle={() => toggleItem(t.id)} onDelete={() => deleteItem(t.id)} onOpenDetail={() => setDetailTaskId(t.id)} />
							))}
						</ul>
					)}
				</div>

				{/* ── Trash accordion ── */}
				<TrashBin />
			</div>

			{/* ── FAB ── */}
			{items.length === 0 && <FabHint storageKey="sprint" text="Додай першу задачу" />}
			<button className={styles.fab} onClick={() => setShowAdd(true)} aria-label="Додати квест">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
			</button>

			{/* ── Trash bin (swipe-to-delete target) ── */}
			<div className={`${styles.trashBin} ${filteredItems.length === 0 ? styles.trashBinEmpty : ''}`} id="sprint-trash-bin" aria-hidden="true" style={binHidden ? { display: 'none' } : undefined}>
				<svg width="20" height="22" viewBox="0 0 18 20" fill="none">
					<path d="M1 4h16M6 4V2h6v2M3 4l1 14a1 1 0 001 1h8a1 1 0 001-1L15 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M7 8v6M11 8v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
				</svg>
			</div>

			{/* ── Add modal ── */}
			<AddSprintItemModal
				isOpen={showAdd}
				onClose={() => { setShowAdd(false); setQuickAddDate(null) }}
				defaultType={filterType === 'shopping' ? 'shopping' : 'todo'}
				initialDate={quickAddDate}
			/>

			{weekExpanded && (
				<WeekExpandedView
					weekStart={weekStart}
					routineItems={routineItems}
					allItems={items}
					onToggle={toggleItem}
					onOpenDetail={setDetailTaskId}
					onClose={() => setWeekExpanded(false)}
					initialDay={selectedDay}
					onAddForDay={iso => {
						setWeekExpanded(false)
						setQuickAddDate(iso)
						setShowAdd(true)
						if (!weekdayLongPressTutorialSeen) updateProfile({ weekdayLongPressTutorialSeen: true })
					}}
				/>
			)}

			<TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />
		</div>
	)
}

export default Sprint

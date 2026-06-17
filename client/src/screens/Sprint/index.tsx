import React, { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import DoodleIllustration from '../../components/ui/DoodleIllustration'
import FabHint from '../../components/ui/FabHint'
import AppHeader from '../../components/AppHeader'
import TrashBin from '../../components/sprint/TrashBin'
import WeekHeader, { addWeeks } from '../../components/sprint/WeekHeader'
import TaskCard from '../../components/sprint/TaskCard'
import TaskDetailModal from '../../components/sprint/TaskDetailModal'
import WeekExpandedView from '../../components/sprint/WeekExpandedView'
import AddSprintItemModal from '../../components/sprint/AddSprintItemModal'
import { useSprintStore } from '../../store/sprintStore'
import { useMealPlanStore } from '../../store/mealPlanStore'
import { useRecipesStore } from '../../store/recipesStore'
import { getCurrentWeekStart, isRecurring, isRoutineDueOnDay } from '../../utils/sprint'
import { getToken } from '../../services/api'
import type { UnifiedTodo } from '../../types'
import styles from './Sprint.module.css'

type FilterType   = 'task' | 'shopping'
type StatusFilter = 'active' | 'done'

function deadlineUrgency(dueDate: string, todayIso: string): number {
	const [ty, tm, td] = todayIso.split('-').map(Number)
	const [dy, dm, dd] = dueDate.split('-').map(Number)
	const daysLeft = Math.round((Date.UTC(dy, dm - 1, dd) - Date.UTC(ty, tm - 1, td)) / 86400000)
	if (daysLeft < 0)   return 10000  // overdue
	if (daysLeft === 0) return 5000   // today
	if (daysLeft === 1) return 2000   // tomorrow
	if (daysLeft <= 3)  return 800    // 2–3 days
	if (daysLeft <= 5)  return 300    // 4–5 days
	if (daysLeft <= 7)  return 100    // 6–7 days — починає рухатись
	return 0                          // 8+ days — як без дедлайну
}

// ── Component ─────────────────────────────────────────────────────────────────

const Sprint: React.FC = () => {
	const { items, loading, toggleItem, deleteItem, fetchItems, migrateFromLocalStorage } = useSprintStore()
	const { plan: mealPlan, fetchPlan: fetchMealPlan } = useMealPlanStore()
	const { recipes, fetchRecipes } = useRecipesStore()
	const location = useLocation()
	const navigate = useNavigate()
	const locationState = location.state as { selectedDay?: string; filterType?: FilterType } | null
	const [filterType, setFilterType]     = useState<FilterType>(locationState?.filterType ?? 'task')
	const [filterStatus, setFilterStatus] = useState<StatusFilter>('active')

	const [showAdd, setShowAdd]           = useState(false)
	const [quickAddDate, setQuickAddDate] = useState<string | null>(null)
	const [detailTaskId, setDetailTaskId] = useState<string | null>(null)
	const [weekExpanded, setWeekExpanded] = useState(false)
	const [binHidden, setBinHidden]       = useState(true)
	const binTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
		if (a.isPinned && !b.isPinned) return -1
		if (!a.isPinned && b.isPinned) return 1
		const ua = a.dueDate ? deadlineUrgency(a.dueDate, todayStr) : 0
		const ub = b.dueDate ? deadlineUrgency(b.dueDate, todayStr) : 0
		if (ua !== ub) return ub - ua
		if (a.ownerName && !b.ownerName) return -1
		if (!a.ownerName && b.ownerName) return 1
		return b.createdAt.localeCompare(a.createdAt)
	})

	useEffect(() => {
		if (binTimerRef.current !== null) clearTimeout(binTimerRef.current)
		if (dayQuests.length === 0) {
			binTimerRef.current = setTimeout(() => setBinHidden(true), 300)
		} else {
			binTimerRef.current = setTimeout(() => setBinHidden(false), 0)
		}
	}, [dayQuests.length])

	const handleDayLongPress = (day: Date) => {
		const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
		setSelectedDay(iso)
		setQuickAddDate(iso)
		setShowAdd(true)
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
					) : dayQuests.length === 0 ? (
						<div className={styles.dayEmpty}>
							<DoodleIllustration variant="sprint" size={72} />
							<p className={styles.dayEmptyText}>Немає задач на цей день</p>
						</div>
					) : (
						<>
							{dayQuests.length > 0 && (
								<ul className={styles.list}>
									{dayQuests.map(t => (
										<TaskCard key={t.id} item={t} onToggle={() => toggleItem(t.id)} onDelete={() => deleteItem(t.id)} onOpenDetail={() => setDetailTaskId(t.id)} />
									))}
								</ul>
							)}
						</>
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
					}}
				/>
			)}

			<TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />
		</div>
	)
}

export default Sprint

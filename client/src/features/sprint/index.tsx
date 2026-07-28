import React, { useState, useEffect, useRef } from 'react'
import type { UnifiedTodo } from '@/shared/types'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import DoodleIllustration from '@/shared/components/ui/DoodleIllustration'

import MimirHint from '@/shared/components/ui/MimirHint'
import AppHeader from '@/shared/components/layout/AppHeader'
import TrashBin from './components/sprint/TrashBin'
import WeekHeader from './components/sprint/WeekHeader'
import TaskCard from './components/sprint/TaskCard'
import TaskDetailModal from './components/sprint/TaskDetailModal'
import WeekExpandedView from './components/sprint/WeekExpandedView'
import AddSprintItemModal from './components/sprint/AddSprintItemModal'
import { useSprintStore } from '@/features/sprint/store/sprintStore'
import { useMealPlanStore } from '@/features/recipes/store/mealPlanStore'
import { useRecipesStore } from '@/features/recipes/store/recipesStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { isRecurring, isRoutineDueOnDay } from './utils/sprint'
import { getToken } from '@/shared/services/api'
import { useSprintDrag } from './hooks/useSprintDrag'
import { useSprintCalendar } from './hooks/useSprintCalendar'
import { MIMIR_DIALOGUE, getMimirText, type MimirDialogueId } from '@/shared/data/mimirDialogue'
import { getMimirHistory, isDailyEligible, isWeeklyEligible, markDailyShown, markWeeklyShown, getTodayIso } from '@/shared/utils/mimirHistory'
import styles from './Sprint.module.css'

type FilterType   = 'all' | 'shopping'
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
	const { items, loading, toggleItem, deleteItem, fetchItems, migrateFromLocalStorage, reorderTasks } = useSprintStore()
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
	const [searchParams] = useSearchParams()
	const locationState = location.state as { selectedDay?: string; filterType?: FilterType } | null

	const [filterType, setFilterType]   = useState<FilterType>(locationState?.filterType === 'shopping' ? 'shopping' : 'all')
	const [filterStatus, setFilterStatus] = useState<StatusFilter>('active')

	// "Заморожуємо" рішення показувати підказку на момент монтування — інакше інкремент
	// лічильника в фоні одразу ховав би підказку реактивно (миготіння в той же сеанс).
	const [ghostHintEligible]     = useState(() => !sprintTutorialSeen && sprintTutorialShownCount < GHOST_HINT_LIMIT)
	const [longPressHintEligible] = useState(() => !weekdayLongPressTutorialSeen && weekdayLongPressShownCount < LONGPRESS_HINT_LIMIT)
	const { mimirMode } = useUiStore()

	// ── Mimir sprint dialogues ──────────────────────────────────────────────────
	type SprintEventId = Extract<MimirDialogueId, 'sprint_all_completed' | 'task_first_completed'>
	const [pendingSprintEvent, setPendingSprintEvent] = useState<SprintEventId | null>(null)
	const [showOverdue, setShowOverdue]     = useState(false)
	const [showSprintEmpty, setShowSprintEmpty] = useState(false)
	const sprintStateDecided = useRef(false)
	const prevItemsRef       = useRef<typeof items>([])

	const [showAdd, setShowAdd]           = useState(false)
	const [quickAddDate, setQuickAddDate] = useState<string | null>(null)
	const [detailTaskId, setDetailTaskId] = useState<string | null>(() => searchParams.get('quest'))
	const [binHidden, setBinHidden]       = useState(true)
	const [doneVisibleCount, setDoneVisibleCount]     = useState(20)
	const [activeVisibleCount, setActiveVisibleCount] = useState(20)
	const binTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null)
	const doneSentinelRef   = useRef<HTMLDivElement>(null)
	const activeSentinelRef = useRef<HTMLDivElement>(null)

	const handleSwipeTutorialDone = () => { updateProfile({ sprintTutorialSeen: true }) }

	// ── Calendar / week navigation ────────────────────────────────────────────
	const {
		todayStr,
		selectedDay, setSelectedDay,
		weekStart,
		isCurrentWeek,
		weekExpanded, setWeekExpanded,
		calendarMode,
		toggleCalendarMode,
		goToPrevWeek,
		goToNextWeek,
	} = useSprintCalendar(locationState?.selectedDay)

	// ── Data fetch on mount ───────────────────────────────────────────────────
	// Clean up ?quest= param from URL after reading it on mount
	useEffect(() => {
		if (searchParams.get('quest')) {
			navigate('/sprint', { replace: true })
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

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

	// ── Mimir: state-based hints (once after data loads) ─────────────────────
	useEffect(() => {
		if (loading || sprintStateDecided.current || !myUserId) return
		sprintStateDecided.current = true
		const h = getMimirHistory(myUserId)
		const today = getTodayIso()
		const nonTask = items.filter(t => !isRecurring(t) && t.type !== 'shopping')
		const hasOverdue = nonTask.some(t => !t.done && !!t.dueDate && t.dueDate < today)
		if (hasOverdue && isDailyEligible(h, 'task_overdue')) {
			setShowOverdue(true)
		} else if (!hasOverdue && isCurrentWeek && nonTask.length === 0 && isDailyEligible(h, 'sprint_empty')) {
			setShowSprintEmpty(true)
		}
	}, [loading, items, myUserId, isCurrentWeek])

	// ── Mimir: event-based hints (on toggle) ──────────────────────────────────
	useEffect(() => {
		const prev = prevItemsRef.current
		prevItemsRef.current = items
		if (prev.length === 0 || loading || !myUserId) return
		const nonTask = (arr: typeof items) => arr.filter(t => !isRecurring(t) && t.type !== 'shopping')
		const prevNT = nonTask(prev)
		const currNT = nonTask(items)
		const newlyDone = currNT.filter(t => {
			const p = prevNT.find(x => x.id === t.id)
			return p && !p.done && t.done
		})
		if (newlyDone.length === 0) return
		const h = getMimirHistory(myUserId)
		const allDone = currNT.length > 0 && currNT.every(t => t.done)
		if (allDone && isWeeklyEligible(h, 'sprint_all_completed')) {
			setPendingSprintEvent('sprint_all_completed')
		} else if (prevNT.filter(t => t.done).length === 0 && isWeeklyEligible(h, 'task_first_completed')) {
			setPendingSprintEvent('task_first_completed')
		}
	}, [items, loading, myUserId])

	const routineItems = items.filter(t => isRecurring(t))

	const filteredItems = items.filter(t => {
		if (isRecurring(t)) return false
		if (filterType === 'shopping' && t.type !== 'shopping') return false
		if (filterStatus === 'active') return !t.done
		if (filterStatus === 'done')   return t.done
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
				if (filterType === 'shopping' && t.type !== 'shopping') return false
				return t.dueDate === selectedDay
			}),
		]
	const dayHasAnyItems = isDayToday
		|| items.some(t => !isRecurring(t) && t.dueDate === selectedDay)

	const hasCustomOrder = rawDayQuests.some(t => (t.order ?? 0) > 0)

	const dayQuests = filterStatus === 'done'
		? [...rawDayQuests].sort((a, b) => {
			const tA = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.createdAt).getTime()
			const tB = b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.createdAt).getTime()
			return tB - tA
		})
		: [...rawDayQuests].sort((a: UnifiedTodo, b: UnifiedTodo) => {
			// 1. Custom drag order (if user reordered)
			if (hasCustomOrder) {
				const ao = a.order ?? 0
				const bo = b.order ?? 0
				if (ao > 0 && bo === 0) return -1
				if (ao === 0 && bo > 0) return 1
				if (ao > 0 && bo > 0) return ao - bo
			}
			// 2. Pinned
			if (a.isPinned && !b.isPinned) return -1
			if (!a.isPinned && b.isPinned) return 1
			// 3. Assigned to current user
			const aAssigned = myUserId ? (a.assignedTo?.includes(myUserId) ?? false) : false
			const bAssigned = myUserId ? (b.assignedTo?.includes(myUserId) ?? false) : false
			if (aAssigned && !bAssigned) return -1
			if (!aAssigned && bAssigned) return 1
			// 4. Deadline urgency (exponential)
			const ua = a.dueDate ? deadlineUrgency(a.dueDate, todayStr) : 0
			const ub = b.dueDate ? deadlineUrgency(b.dueDate, todayStr) : 0
			if (ua !== ub) return ub - ua
			// 5. Family tasks (ownerName) above solo tasks
			if (a.ownerName && !b.ownerName) return -1
			if (!a.ownerName && b.ownerName) return 1
			// 6. Newest first
			return b.createdAt.localeCompare(a.createdAt)
		})

	const doneHasMore      = filterStatus === 'done'   && doneVisibleCount   < dayQuests.length
	const activeHasMore    = filterStatus !== 'done'   && activeVisibleCount < dayQuests.length
	const visibleDayQuests = filterStatus === 'done'
		? dayQuests.slice(0, doneVisibleCount)
		: dayQuests.slice(0, activeVisibleCount)

	const showSwipeGhost = ghostHintEligible && !sprintTutorialSeen && isDayToday && filterType !== 'shopping' && filterStatus === 'active'

	// ── Drag-to-reorder ───────────────────────────────────────────────────────
	const {
		dragFromIndex,
		dragOverIndex,
		listRef,
		handleDragHandlePointerDown,
		handleDragPointerMove,
		handleDragPointerUp,
	} = useSprintDrag(visibleDayQuests, reorderTasks)

	useEffect(() => {
		if (binTimerRef.current !== null) clearTimeout(binTimerRef.current)
		if (dayQuests.length === 0 && !showSwipeGhost) {
			binTimerRef.current = setTimeout(() => setBinHidden(true), 300)
		} else {
			binTimerRef.current = setTimeout(() => setBinHidden(false), 0)
		}
	}, [dayQuests.length, showSwipeGhost])

	useEffect(() => {
		setDoneVisibleCount(20)
		setActiveVisibleCount(20)
	}, [filterStatus, filterType, selectedDay])

	useEffect(() => {
		const el = doneSentinelRef.current
		if (!el || !doneHasMore) return
		const observer = new IntersectionObserver(
			([entry]) => { if (entry.isIntersecting) setDoneVisibleCount(c => c + 20) },
			{ threshold: 0.1 },
		)
		observer.observe(el)
		return () => observer.disconnect()
	}, [doneHasMore, doneVisibleCount])

	useEffect(() => {
		const el = activeSentinelRef.current
		if (!el || !activeHasMore) return
		const observer = new IntersectionObserver(
			([entry]) => { if (entry.isIntersecting) setActiveVisibleCount(c => c + 20) },
			{ threshold: 0.1 },
		)
		observer.observe(el)
		return () => observer.disconnect()
	}, [activeHasMore, activeVisibleCount])

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

				{/* ── Status row ── */}
				<div className={styles.statusRow}>
					<div className={styles.statusLeft}>
						{isDayToday && (['active', 'done'] as const).map((status, i) => (
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
					<div className={styles.statusLeft}>
						{(['all', 'shopping'] as const).map((type, i) => (
							<React.Fragment key={type}>
								{i > 0 && <span className={styles.statusSep}>·</span>}
								<button
									className={`${styles.statusBtn} ${filterType === type ? styles.statusBtnActive : ''}`}
									onClick={() => setFilterType(type)}
								>
									{type === 'all' ? 'КВЕСТИ' : 'ПОКУПКИ'}
								</button>
							</React.Fragment>
						))}
					</div>
				</div>

				{/* ── Sprint Mimir dialogues ────────────────────────────────────────────── */}
				{pendingSprintEvent && (
					<div className={styles.mimirFloat}>
						<MimirHint
							pose={MIMIR_DIALOGUE[pendingSprintEvent].pose}
							textKey={getMimirText(pendingSprintEvent, mimirMode)}
							onDismiss={() => { markWeeklyShown(myUserId ?? '', pendingSprintEvent!); setPendingSprintEvent(null) }}
						/>
					</div>
				)}
				{!pendingSprintEvent && filterType === 'task' && (showOverdue || showSprintEmpty) && (
					<div className={styles.mimirFloat}>
						{showOverdue ? (
							<MimirHint
								pose={MIMIR_DIALOGUE.task_overdue.pose}
								textKey={getMimirText('task_overdue', mimirMode)}
								onDismiss={() => { setShowOverdue(false); markDailyShown(myUserId ?? '', 'task_overdue') }}
							/>
						) : (
							<MimirHint
								pose={MIMIR_DIALOGUE.sprint_empty.pose}
								textKey={getMimirText('sprint_empty', mimirMode)}
								onDismiss={() => { setShowSprintEmpty(false); markDailyShown(myUserId ?? '', 'sprint_empty') }}
							/>
						)}
					</div>
				)}

				{/* ── List ── */}
				<div key={`${filterType}-${filterStatus}-${selectedDay}`} className={styles.tabContent}>
					{filterStatus !== 'done' && (
						<button
							className={styles.addRow}
							onClick={() => setShowAdd(true)}
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
								<line x1="12" y1="5" x2="12" y2="19" />
								<line x1="5" y1="12" x2="19" y2="12" />
							</svg>
							{filterType === 'shopping' ? 'Додати покупку' : 'Додати квест'}
						</button>
					)}
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
						<>
							<ul
								ref={listRef}
								className={styles.list}
								onPointerMove={dragFromIndex !== null ? handleDragPointerMove : undefined}
								onPointerUp={dragFromIndex !== null ? handleDragPointerUp : undefined}
							>
								{showSwipeGhost && (
									<TaskCard
										item={SWIPE_GHOST_TASK}
										onToggle={() => {}}
										onDelete={handleSwipeTutorialDone}
										onOpenDetail={() => {}}
									/>
								)}
								{visibleDayQuests.map((t, i) => (
									<TaskCard
										key={t.id}
										item={t}
										onToggle={() => toggleItem(t.id)}
										onDelete={() => deleteItem(t.id)}
										onOpenDetail={() => setDetailTaskId(t.id)}
										onDragHandlePointerDown={filterType !== 'shopping' && filterStatus === 'active' ? (e) => handleDragHandlePointerDown(i, e) : undefined}
										isDragging={dragFromIndex === i}
										isDragOver={dragOverIndex === i && dragFromIndex !== null && dragFromIndex !== i}
									/>
								))}
							</ul>
							{doneHasMore   && <div ref={doneSentinelRef}   className={styles.sentinel} />}
							{activeHasMore && <div ref={activeSentinelRef} className={styles.sentinel} />}
							{!doneHasMore && filterStatus === 'done' && dayQuests.length > 20 && (
								<p className={styles.allLoaded}>Всі {dayQuests.length} завершених</p>
							)}
							{!activeHasMore && filterStatus !== 'done' && dayQuests.length > 20 && (
								<p className={styles.allLoaded}>Всі {dayQuests.length} квестів</p>
							)}
						</>
					)}
				</div>

				{/* ── Trash accordion ── */}
				<TrashBin />
			</div>

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

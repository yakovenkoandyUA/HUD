import React, { useState, useEffect, useRef } from 'react'
import DoodleIllustration from '../../components/ui/DoodleIllustration'
import FabHint from '../../components/ui/FabHint'
import AppHeader from '../../components/AppHeader'
import TrashBin from '../../components/sprint/TrashBin'
import WeekHeader, { addWeeks } from '../../components/sprint/WeekHeader'
import TaskCard from '../../components/sprint/TaskCard'
import TaskDetailModal from '../../components/sprint/TaskDetailModal'
import WeekExpandedView from '../../components/sprint/WeekExpandedView'
import LabelPicker from '../../components/sprint/LabelPicker'
import RepeatConfigScreen from '../../components/sprint/RepeatConfigScreen'
import CustomDatePicker from '../../components/ui/CustomDatePicker'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { useSprintStore } from '../../store/sprintStore'
import { useUiStore } from '../../store/uiStore'
import { useMealPlanStore } from '../../store/mealPlanStore'
import { useRecipesStore } from '../../store/recipesStore'
import { getCurrentWeekStart, isRecurring, isRoutineDueOnDay } from '../../utils/sprint'
import { getToken } from '../../services/api'
import type { UnifiedTodo, TodoPriority, SprintLabel, RepeatConfig } from '../../types'
import styles from './Sprint.module.css'

type FilterType = 'all' | 'task' | 'shopping'
type StatusFilter = 'active' | 'done'

const PRIORITIES: TodoPriority[] = ['urgent', 'normal', 'low']

const PRIORITY_CONFIG: Record<TodoPriority, { symbol: string; label: string; activeClass: string }> = {
	urgent: { symbol: '▲', label: 'ТЕРМІНОВО', activeClass: styles.priBtnActiveUrgent },
	normal: { symbol: '◆', label: 'НОРМ',      activeClass: styles.priBtnActiveNormal },
	low:    { symbol: '▽', label: 'АБИ БУЛО',  activeClass: styles.priBtnActiveLow },
}

type RepeatType    = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
type ReminderUnit  = 'minutes' | 'hours' | 'days' | 'weeks'

const FORM_REMINDER_UNITS: { key: ReminderUnit; label: string }[] = [
  { key: 'minutes', label: 'Хв. до' },
  { key: 'hours',   label: 'Годин'  },
  { key: 'days',    label: 'Днів'   },
  { key: 'weeks',   label: 'Тижнів' },
]

function formatReminderShort(amount: number, unit: ReminderUnit): string {
  if (unit === 'minutes') return `${amount} хв.`
  if (unit === 'hours')   return `${amount} год.`
  if (unit === 'days')    return amount === 1 ? '1 день' : amount < 5 ? `${amount} дні` : `${amount} днів`
  if (unit === 'weeks')   return amount === 1 ? '1 тиждень' : amount < 5 ? `${amount} тижні` : `${amount} тижнів`
  return String(amount)
}

const QUICK_REPEAT_OPTIONS: { key: Exclude<RepeatType, 'none' | 'custom'>; label: string }[] = [
	{ key: 'daily',   label: 'Щодня' },
	{ key: 'weekly',  label: 'Щотижня' },
	{ key: 'monthly', label: 'Щомісяця' },
	{ key: 'yearly',  label: 'Щороку' },
]


function repeatToUnit(r: Exclude<RepeatType, 'none' | 'custom'>): RepeatConfig['unit'] {
	if (r === 'daily')   return 'day'
	if (r === 'weekly')  return 'week'
	if (r === 'monthly') return 'month'
	return 'year'
}

function formatRepeatActiveLabel(repeat: RepeatType, config: RepeatConfig | null): string {
	if (repeat === 'daily')   return 'Щодня'
	if (repeat === 'weekly')  return 'Щотижня'
	if (repeat === 'monthly') return 'Щомісяця'
	if (repeat === 'yearly')  return 'Щороку'
	if (repeat === 'custom' && config) {
		const n = config.interval
		const UNITS: Record<RepeatConfig['unit'], [string, string]> = {
			day:   ['день', 'дні'],
			week:  ['тиждень', 'тижні'],
			month: ['місяць', 'місяці'],
			year:  ['рік', 'роки'],
		}
		const [sing, plur] = UNITS[config.unit]
		return n === 1 ? `Кожен ${sing}` : `Кожні ${n} ${plur}`
	}
	return 'Повтор'
}

const START_DATE_MONTHS = ['січ.','лют.','бер.','квіт.','трав.','черв.','лип.','серп.','вер.','жовт.','лист.','груд.']

function formatStartDate(iso: string): string {
	const [y, m, d] = iso.split('-').map(Number)
	return `${String(d).padStart(2, '0')} ${START_DATE_MONTHS[m - 1]} ${y}`
}

function nextWeekDayFrom(from: Date, weekDays: number[]): string {
	const sorted = [...weekDays].sort((a, b) => a - b)
	for (let i = 0; i < 7; i++) {
		const d = new Date(from)
		d.setDate(from.getDate() + i)
		if (sorted.includes((d.getDay() + 6) % 7)) {
			return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
		}
	}
	return `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`
}


// ── Component ─────────────────────────────────────────────────────────────────

const Sprint: React.FC = () => {
	const { items, loading, addItem, toggleItem, deleteItem, fetchItems, migrateFromLocalStorage } = useSprintStore()
	const { showToast } = useUiStore()
	const { plan: mealPlan, fetchPlan: fetchMealPlan } = useMealPlanStore()
	const { recipes, fetchRecipes } = useRecipesStore()
	const [filterType, setFilterType]     = useState<FilterType>('all')
	const [filterStatus, setFilterStatus] = useState<StatusFilter>('active')

	const [showAdd, setShowAdd]       = useState(false)
	const [newType, setNewType]       = useState<UnifiedTodo['type']>('todo')
	const [newTitle, setNewTitle]     = useState('')
	const [newPriority, setNewPriority] = useState<TodoPriority>('normal')
	const [newQuantity, setNewQuantity]       = useState('')
	const [newLabels, setNewLabels]           = useState<SprintLabel[]>([])
	const [showLabelPicker, setShowLabelPicker] = useState(false)
	const [newRepeat, setNewRepeat]           = useState<RepeatType>('none')
	const [showRepeatList, setShowRepeatList] = useState(false)
	const [showRepeatConfigScreen, setShowRepeatConfigScreen] = useState(false)
	const [newRepeatConfig, setNewRepeatConfig] = useState<RepeatConfig | null>(null)
	const [repeatStartDate, setRepeatStartDate] = useState(() => new Date().toISOString().split('T')[0])
	const [showStartDatePicker, setShowStartDatePicker] = useState(false)
	const [newReminderAmount, setNewReminderAmount] = useState<number | ''>(1)
	const [newReminderUnit, setNewReminderUnit]     = useState<ReminderUnit>('days')
	const [newReminder, setNewReminder]             = useState<{ amount: number; unit: ReminderUnit } | null>(null)
	const [showFormReminderPicker, setShowFormReminderPicker] = useState(false)
	const _td = new Date()
	const todayStr = `${_td.getFullYear()}-${String(_td.getMonth() + 1).padStart(2, '0')}-${String(_td.getDate()).padStart(2, '0')}`
	const [selectedDay, setSelectedDay] = useState(todayStr)
	const [quickAddDate, setQuickAddDate] = useState<string | null>(null)
	const [detailTaskId, setDetailTaskId]     = useState<string | null>(null)
	const [weekExpanded, setWeekExpanded]     = useState(false)
	const [binHidden, setBinHidden]           = useState(true)
	const binTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
		if (isCurrentWeek) return
		const next = addWeeks(weekStart, 1)
		if (next > currentWeekStart) return
		setWeekStart(next)
		setSelectedDay(next === currentWeekStart ? todayStr : next)
	}
	const routineItems = items.filter(t => isRecurring(t))

	const filteredItems = items.filter(t => {
		if (isRecurring(t)) return false
		if (filterType === 'task'     && t.type === 'shopping') return false
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
				if (filterType === 'task'     && t.type === 'shopping') return false
				if (filterType === 'shopping' && t.type !== 'shopping') return false
				return t.dueDate === selectedDay
			}),
		]
	const dayQuests = [...rawDayQuests].sort((a, b) => {
		if (a.isPinned && !b.isPinned) return -1
		if (!a.isPinned && b.isPinned) return 1
		if (a.ownerName && !b.ownerName) return -1
		if (!a.ownerName && b.ownerName) return 1
		return 0
	})

	useEffect(() => {
		if (binTimerRef.current !== null) clearTimeout(binTimerRef.current)
		if (dayQuests.length === 0) {
			binTimerRef.current = setTimeout(() => setBinHidden(true), 300)
		} else {
			binTimerRef.current = setTimeout(() => setBinHidden(false), 0)
		}
	}, [dayQuests.length])

	const resetForm = () => {
		setNewTitle('')
		setNewType('todo')
		setNewPriority('normal')
		setNewQuantity('')
		setNewLabels([])
		setShowLabelPicker(false)
		setNewRepeat('none')
		setNewRepeatConfig(null)
		setShowRepeatList(false)
		setShowRepeatConfigScreen(false)
		setRepeatStartDate(new Date().toISOString().split('T')[0])
		setShowStartDatePicker(false)
		setNewReminderAmount(1)
		setNewReminderUnit('days')
		setNewReminder(null)
		setShowFormReminderPicker(false)
setQuickAddDate(null)
	}

const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (!newTitle.trim()) return
		const hasStartDate = newRepeat !== 'none' && newRepeat !== 'daily' && newRepeat !== 'custom'
		const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0)
		const initialNextDue = newRepeat === 'daily'
			? `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
			: newRepeat === 'custom' && newRepeatConfig?.weekDays?.length
				? nextWeekDayFrom(tomorrow, newRepeatConfig.weekDays)
				: hasStartDate ? repeatStartDate : new Date().toISOString().split('T')[0]
		addItem({
			type:     newType,
			title:    newTitle.trim(),
			priority: newType === 'shopping' ? newPriority : undefined,
			...(quickAddDate && newRepeat === 'none' ? { dueDate: quickAddDate } : {}),
			...(newType === 'shopping' && newQuantity.trim() ? { quantity: newQuantity.trim() } : {}),
			...(newType === 'todo' && newLabels.length > 0 ? { labels: newLabels } : {}),
...(newType === 'todo' && newRepeat !== 'none' ? {
				repeat:       newRepeat,
				repeatConfig: newRepeatConfig ?? { interval: 1, unit: repeatToUnit(newRepeat as Exclude<RepeatType, 'none' | 'custom'>), endsType: 'never' as const },
				nextDue:      initialNextDue,
				...(hasStartDate ? { repeatStartDate } : {}),
				...(newReminder ? { reminder: newReminder } : {}),
			} : {}),
		})
		const isRoutine = newType === 'todo' && newRepeat !== 'none'
		resetForm()
		setShowAdd(false)
		showToast(isRoutine ? `Рутину «${newTitle.trim()}» додано` : 'Справу додано', 'success')
	}

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
						if (iso !== selectedDay) setSelectedDay(iso)
					}}
					onLongPress={handleDayLongPress}
					onPrevWeek={goToPrevWeek}
					onNextWeek={!isCurrentWeek ? goToNextWeek : undefined}
				/>

				{/* ── Meal plan strip ── */}
				{(() => {
					const dayMeals = (mealPlan[selectedDay] ?? []).map(id => recipes.find(r => r.id === id)).filter(Boolean) as typeof recipes
					if (dayMeals.length === 0) return null
					return (
						<div className={styles.mealStrip}>
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={styles.mealStripIcon}>
								<path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" />
							</svg>
							{dayMeals.map(r => (
								<span key={r.id} className={styles.mealChip}>
									{r.title}
								</span>
							))}
						</div>
					)
				})()}

				{/* ── Quest header ── */}
				<div className={styles.questHeader}>
					<span className={styles.sectionTitle}>КВЕСТИ</span>
				</div>

				{/* ── Filters row ── */}
				<div className={styles.filtersRow}>
					<div className={styles.typeFilter}>
						{(['all', 'task', 'shopping'] as const).map((type, i) => (
							<React.Fragment key={type}>
								{i > 0 && <span className={styles.typeSep}>·</span>}
								<button className={`${styles.typeBtn} ${filterType === type ? styles.typeBtnActive : ''}`} onClick={() => setFilterType(type)}>
									{type === 'all' ? 'ВСІ' : type === 'task' ? 'КВЕСТИ' : 'ПОКУПКИ'}
								</button>
							</React.Fragment>
						))}
					</div>
					{isDayToday && (
						<div className={styles.statusFilter}>
							{(['active', 'done'] as const).map((status, i) => (
								<React.Fragment key={status}>
									{i > 0 && <span className={styles.typeSep}>·</span>}
									<button className={`${styles.typeBtn} ${filterStatus === status ? styles.typeBtnActive : ''}`} onClick={() => setFilterStatus(status)}>
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

			{/* ── Add modal ── */}
			<Modal
				isOpen={showAdd}
				onClose={() => {
					setShowAdd(false)
					resetForm()
				}}
				title="Нова справа"
			>
				<form onSubmit={handleAdd} className={styles.taskForm}>
					{quickAddDate && (
						<div className={styles.quickAddDateRow}>
							<svg width="10" height="10" viewBox="0 0 11 11" fill="none" aria-hidden="true">
								<rect x="1" y="2" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
								<path d="M1 5h9M3.5 1v2M7.5 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
							</svg>
							<span>{formatStartDate(quickAddDate)}</span>
							<button type="button" className={styles.quickAddDateClear} onClick={() => setQuickAddDate(null)} aria-label="Прибрати дату">
								×
							</button>
						</div>
					)}
					<div className={styles.typeRow}>
						<button type="button" className={`${styles.formTypeChip} ${styles.formTypeChipTodo}     ${newType === 'todo' ? styles.formTypeChipActive : ''}`} onClick={() => setNewType('todo')}>
							✓ Справа
						</button>
						<button type="button" className={`${styles.formTypeChip} ${styles.formTypeChipShopping} ${newType === 'shopping' ? styles.formTypeChipActive : ''}`} onClick={() => setNewType('shopping')}>
							🛒 Покупка
						</button>
					</div>

					<input className={styles.todoInput} value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Назва..." autoFocus />

					{newType === 'shopping' && (
						<>
							<div className={styles.priorityRow}>
								{PRIORITIES.map(p => {
									const { symbol, label, activeClass } = PRIORITY_CONFIG[p]
									return (
										<button key={p} type="button" className={`${styles.priBtn} ${newPriority === p ? activeClass : ''}`} onClick={() => setNewPriority(p)}>
											<span className={styles.priSymbol}>{symbol}</span>
											<span className={styles.priLabel}>{label}</span>
										</button>
									)
								})}
							</div>
							<input className={styles.todoInput} value={newQuantity} onChange={e => setNewQuantity(e.target.value)} placeholder="Кількість (необов'язково)" />
						</>
					)}

					{newType === 'todo' && (
						<div className={styles.todoExtras}>
							{/* Row 1: labels + repeat toggle inline */}
							<div className={styles.extrasInlineRow}>
								<div className={styles.extrasLabels}>
									{newLabels.map(l => (
										<button key={l.id} type="button" className={styles.selectedLabel} style={{ background: l.color }} onClick={() => setNewLabels(prev => prev.filter(x => x.id !== l.id))}>
											{l.title}
											<svg width="7" height="7" viewBox="0 0 7 7" fill="none">
												<path d="M1 1l5 5M6 1L1 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
											</svg>
										</button>
									))}
									<button type="button" className={styles.addExtrasBtn} onClick={() => setShowLabelPicker(true)}>
										<svg width="10" height="10" viewBox="0 0 10 10" fill="none">
											<path d="M5 2v6M2 5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
										</svg>
										Мітка
									</button>
								</div>

								{newRepeat === 'none' ? (
									<button type="button" className={styles.repeatToggleBtn} onClick={() => setShowRepeatList(v => !v)}>
										<svg width="11" height="11" viewBox="0 0 10 10" fill="none">
											<circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.3" />
											<path d="M5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
										</svg>
										Повторити
									</button>
								) : (
									<span className={styles.repeatActiveLabel} style={{ cursor: 'pointer' }} onClick={() => setShowRepeatList(v => !v)}>
										<svg width="11" height="11" viewBox="0 0 10 10" fill="none">
											<circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.3" />
											<path d="M5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
										</svg>
										{formatRepeatActiveLabel(newRepeat, newRepeatConfig)}
										<button
											type="button"
											className={styles.repeatActiveClose}
											onClick={e => {
												e.stopPropagation()
												setNewRepeat('none')
												setNewRepeatConfig(null)
												setShowRepeatList(false)
												setShowRepeatConfigScreen(false)
											}}
										>
											✕
										</button>
									</span>
								)}
							</div>

							{/* Start date: shown for weekly / monthly / yearly */}
							{(newRepeat === 'weekly' || newRepeat === 'monthly' || newRepeat === 'yearly') && !showRepeatList && (
								<div className={styles.startDateRow}>
									<svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
										<rect x="1" y="2" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
										<path d="M1 5h9M3.5 1v2M7.5 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
									</svg>
									<span className={styles.startDateLabel}>Починаючи з:</span>
									<button type="button" className={styles.dateDisplayBtn} onClick={() => setShowStartDatePicker(true)}>
										{formatStartDate(repeatStartDate)}
									</button>
								</div>
							)}

							{/* Routine hint */}
							{newRepeat !== 'none' && !showRepeatList && (
								<div className={styles.routineHint}>
									<svg width="10" height="10" viewBox="0 0 10 10" fill="none">
										<circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.3" />
										<path d="M5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
									</svg>
									Ця справа стане рутиною — видно у тижневому вигляді
								</div>
							)}

							{/* Reminder: shown when repeat is set */}
							{newRepeat !== 'none' && !showRepeatList && (
								<div className={styles.formReminderRow}>
									{newReminder ? (
										<div className={styles.formReminderActive}>
											<svg width="11" height="11" viewBox="0 0 16 18" fill="none">
												<path d="M8 1a5 5 0 0 1 5 5v3l2 2H1l2-2V6a5 5 0 0 1 5-5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
												<path d="M6 14a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
											</svg>
											<span>За {formatReminderShort(newReminder.amount, newReminder.unit)}</span>
											<button type="button" className={styles.formReminderClear} onClick={() => setNewReminder(null)} aria-label="Видалити">
												×
											</button>
										</div>
									) : (
										<button
											type="button"
											className={styles.formReminderBtn}
											onClick={() => {
												setNewReminderAmount(1)
												setNewReminderUnit('days')
												setShowFormReminderPicker(true)
											}}
										>
											<svg width="11" height="11" viewBox="0 0 16 18" fill="none">
												<path d="M8 1a5 5 0 0 1 5 5v3l2 2H1l2-2V6a5 5 0 0 1 5-5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
												<path d="M6 14a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
											</svg>
											Сповіщення
										</button>
									)}
								</div>
							)}

							{/* Repeat option list */}
							{showRepeatList && (
								<div className={styles.repeatList}>
									<button
										type="button"
										className={`${styles.repeatListItem} ${newRepeat === 'none' ? styles.repeatListItemActive : ''}`}
										onClick={() => {
											setNewRepeat('none')
											setNewRepeatConfig(null)
											setShowRepeatList(false)
										}}
									>
										<span>Не повторюється</span>
										{newRepeat === 'none' && (
											<svg width="11" height="11" viewBox="0 0 11 11" fill="none">
												<path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
											</svg>
										)}
									</button>
									{QUICK_REPEAT_OPTIONS.map(opt => (
										<button
											type="button"
											key={opt.key}
											className={`${styles.repeatListItem} ${newRepeat === opt.key ? styles.repeatListItemActive : ''}`}
											onClick={() => {
												setNewRepeat(opt.key)
												setNewRepeatConfig(null)
												setShowRepeatList(false)
											}}
										>
											<span>{opt.label}</span>
											{newRepeat === opt.key && (
												<svg width="11" height="11" viewBox="0 0 11 11" fill="none">
													<path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
												</svg>
											)}
										</button>
									))}
									<button
										type="button"
										className={`${styles.repeatListItem} ${styles.repeatListCustom} ${newRepeat === 'custom' ? styles.repeatListItemActive : ''}`}
										onClick={() => {
											setShowRepeatList(false)
											setShowRepeatConfigScreen(true)
										}}
									>
										<span>Налаштувати...</span>
										{newRepeat === 'custom' && (
											<svg width="11" height="11" viewBox="0 0 11 11" fill="none">
												<path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
											</svg>
										)}
									</button>
								</div>
							)}
						</div>
					)}

					<Button type="submit" fullWidth>
						Додати
					</Button>
				</form>
			</Modal>

			{showFormReminderPicker && (
				<div className={styles.formReminderOverlay} onClick={() => setShowFormReminderPicker(false)}>
					<div className={styles.formReminderSheet} onClick={e => e.stopPropagation()}>
						<div className={styles.formReminderHandle} />
						<div className={styles.formReminderSheetHeader}>
							<span className={styles.formReminderSheetTitle}>Сповіщення</span>
							<button type="button" className={styles.formReminderSheetClose} onClick={() => setShowFormReminderPicker(false)} aria-label="Закрити">
								✕
							</button>
						</div>
						<div className={styles.formReminderSheetBody}>
							<div className={styles.formReminderAmountRow}>
								<input
									type="number"
									className={styles.formReminderAmountInput}
									value={newReminderAmount}
									min={1}
									max={999}
									onFocus={e => e.target.select()}
									onChange={e => setNewReminderAmount(e.target.value === '' ? '' : Math.min(999, Number(e.target.value)))}
								/>
								<span className={styles.formReminderAmountLabel}>
									{newReminderUnit === 'minutes' ? 'хвилин' : newReminderUnit === 'hours' ? 'годин' : newReminderUnit === 'days' ? 'днів' : 'тижнів'} до
								</span>
							</div>
							<div className={styles.formReminderUnitList}>
								{FORM_REMINDER_UNITS.map(u => (
									<button key={u.key} type="button" className={styles.formReminderUnitRow} onClick={() => setNewReminderUnit(u.key)}>
										<span className={`${styles.formReminderRadio} ${newReminderUnit === u.key ? styles.formReminderRadioActive : ''}`} />
										<span className={`${styles.formReminderUnitLabel} ${newReminderUnit === u.key ? styles.formReminderUnitLabelActive : ''}`}>{u.label}</span>
									</button>
								))}
							</div>
						</div>
						<button
							type="button"
							className={styles.formReminderDoneBtn}
							onClick={() => {
								setNewReminder({ amount: Math.max(1, Math.min(999, Number(newReminderAmount) || 1)), unit: newReminderUnit })
								setShowFormReminderPicker(false)
							}}
						>
							Готово
						</button>
					</div>
				</div>
			)}

			{showRepeatConfigScreen && (
				<RepeatConfigScreen
					initial={newRepeatConfig ?? undefined}
					onSave={config => {
						setNewRepeat('custom')
						setNewRepeatConfig(config)
						setShowRepeatConfigScreen(false)
					}}
					onClose={() => setShowRepeatConfigScreen(false)}
				/>
			)}

			{showStartDatePicker && (
				<CustomDatePicker
					value={repeatStartDate}
					onChange={date => {
						setRepeatStartDate(date)
						setShowStartDatePicker(false)
					}}
					onClose={() => setShowStartDatePicker(false)}
				/>
			)}

			{/* Trash bin — fixed, fly-to-bin target for TaskCard swipe-delete */}
			<div className={`${styles.trashBin} ${filteredItems.length === 0 ? styles.trashBinEmpty : ''}`} id="sprint-trash-bin" aria-hidden="true" style={binHidden ? { display: 'none' } : undefined}>
				<svg width="20" height="22" viewBox="0 0 18 20" fill="none">
					<path d="M1 4h16M6 4V2h6v2M3 4l1 14a1 1 0 001 1h8a1 1 0 001-1L15 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M7 8v6M11 8v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
				</svg>
			</div>

			{weekExpanded && (
				<WeekExpandedView
					weekStart={weekStart}
					routineItems={routineItems}
					allItems={items}
					onToggle={toggleItem}
					onOpenDetail={setDetailTaskId}
					onClose={() => setWeekExpanded(false)}
					initialDay={selectedDay}
				/>
			)}

			{showLabelPicker && (
				<LabelPicker
					selectedLabels={newLabels}
					onToggle={label => setNewLabels(prev => (prev.some(l => l.id === label.id) ? prev.filter(l => l.id !== label.id) : [...prev, label]))}
					onClose={() => setShowLabelPicker(false)}
				/>
			)}

			<TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />
		</div>
	)
}

export default Sprint

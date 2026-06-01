import React, { useState, useEffect, useRef } from 'react'
import TopBar from '../../components/layout/TopBar'
import WeekHeader from '../../components/sprint/WeekHeader'
import SprintProgress from '../../components/sprint/SprintProgress'
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
import { getCurrentWeekStart } from '../../utils/sprint'
import { getToken } from '../../services/api'
import type { UnifiedTodo, TodoPriority, SprintLabel, RepeatConfig } from '../../types'
import styles from './Sprint.module.css'

const SYNC_COLORS: Record<string, string> = {
	synced: 'var(--positive)',
	syncing: 'var(--gold)',
	error: 'var(--negative)',
	local: 'var(--text3)',
}

const PANEL_ANIM_MS = 220

type FilterType = 'all' | 'sprint' | 'shopping' | 'todo'
type StatusFilter = 'active' | 'done' | 'all'

const TYPE_OPTIONS: { key: FilterType; label: string }[] = [
	{ key: 'all',      label: 'Всі' },
	{ key: 'shopping', label: 'Покупки' },
	{ key: 'todo',     label: 'Справи' },
]

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
	{ key: 'all',    label: 'Всі' },
	{ key: 'active', label: 'Активні' },
	{ key: 'done',   label: 'Завершені' },
]

const PRIORITIES: TodoPriority[] = ['urgent', 'normal', 'low']

const PRIORITY_CONFIG: Record<TodoPriority, { symbol: string; label: string; activeClass: string }> = {
	urgent: { symbol: '▲', label: 'ТЕРМІНОВО', activeClass: styles.priBtnActiveUrgent },
	normal: { symbol: '◆', label: 'НОРМ',      activeClass: styles.priBtnActiveNormal },
	low:    { symbol: '▽', label: 'АБИ БУЛО',  activeClass: styles.priBtnActiveLow },
}

type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

const QUICK_REPEAT_OPTIONS: { key: Exclude<RepeatType, 'none' | 'custom'>; label: string }[] = [
	{ key: 'daily',   label: 'Щодня' },
	{ key: 'weekly',  label: 'Щотижня' },
	{ key: 'monthly', label: 'Щомісяця' },
	{ key: 'yearly',  label: 'Щороку' },
]

const REPEAT_BADGE: Record<string, string> = {
	daily:   'ЩОДНЯ',
	weekly:  'ЩОТИЖНЯ',
	monthly: 'ЩОМІСЯЦЯ',
	yearly:  'ЩОРОКУ',
}

const WEEK_DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

function getRoutineBadge(t: UnifiedTodo): string {
	if (t.repeat !== 'custom') return REPEAT_BADGE[t.repeat ?? ''] ?? ''
	if (!t.repeatConfig) return 'CUSTOM'
	const { interval, unit, weekDays } = t.repeatConfig
	const UNITS: Record<RepeatConfig['unit'], [string, string]> = {
		day:   ['ДЕНЬ', 'ДНІ'],
		week:  ['ТИЖ', 'ТИЖ'],
		month: ['МІС', 'МІС'],
		year:  ['РІК', 'Р'],
	}
	const [sing, plur] = UNITS[unit]
	let label = interval === 1 ? `КОЖ. ${sing}` : `КОЖ. ${interval} ${plur}`
	if (unit === 'week' && weekDays && weekDays.length > 0) {
		label = [...weekDays].sort((a, b) => a - b).map(d => WEEK_DAY_SHORT[d]).join(', ')
	}
	return label
}

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

function formatRoutineDue(dateStr: string): string {
	const today  = new Date(); today.setHours(0, 0, 0, 0)
	const [ry, rm, rd] = dateStr.split('-').map(Number)
	const target = new Date(ry, rm - 1, rd)
	const diff   = Math.round((target.getTime() - today.getTime()) / 86400000)
	if (diff < 0)  return 'Прострочено'
	if (diff === 0) return 'Сьогодні'
	if (diff === 1) return 'Завтра'
	const DAYS   = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
	const MONTHS = ['січ.', 'лют.', 'бер.', 'квіт.', 'трав.', 'черв.', 'лип.', 'серп.', 'вер.', 'жовт.', 'лист.', 'груд.']
	return `${DAYS[target.getDay()]} ${target.getDate()} ${MONTHS[target.getMonth()]}`
}

// ── Chip group ────────────────────────────────────────────────────────────────

interface ChipGroupProps<T extends string> {
	label: string
	options: { key: T; label: string }[]
	value: T
	onChange: (v: T) => void
}

function ChipGroup<T extends string>({ label, options, value, onChange }: ChipGroupProps<T>) {
	return (
		<div className={styles.chipGroup}>
			<span className={styles.chipGroupLabel}>{label}</span>
			<div className={styles.chipRow}>
				{options.map(opt => (
					<button key={opt.key} type="button" className={`${styles.chip} ${value === opt.key ? styles.chipActive : ''}`} onClick={() => onChange(opt.key)}>
						{opt.label}
					</button>
				))}
			</div>
		</div>
	)
}

const IconFilter: React.FC<{ active?: boolean }> = ({ active }) => (
	<svg width="15" height="13" viewBox="0 0 15 13" fill="none" aria-hidden="true">
		<path d="M1 1.5h13M3.5 6.5h8M6 11.5h3" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" />
	</svg>
)

// ── Component ─────────────────────────────────────────────────────────────────

const Sprint: React.FC = () => {
	const { items, addItem, toggleItem, deleteItem, fetchItems, syncStatus } = useSprintStore()
	const { showToast } = useUiStore()
	const [filter, setFilter]             = useState<FilterType>('all')
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
	const [showFilterPanel, setShowFilterPanel]       = useState(false)
	const [filterPanelMounted, setFilterPanelMounted] = useState(false)
	const [filterPanelVisible, setFilterPanelVisible] = useState(false)
	const filterPanelRef  = useRef<HTMLDivElement>(null)
	const filterTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

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
	const [routinesOpen, setRoutinesOpen]     = useState(false)
	const [completingRoutines, setCompletingRoutines] = useState<Set<string>>(new Set())
	const [detailTaskId, setDetailTaskId]     = useState<string | null>(null)
	const [weekExpanded, setWeekExpanded]     = useState(false)

	const openPanel = () => {
		if (filterTimerRef.current !== null) {
			clearTimeout(filterTimerRef.current)
			filterTimerRef.current = null
		}
		setShowFilterPanel(true)
		setFilterPanelMounted(true)
		requestAnimationFrame(() => requestAnimationFrame(() => setFilterPanelVisible(true)))
	}

	const closePanel = () => {
		setShowFilterPanel(false)
		setFilterPanelVisible(false)
		filterTimerRef.current = setTimeout(() => setFilterPanelMounted(false), PANEL_ANIM_MS)
	}

	const togglePanel = () => (showFilterPanel ? closePanel() : openPanel())

	useEffect(
		() => () => {
			if (filterTimerRef.current !== null) clearTimeout(filterTimerRef.current)
		},
		[],
	)

	useEffect(() => {
		if (!getToken()) return
		fetchItems()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const weekStart      = getCurrentWeekStart()
	const weekSprintItems = items.filter(t => t.type === 'sprint' && t.weekStart === weekStart)
	const done            = weekSprintItems.filter(t => t.done).length

	const routineItems = items.filter(t => t.repeat && t.repeat !== 'none')

	const filteredItems = items.filter(t => {
		if (t.repeat && t.repeat !== 'none') return false
		if (filter !== 'all' && t.type !== filter) return false
		if (statusFilter === 'active') return !t.done
		if (statusFilter === 'done')   return t.done
		return true
	})

	const isFiltered = filter !== 'all' || statusFilter !== 'active'

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
	}

	const handleAdd = (e: React.FormEvent) => {
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
			...(newType === 'shopping' && newQuantity.trim() ? { quantity: newQuantity.trim() } : {}),
			...(newType === 'todo' && newLabels.length > 0 ? { labels: newLabels } : {}),
			...(newType === 'todo' && newRepeat !== 'none' ? {
				repeat:       newRepeat,
				repeatConfig: newRepeatConfig ?? { interval: 1, unit: repeatToUnit(newRepeat as Exclude<RepeatType, 'none' | 'custom'>), endsType: 'never' as const },
				nextDue:      initialNextDue,
				...(hasStartDate ? { repeatStartDate } : {}),
			} : {}),
		})
		resetForm()
		setShowAdd(false)
		showToast('Справу додано', 'success')
	}

	const handleRoutineToggle = (id: string) => {
		setCompletingRoutines(prev => new Set(prev).add(id))
		setTimeout(() => {
			toggleItem(id)
			setCompletingRoutines(prev => { const s = new Set(prev); s.delete(id); return s })
		}, 380)
	}

	return (
		<div className={styles.screen}>
			<TopBar title="Квести" right={<span title={syncStatus} style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: SYNC_COLORS[syncStatus] }} />} />

			<div className={styles.content}>
				<WeekHeader weekStart={weekStart} onExpand={() => setWeekExpanded(true)} routineItems={routineItems} />
				<SprintProgress done={done} total={weekSprintItems.length} />

				{/* ── Рутини accordion ── */}
				{routineItems.length > 0 && (
					<div className={styles.routinesSection}>
						<button type="button" className={styles.routineHeader} onClick={() => setRoutinesOpen(v => !v)} aria-expanded={routinesOpen}>
							<span className={styles.sectionTitle}>Рутини</span>
							<div className={styles.sectionActions}>
								<span className={styles.routineCount}>{routineItems.length}</span>
								<svg className={`${styles.routineArrow} ${routinesOpen ? styles.routineArrowOpen : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
									<path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</div>
						</button>

						<ul className={`${styles.routineList} ${routinesOpen ? styles.routineListOpen : ''}`}>
							{routineItems.map(t => (
									<li key={t.id} className={`${styles.routineItem} ${completingRoutines.has(t.id) ? styles.routineItemCompleting : ''}`}>
										<button type="button" className={styles.routineCheck} onClick={() => handleRoutineToggle(t.id)} aria-label="Виконати">
											<span className={styles.routineCheckBox}>{completingRoutines.has(t.id) ? '✓' : ''}</span>
										</button>
										<button type="button" className={styles.routineBody} onClick={() => setDetailTaskId(t.id)}>
											<span className={styles.routineTitle}>{t.title}</span>
											<div className={styles.routineMeta}>
												<span className={styles.repeatBadge}>{getRoutineBadge(t)}</span>
												{t.nextDue && <span className={styles.routineDue}>{formatRoutineDue(t.nextDue)}</span>}
											</div>
										</button>
										<button type="button" className={styles.del} onClick={() => deleteItem(t.id)} aria-label="Видалити">
											✕
										</button>
									</li>
								))}
						</ul>
					</div>
				)}

				{/* ── Section header ── */}
				<div className={styles.sectionHeader}>
					<span className={styles.sectionTitle}>Квести</span>
					<div className={styles.sectionActions}>
						<button
							className={`${styles.filterBtn} ${showFilterPanel ? styles.filterBtnOpen : ''} ${isFiltered && !showFilterPanel ? styles.filterBtnActive : ''}`}
							onClick={togglePanel}
							aria-label="Фільтр"
						>
							<IconFilter active={isFiltered} />
							{isFiltered && !showFilterPanel && <span className={styles.filterDot} />}
						</button>
						<button className={styles.addBtn} onClick={() => setShowAdd(true)} aria-label="Додати">
							<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
								<path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
							</svg>
						</button>
					</div>
				</div>

				{/* ── Filter panel ── */}
				{filterPanelMounted && (
					<div className={`${styles.filterPanel} ${filterPanelVisible ? styles.filterPanelVisible : styles.filterPanelHidden}`} ref={filterPanelRef}>
						<ChipGroup label="Тип" options={TYPE_OPTIONS} value={filter} onChange={setFilter} />
						<ChipGroup label="Статус" options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
						<div className={styles.filterFooter}>
							{isFiltered && (
								<button
									className={styles.resetBtn}
									onClick={() => {
										setFilter('all')
										setStatusFilter('active')
									}}
								>
									Скинути все
								</button>
							)}
							<button className={styles.doneBtn} onClick={closePanel}>
								Готово
							</button>
						</div>
					</div>
				)}

				{/* ── Active filter pills — always visible ── */}
				{!showFilterPanel && (
					<div className={styles.activePills}>
						<button className={`${styles.activePill} ${filter === 'all' ? styles.activePillDefault : ''}`} onClick={() => (filter !== 'all' ? setFilter('all') : undefined)} aria-label="Фільтр типу">
							{TYPE_OPTIONS.find(o => o.key === filter)?.label ?? 'Всі'}
							{filter !== 'all' && (
								<svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
									<path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
								</svg>
							)}
						</button>
						<button
							className={`${styles.activePill} ${statusFilter === 'active' ? styles.activePillDefault : ''}`}
							onClick={() => (statusFilter !== 'active' ? setStatusFilter('active') : undefined)}
							aria-label="Фільтр статусу"
						>
							{STATUS_OPTIONS.find(o => o.key === statusFilter)?.label ?? 'Активні'}
							{statusFilter !== 'active' && (
								<svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
									<path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
								</svg>
							)}
						</button>
					</div>
				)}

				{/* ── List ── */}
				<div key={`${filter}-${statusFilter}`} className={styles.tabContent}>
					{filteredItems.length === 0 ? (
						<div className={styles.emptyState}>
							<span className={styles.emptyIcon}>✓</span>
							<span className={styles.emptyTitle}>{statusFilter === 'active' ? 'Активних квестів немає' : 'Список чистий'}</span>
							<span className={styles.emptyHint}>{statusFilter === 'active' ? 'Всі виконано 🎉' : 'Додай першу справу'}</span>
						</div>
					) : (
						<ul className={styles.list}>
							{filteredItems.map(t => (
								<TaskCard key={t.id} item={t} onToggle={() => toggleItem(t.id)} onDelete={() => deleteItem(t.id)} onOpenDetail={() => setDetailTaskId(t.id)} />
							))}
						</ul>
					)}
				</div>
			</div>

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
										<button type="button" className={styles.repeatActiveClose} onClick={e => { e.stopPropagation(); setNewRepeat('none'); setNewRepeatConfig(null); setShowRepeatList(false); setShowRepeatConfigScreen(false) }}>✕</button>
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

							{/* Repeat option list */}
							{showRepeatList && (
								<div className={styles.repeatList}>
									<button type="button" className={`${styles.repeatListItem} ${newRepeat === 'none' ? styles.repeatListItemActive : ''}`}
										onClick={() => { setNewRepeat('none'); setNewRepeatConfig(null); setShowRepeatList(false) }}>
										<span>Не повторюється</span>
										{newRepeat === 'none' && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
									</button>
									{QUICK_REPEAT_OPTIONS.map(opt => (
										<button type="button" key={opt.key}
											className={`${styles.repeatListItem} ${newRepeat === opt.key ? styles.repeatListItemActive : ''}`}
											onClick={() => { setNewRepeat(opt.key); setNewRepeatConfig(null); setShowRepeatList(false) }}>
											<span>{opt.label}</span>
											{newRepeat === opt.key && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
										</button>
									))}
									<button type="button"
										className={`${styles.repeatListItem} ${styles.repeatListCustom} ${newRepeat === 'custom' ? styles.repeatListItemActive : ''}`}
										onClick={() => { setShowRepeatList(false); setShowRepeatConfigScreen(true) }}>
										<span>Налаштувати...</span>
										{newRepeat === 'custom' && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
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

			{showRepeatConfigScreen && (
				<RepeatConfigScreen
					initial={newRepeatConfig ?? undefined}
					onSave={config => { setNewRepeat('custom'); setNewRepeatConfig(config); setShowRepeatConfigScreen(false) }}
					onClose={() => setShowRepeatConfigScreen(false)}
				/>
			)}

			{showStartDatePicker && (
				<CustomDatePicker
					value={repeatStartDate}
					onChange={date => { setRepeatStartDate(date); setShowStartDatePicker(false) }}
					onClose={() => setShowStartDatePicker(false)}
				/>
			)}

			{weekExpanded && <WeekExpandedView weekStart={weekStart} routineItems={routineItems} onToggle={toggleItem} onOpenDetail={setDetailTaskId} onClose={() => setWeekExpanded(false)} />}

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

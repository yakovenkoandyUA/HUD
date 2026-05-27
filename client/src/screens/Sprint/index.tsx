import React, { useState, useEffect, useRef } from 'react'
import TopBar from '../../components/layout/TopBar'
import WeekHeader from '../../components/sprint/WeekHeader'
import SprintProgress from '../../components/sprint/SprintProgress'
import TaskCard from '../../components/sprint/TaskCard'
import TaskDetailModal from '../../components/sprint/TaskDetailModal'
import LessonItem from '../../components/lessons/LessonItem'
import LessonForm from '../../components/lessons/LessonForm'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { useSprintStore } from '../../store/sprintStore'
import { useLessonStore } from '../../store/lessonStore'
import { useUiStore } from '../../store/uiStore'
import { getCurrentWeekStart } from '../../utils/sprint'
import { getToken } from '../../services/api'
import type { Lesson, UnifiedTodo, TodoPriority } from '../../types'
import styles from './Sprint.module.css'

const SYNC_COLORS: Record<string, string> = {
	synced: 'var(--positive)',
	syncing: 'var(--gold)',
	error: 'var(--negative)',
	local: 'var(--text3)',
}

const PANEL_ANIM_MS = 220

type FilterType = 'all' | 'sprint' | 'shopping' | 'todo' | 'lessons'
type StatusFilter = 'active' | 'done' | 'all'

const TYPE_OPTIONS: { key: FilterType; label: string }[] = [
	{ key: 'all', label: 'Всі' },
	{ key: 'sprint', label: 'Спринт' },
	{ key: 'shopping', label: 'Покупки' },
	{ key: 'todo', label: 'Todo' },
	{ key: 'lessons', label: 'Уроки' },
]

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
	{ key: 'active', label: 'Активні' },
	{ key: 'done', label: 'Завершені' },
	{ key: 'all', label: 'Всі' },
]

const PRIORITIES: TodoPriority[] = ['urgent', 'normal', 'low']

const PRIORITY_CONFIG: Record<TodoPriority, { symbol: string; label: string; activeClass: string }> = {
	urgent: { symbol: '▲', label: 'ТЕРМІНОВО', activeClass: styles.priBtnActiveUrgent },
	normal: { symbol: '◆', label: 'НОРМ', activeClass: styles.priBtnActiveNormal },
	low: { symbol: '▽', label: 'АБИ БУЛО', activeClass: styles.priBtnActiveLow },
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
	const { lessons, addLesson, updateLesson, deleteLesson, fetchLessons } = useLessonStore()
	const { showToast } = useUiStore()

	const [filter, setFilter] = useState<FilterType>('all')
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
	const [showFilterPanel, setShowFilterPanel] = useState(false)
	const [filterPanelMounted, setFilterPanelMounted] = useState(false)
	const [filterPanelVisible, setFilterPanelVisible] = useState(false)
	const filterPanelRef = useRef<HTMLDivElement>(null)
	const filterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const [showAdd, setShowAdd] = useState(false)
	const [newType, setNewType] = useState<UnifiedTodo['type']>('sprint')
	const [newTitle, setNewTitle] = useState('')
	const [newPriority, setNewPriority] = useState<TodoPriority>('normal')
	const [newQuantity, setNewQuantity] = useState('')

	const [detailTaskId, setDetailTaskId] = useState<string | null>(null)
	const [showAddLesson, setShowAddLesson] = useState(false)
	const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)

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
			if (filterTimerRef.current !== null) {
				clearTimeout(filterTimerRef.current)
			}
		},
		[],
	)

	useEffect(() => {
		if (!getToken()) return
		fetchItems()
		fetchLessons()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const weekStart = getCurrentWeekStart()
	const weekSprintItems = items.filter(t => t.type === 'sprint' && t.weekStart === weekStart)
	const done = weekSprintItems.filter(t => t.done).length

	const filteredItems = items.filter(t => {
		if (filter === 'lessons') return false
		if (filter !== 'all' && t.type !== filter) return false
		if (statusFilter === 'active') return !t.done
		if (statusFilter === 'done') return t.done
		return true
	})

	const isFiltered = filter !== 'all' || statusFilter !== 'active'

	const resetForm = () => {
		setNewTitle('')
		setNewPriority('normal')
		setNewQuantity('')
	}

	const handleAdd = (e: React.FormEvent) => {
		e.preventDefault()
		if (!newTitle.trim()) return
		addItem({
			type: newType,
			title: newTitle.trim(),
			...(newType === 'sprint' ? { tag: 'dev', weekStart } : {}),
			...(newType !== 'sprint' ? { priority: newPriority } : {}),
			...(newType === 'shopping' && newQuantity.trim() ? { quantity: newQuantity.trim() } : {}),
		})
		resetForm()
		setShowAdd(false)
		showToast('Задачу додано', 'success')
	}

	const handleSaveLesson = (data: Omit<Lesson, 'id'>) => {
		if (editingLesson) {
			updateLesson(editingLesson.id, data)
			showToast('Урок оновлено', 'success')
		} else {
			addLesson(data.title, data.description, data.date)
			showToast('Урок додано', 'success')
		}
		setShowAddLesson(false)
		setEditingLesson(null)
	}

	return (
		<div className={styles.screen}>
			<TopBar title="Todo" right={<span title={syncStatus} style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: SYNC_COLORS[syncStatus] }} />} />

			<div className={styles.content}>
				<WeekHeader weekStart={weekStart} />
				<SprintProgress done={done} total={weekSprintItems.length} />

				{/* ── Section header ── */}
				<div className={styles.sectionHeader}>
					<span className={styles.sectionTitle}>{filter === 'lessons' ? 'Уроки' : 'Задачі'}</span>
					<div className={styles.sectionActions}>
						<button
							className={`${styles.filterBtn} ${showFilterPanel ? styles.filterBtnOpen : ''} ${isFiltered && !showFilterPanel ? styles.filterBtnActive : ''}`}
							onClick={togglePanel}
							aria-label="Фільтр"
						>
							<IconFilter active={isFiltered} />
							{isFiltered && !showFilterPanel && <span className={styles.filterDot} />}
						</button>
						<button
							className={styles.addBtn}
							onClick={() => {
								if (filter === 'lessons') {
									setEditingLesson(null)
									setShowAddLesson(true)
								} else setShowAdd(true)
							}}
							aria-label="Додати"
						>
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
						{filter !== 'lessons' && <ChipGroup label="Статус" options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />}
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

				{/* ── Active filter pills ── */}
				{!showFilterPanel && isFiltered && (
					<div className={styles.activePills}>
						{filter !== 'all' && (
							<button className={styles.activePill} onClick={() => setFilter('all')} aria-label="Прибрати фільтр типу">
								{TYPE_OPTIONS.find(o => o.key === filter)?.label}
								<svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
									<path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
								</svg>
							</button>
						)}
						{statusFilter !== 'active' && filter !== 'lessons' && (
							<button className={styles.activePill} onClick={() => setStatusFilter('active')} aria-label="Прибрати фільтр статусу">
								{STATUS_OPTIONS.find(o => o.key === statusFilter)?.label}
								<svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
									<path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
								</svg>
							</button>
						)}
					</div>
				)}

				{/* ── List ── */}
				<div key={`${filter}-${statusFilter}`} className={styles.tabContent}>
					{filter !== 'lessons' &&
						(filteredItems.length === 0 ? (
							<div className={styles.emptyState}>
								<span className={styles.emptyIcon}>✓</span>
								<span className={styles.emptyTitle}>{statusFilter === 'active' ? 'Активних задач немає' : 'Список чистий'}</span>
								<span className={styles.emptyHint}>{statusFilter === 'active' ? 'Всі виконано 🎉' : 'Додай першу задачу'}</span>
							</div>
						) : (
							<ul className={styles.list}>
								{filteredItems.map(t => (
									<TaskCard key={t.id} item={t} onToggle={() => toggleItem(t.id)} onDelete={() => deleteItem(t.id)} onOpenDetail={() => setDetailTaskId(t.id)} />
								))}
							</ul>
						))}

					{filter === 'lessons' &&
						(lessons.length === 0 ? (
							<div className={styles.emptyState}>
								<span className={styles.emptyIcon}>📖</span>
								<span className={styles.emptyTitle}>Уроків ще немає</span>
								<span className={styles.emptyHint}>Додай перший урок</span>
							</div>
						) : (
							<ul className={styles.lessonList}>
								{lessons.map(l => (
									<LessonItem
										key={l.id}
										lesson={l}
										onEdit={() => {
											setEditingLesson(l)
											setShowAddLesson(true)
										}}
										onDelete={() => deleteLesson(l.id)}
									/>
								))}
							</ul>
						))}
				</div>
			</div>

			{/* ── Add task modal ── */}
			<Modal
				isOpen={showAdd}
				onClose={() => {
					setShowAdd(false)
					resetForm()
				}}
				title="Нова задача"
			>
				<form onSubmit={handleAdd} className={styles.taskForm}>
					<div className={styles.typeRow}>
						<button type="button" className={`${styles.formTypeChip} ${styles.formTypeChipSprint}   ${newType === 'sprint' ? styles.formTypeChipActive : ''}`} onClick={() => setNewType('sprint')}>
							⚡ Спринт
						</button>
						<button type="button" className={`${styles.formTypeChip} ${styles.formTypeChipShopping} ${newType === 'shopping' ? styles.formTypeChipActive : ''}`} onClick={() => setNewType('shopping')}>
							🛒 Покупка
						</button>
						<button type="button" className={`${styles.formTypeChip} ${styles.formTypeChipTodo}     ${newType === 'todo' ? styles.formTypeChipActive : ''}`} onClick={() => setNewType('todo')}>
							✓ Todo
						</button>
					</div>

					<input className={styles.todoInput} value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Назва задачі..." autoFocus />

					{(newType === 'shopping' || newType === 'todo') && (
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
					)}

					{newType === 'shopping' && <input className={styles.todoInput} value={newQuantity} onChange={e => setNewQuantity(e.target.value)} placeholder="Кількість (необов'язково)" />}

					<Button type="submit" fullWidth>
						Додати
					</Button>
				</form>
			</Modal>

			{/* ── Lesson modal ── */}
			<Modal
				isOpen={showAddLesson}
				onClose={() => {
					setShowAddLesson(false)
					setEditingLesson(null)
				}}
				title={editingLesson ? 'Редагувати урок' : 'Новий урок'}
			>
				<LessonForm
					initial={editingLesson ?? undefined}
					onSave={handleSaveLesson}
					onCancel={() => {
						setShowAddLesson(false)
						setEditingLesson(null)
					}}
				/>
			</Modal>

			<TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />
		</div>
	)
}

export default Sprint

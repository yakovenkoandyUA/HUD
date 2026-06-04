import React, { useState } from 'react'
import type { RepeatConfig } from '../../../types'
import CustomDatePicker from '../../ui/CustomDatePicker'
import styles from './RepeatConfigScreen.module.css'

const WEEK_DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
const MONTHS_SHORT = ['січ.','лют.','бер.','квіт.','трав.','черв.','лип.','серп.','вер.','жовт.','лист.','груд.']

type UnitOption = RepeatConfig['unit']

const UNIT_OPTIONS: { value: UnitOption; singular: string; plural: string }[] = [
	{ value: 'day',   singular: 'день',    plural: 'дні' },
	{ value: 'week',  singular: 'тиждень', plural: 'тижні' },
	{ value: 'month', singular: 'місяць',  plural: 'місяці' },
	{ value: 'year',  singular: 'рік',     plural: 'роки' },
]

function formatEndsDate(iso: string): string {
	const [y, m, d] = iso.split('-').map(Number)
	return `${String(d).padStart(2, '0')} ${MONTHS_SHORT[m - 1]} ${y}`
}

/**
 * RepeatConfigScreen
 * ------------------
 * Full-screen overlay for configuring a custom repeat schedule.
 * Slides up from the bottom.
 *
 * @param initial  - Optional initial config to pre-populate the form.
 * @param onSave   - Called with the final RepeatConfig when "Готово" is tapped.
 * @param onClose  - Called on "Назад" / close without saving.
 */
interface RepeatConfigScreenProps {
	initial?: RepeatConfig
	onSave: (config: RepeatConfig) => void
	onClose: () => void
}

const RepeatConfigScreen: React.FC<RepeatConfigScreenProps> = ({ initial, onSave, onClose }) => {
	const [interval, setInterval] = useState<number>(initial?.interval ?? 1)
	const [unit, setUnit] = useState<UnitOption>(initial?.unit ?? 'week')
	const [weekDays, setWeekDays] = useState<number[]>(initial?.weekDays ?? [])
	const [endsType, setEndsType] = useState<RepeatConfig['endsType']>(initial?.endsType ?? 'never')
	const [endsDate, setEndsDate] = useState<string>(initial?.endsDate ?? '')
	const [endsAfter, setEndsAfter] = useState<number>(initial?.endsAfter ?? 1)
	const [showDatePicker, setShowDatePicker] = useState(false)

	const unitLabel = (u: UnitOption, n: number) => {
		const opt = UNIT_OPTIONS.find(o => o.value === u)!
		return n === 1 ? opt.singular : opt.plural
	}

	const toggleWeekDay = (day: number) => {
		setWeekDays(prev =>
			prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day],
		)
	}

	const handleSave = () => {
		const config: RepeatConfig = {
			interval,
			unit,
			...(unit === 'week' && weekDays.length > 0 ? { weekDays } : {}),
			endsType,
			...(endsType === 'date' && endsDate ? { endsDate } : {}),
			...(endsType === 'after' ? { endsAfter } : {}),
		}
		onSave(config)
		onClose()
	}

	return (
		<>
			<div className={styles.screen}>
				{/* Header */}
				<div className={styles.header}>
					<button type="button" className={styles.backBtn} onClick={onClose}>
						← Назад
					</button>
					<span className={styles.title}>НАЛАШТУВАТИ ПОВТОРИ</span>
					<button type="button" className={styles.doneBtn} onClick={handleSave}>
						Готово
					</button>
				</div>

				{/* Body */}
				<div className={styles.body}>
					{/* Section 1: Interval */}
					<div className={styles.section}>
						<div className={styles.sectionTitle}>ПОВТОРЮЄТЬСЯ З ІНТЕРВАЛОМ</div>
						<div className={styles.intervalRow}>
							<input
								type="number"
								className={styles.intervalInput}
								value={interval}
								onChange={e => setInterval(Math.max(1, parseInt(e.target.value, 10) || 1))}
							/>
							<select
								className={styles.unitSelect}
								value={unit}
								onChange={e => setUnit(e.target.value as UnitOption)}
							>
								{UNIT_OPTIONS.map(opt => (
									<option key={opt.value} value={opt.value}>
										{unitLabel(opt.value, interval)}
									</option>
								))}
							</select>
						</div>
					</div>

					{/* Section 2: Week days (only when unit === 'week') */}
					{unit === 'week' && (
						<div className={styles.section}>
							<div className={styles.sectionTitle}>ПОВТОРЮЄТЬСЯ В ТАКІ ДНІ</div>
							<div className={styles.weekDayRow}>
								{WEEK_DAY_LABELS.map((label, idx) => (
									<button
										key={idx}
										type="button"
										className={`${styles.weekDayBtn} ${weekDays.includes(idx) ? styles.weekDayBtnActive : ''}`}
										onClick={() => toggleWeekDay(idx)}
									>
										{label}
									</button>
								))}
							</div>
						</div>
					)}

					{/* Section 3: Ends */}
					<div className={styles.section}>
						<div className={styles.sectionTitle}>ЗАКІНЧУЄТЬСЯ</div>
						<div className={styles.endsRows}>

							{/* Ніколи */}
							<div
								className={`${styles.endsRow} ${endsType === 'never' ? styles.endsRowActive : ''}`}
								onClick={() => setEndsType('never')}
							>
								<span className={`${styles.endsRadio} ${endsType === 'never' ? styles.endsRadioActive : ''}`} />
								<span className={styles.endsRowLabel}>Ніколи</span>
							</div>

							{/* Дата */}
							<div className={styles.endsRowGroup}>
								<div
									className={`${styles.endsRow} ${endsType === 'date' ? styles.endsRowActive : ''}`}
									onClick={() => setEndsType('date')}
								>
									<span className={`${styles.endsRadio} ${endsType === 'date' ? styles.endsRadioActive : ''}`} />
									<span className={styles.endsRowLabel}>Дата</span>
								</div>
								<div className={`${styles.endsDateExpand} ${endsType === 'date' ? styles.endsDateExpandOpen : ''}`}>
									<button
										type="button"
										className={styles.endsDateBtn}
										onClick={() => setShowDatePicker(true)}
									>
										<svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={styles.endsDateIcon}>
											<rect x="1" y="2.5" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.2"/>
											<path d="M1 6h12" stroke="currentColor" strokeWidth="1.2"/>
											<path d="M4 1v3M10 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
										</svg>
										<span className={endsDate ? '' : styles.endsDatePlaceholder}>
											{endsDate ? formatEndsDate(endsDate) : 'Вибрати дату'}
										</span>
									</button>
								</div>
							</div>

							{/* Після */}
							<div
								className={`${styles.endsRow} ${styles.endsRowLast} ${endsType === 'after' ? styles.endsRowActive : ''}`}
								onClick={() => setEndsType('after')}
							>
								<span className={`${styles.endsRadio} ${endsType === 'after' ? styles.endsRadioActive : ''}`} />
								<span className={styles.endsRowLabel}>Після</span>
								{endsType === 'after' && (
									<>
										<input
											type="number"
											className={styles.endsAfterInput}
											value={endsAfter}
											onClick={e => e.stopPropagation()}
											onChange={e => setEndsAfter(Math.max(1, parseInt(e.target.value, 10) || 1))}
										/>
										<span className={styles.endsAfterSuffix}>разу</span>
									</>
								)}
							</div>

						</div>
					</div>
				</div>
			</div>

			{/* Custom DatePicker — renders on top of this screen (both fixed z-400, picker is later in DOM) */}
			{showDatePicker && (
				<CustomDatePicker
					value={endsDate || undefined}
					onChange={date => { setEndsDate(date); setShowDatePicker(false) }}
					onClose={() => setShowDatePicker(false)}
				/>
			)}
		</>
	)
}

export default RepeatConfigScreen

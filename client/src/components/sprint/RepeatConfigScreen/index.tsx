import React, { useState } from 'react'
import type { RepeatConfig } from '../../../types'
import styles from './RepeatConfigScreen.module.css'

const WEEK_DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

type UnitOption = RepeatConfig['unit']

const UNIT_OPTIONS: { value: UnitOption; singular: string; plural: string }[] = [
	{ value: 'day',   singular: 'день',    plural: 'дні' },
	{ value: 'week',  singular: 'тиждень', plural: 'тижні' },
	{ value: 'month', singular: 'місяць',  plural: 'місяці' },
	{ value: 'year',  singular: 'рік',     plural: 'роки' },
]

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
							min={1}
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
					<div className={styles.endsOptions}>
						<label className={styles.endsOption}>
							<input
								type="radio"
								name="endsType"
								value="never"
								checked={endsType === 'never'}
								onChange={() => setEndsType('never')}
								className={styles.radio}
							/>
							<span className={styles.endsOptionText}>Ніколи</span>
						</label>

						<label className={styles.endsOption}>
							<input
								type="radio"
								name="endsType"
								value="date"
								checked={endsType === 'date'}
								onChange={() => setEndsType('date')}
								className={styles.radio}
							/>
							<span className={styles.endsOptionText}>Дата</span>
							{endsType === 'date' && (
								<input
									type="date"
									className={styles.endsDateInput}
									value={endsDate}
									onChange={e => setEndsDate(e.target.value)}
								/>
							)}
						</label>

						<label className={`${styles.endsOption} ${styles.endsOptionLast}`}>
							<input
								type="radio"
								name="endsType"
								value="after"
								checked={endsType === 'after'}
								onChange={() => setEndsType('after')}
								className={styles.radio}
							/>
							<span className={styles.endsOptionText}>Після</span>
							{endsType === 'after' && (
								<>
									<input
										type="number"
										className={styles.endsAfterInput}
										value={endsAfter}
										min={1}
										onChange={e => setEndsAfter(Math.max(1, parseInt(e.target.value, 10) || 1))}
									/>
									<span className={styles.endsAfterSuffix}> разу</span>
								</>
							)}
						</label>
					</div>
				</div>
			</div>
		</div>
	)
}

export default RepeatConfigScreen

import React, { useState, useEffect, useRef } from 'react'
import { useGoalsStore } from '../../../store/goalsStore'
import { fmt } from '../../../utils/finance'
import type { Goal } from '../../../types'
import GoalDetail from '../GoalDetail'
import styles from './GoalsList.module.css'

/**
 * GoalsList
 * ---------
 * Список цілей накопичення. Тап на картку → GoalDetail. Кнопка + → inline форма поповнення.
 */

const R    = 20
const SW   = 4
const CX   = 24
const CY   = 24
const CIRC = 2 * Math.PI * R

interface GoalRowProps {
  goal: Goal
  isDepositing: boolean
  depositAmount: string
  depositError?: string
  onOpen: () => void
  onDepositStart: () => void
  onDepositAmountChange: (v: string) => void
  onDepositConfirm: () => void
  onDepositCancel: () => void
}

const GoalRow: React.FC<GoalRowProps> = ({
  goal, isDepositing, depositAmount, depositError,
  onOpen, onDepositStart, onDepositAmountChange, onDepositConfirm, onDepositCancel,
}) => {
  const pct       = goal.targetAmount > 0
    ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
    : 0
  const done      = pct >= 100
  const offset    = CIRC - (pct / 100) * CIRC
  const ringColor = done ? 'var(--second)' : 'var(--gold)'
  const barColor  = done ? 'var(--second)' : 'var(--gold)'

  return (
    <div className={styles.goalCardWrap}>
      <div
        className={styles.goalCard}
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onOpen()}
      >
        <svg width="48" height="48" viewBox="0 0 48 48" className={styles.ring}>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border2)" strokeWidth={SW} />
          <circle
            cx={CX} cy={CY} r={R}
            fill="none" stroke={ringColor} strokeWidth={SW}
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${CX} ${CY})`}
          />
          <text
            x={CX} y={CY + 4}
            textAnchor="middle"
            fill={ringColor}
            fontSize="10"
            fontFamily="var(--font-mono)"
            fontWeight="700"
          >
            {pct}%
          </text>
        </svg>

        <div className={styles.goalInfo}>
          <div className={styles.goalHeader}>
            <span className={styles.goalName}>{goal.title}</span>
            <span className={styles.goalAmount}>
              {fmt(goal.currentAmount)} / {fmt(goal.targetAmount)} ₴
            </span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${pct}%`, background: barColor }} />
          </div>
        </div>

        {!done && (
          <button
            type="button"
            className={styles.plusBtn}
            aria-label="Поповнити"
            onClick={e => { e.stopPropagation(); onDepositStart() }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {isDepositing && (
        <div className={styles.quickDeposit}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              className={`${styles.depositInput} ${depositError ? 'inputError' : ''}`}
              type="number"
              placeholder="Сума (₴)"
              value={depositAmount}
              onChange={e => onDepositAmountChange(e.target.value)}
              onFocus={e => e.target.select()}
              autoFocus
            />
            {depositError && <span className="errorMsg">{depositError}</span>}
          </div>
          <button type="button" className={styles.depositConfirm} onClick={onDepositConfirm}>✓</button>
          <button type="button" className={styles.depositCancel} onClick={onDepositCancel}>×</button>
        </div>
      )}
    </div>
  )
}

const GoalsList: React.FC = () => {
  const { goals, goalsLoading, fetchGoals, addGoal, contribute } = useGoalsStore()
  const [showAdd, setShowAdd]               = useState(false)
  const [newTitle, setNewTitle]             = useState('')
  const [newTarget, setNewTarget]           = useState('')
  const [addErrors, setAddErrors]           = useState<{ title?: string; target?: string }>({})
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const lastGoalRef = useRef<Goal | null>(null)
  const [depositGoalId, setDepositGoalId]   = useState<string | null>(null)
  const [depositAmount, setDepositAmount]   = useState('')
  const [depositError, setDepositError]     = useState<string | undefined>()

  useEffect(() => { fetchGoals() }, [fetchGoals])

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: { title?: string; target?: string } = {}
    if (!newTitle.trim()) errs.title = 'Введіть назву'
    const target = parseFloat(newTarget)
    if (!target || target <= 0) errs.target = 'Введіть суму'
    if (Object.keys(errs).length > 0) { setAddErrors(errs); return }
    setAddErrors({})
    addGoal(newTitle.trim(), target)
    setNewTitle('')
    setNewTarget('')
    setShowAdd(false)
  }

  const handleDeposit = (id: string, amount: number) => {
    if (!amount || amount <= 0) { setDepositError('Введіть суму'); return }
    setDepositError(undefined)
    contribute(id, amount)
    setDepositGoalId(null)
    setDepositAmount('')
  }

  const handleDepositAmountChange = (v: string) => {
    setDepositAmount(v)
    const n = parseFloat(v)
    if (depositError && n > 0) setDepositError(undefined)
  }

  const selectedGoal = selectedGoalId
    ? goals.find(g => g.id === selectedGoalId) ?? null
    : null
  if (selectedGoal) lastGoalRef.current = selectedGoal
  const displayGoal = selectedGoal ?? lastGoalRef.current

  return (
		<div className={styles.wrap}>
			<div className={styles.header}>
				<span className={styles.title}>Цілі накопичення</span>
				<button type="button" className={styles.addBtn} onClick={() => { setShowAdd(v => !v); setAddErrors({}) }}>
					<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
						<path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
					</svg>
					{showAdd ? '✕' : 'Нова ціль'}
				</button>
			</div>

			{showAdd && (
				<form className={styles.addForm} onSubmit={handleAdd}>
					<div>
						<input
							className={`${styles.input} ${addErrors.title ? 'inputError' : ''}`}
							placeholder="Назва цілі..."
							value={newTitle}
							onChange={e => {
								setNewTitle(e.target.value)
								if (addErrors.title && e.target.value.trim()) setAddErrors(prev => ({ ...prev, title: undefined }))
							}}
							autoFocus
						/>
						{addErrors.title && <span className="errorMsg">{addErrors.title}</span>}
					</div>
					<div>
						<input
							className={`${styles.input} ${addErrors.target ? 'inputError' : ''}`}
							type="number"
							placeholder="Ціль (₴)"
							value={newTarget}
							onChange={e => {
								setNewTarget(e.target.value)
								if (addErrors.target && parseFloat(e.target.value) > 0) setAddErrors(prev => ({ ...prev, target: undefined }))
							}}
						/>
						{addErrors.target && <span className="errorMsg">{addErrors.target}</span>}
					</div>
					<button type="submit" className={styles.submitBtn}>
						Додати
					</button>
				</form>
			)}

			{goalsLoading && goals.length === 0 ? (
				<div className={styles.skeletonList}>
					{[1, 2].map(i => (
						<div key={i} className={styles.skeletonRow}>
							<div className={styles.skeletonRing} />
							<div className={styles.skeletonInfo}>
								<div className={styles.skeletonTitle} />
								<div className={styles.skeletonBar} />
							</div>
						</div>
					))}
				</div>
			) : goals.length === 0 && !showAdd ? (
				<p className={styles.empty}>Немає цілей накопичення</p>
			) : (
				<div className={styles.list}>
					{goals.map(g => (
						<GoalRow
							key={g.id}
							goal={g}
							isDepositing={depositGoalId === g.id}
							depositAmount={depositGoalId === g.id ? depositAmount : ''}
							depositError={depositGoalId === g.id ? depositError : undefined}
							onOpen={() => {
								setDepositGoalId(null)
								setDepositError(undefined)
								setSelectedGoalId(g.id)
							}}
							onDepositStart={() => {
								setDepositGoalId(g.id)
								setDepositAmount('')
								setDepositError(undefined)
							}}
							onDepositAmountChange={handleDepositAmountChange}
							onDepositConfirm={() => handleDeposit(g.id, parseFloat(depositAmount))}
							onDepositCancel={() => {
								setDepositGoalId(null)
								setDepositAmount('')
								setDepositError(undefined)
							}}
						/>
					))}
				</div>
			)}

			{displayGoal && <GoalDetail goal={displayGoal} isOpen={!!selectedGoalId} onClose={() => setSelectedGoalId(null)} />}
		</div>
	)
}

export default GoalsList

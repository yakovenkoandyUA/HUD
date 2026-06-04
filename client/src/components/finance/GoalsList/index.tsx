import React, { useState, useEffect } from 'react'
import { useGoalsStore } from '../../../store/goalsStore'
import { fmt } from '../../../utils/finance'
import type { Goal } from '../../../types'
import GoalDetail from '../GoalDetail'
import styles from './GoalsList.module.css'

/**
 * GoalsList
 * ---------
 * Список цілей накопичення. Тап на картку → GoalDetail. Кнопка + → inline форма поповнення.
 *
 * Props:
 * @prop {number} [addTrigger] — збільшення відкриває форму додавання
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
  onOpen: () => void
  onDepositStart: () => void
  onDepositAmountChange: (v: string) => void
  onDepositConfirm: () => void
  onDepositCancel: () => void
}

const GoalRow: React.FC<GoalRowProps> = ({
  goal, isDepositing, depositAmount,
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
          <input
            className={styles.depositInput}
            type="number"
            placeholder="Сума (₴)"
            value={depositAmount}
            onChange={e => onDepositAmountChange(e.target.value)}
            onFocus={e => e.target.select()}
            autoFocus
            min="1"
          />
          <button
            type="button"
            className={styles.depositConfirm}
            onClick={onDepositConfirm}
          >✓</button>
          <button
            type="button"
            className={styles.depositCancel}
            onClick={onDepositCancel}
          >×</button>
        </div>
      )}
    </div>
  )
}

interface GoalsListProps {
  addTrigger?: number
}

const GoalsList: React.FC<GoalsListProps> = ({ addTrigger }) => {
  const { goals, fetchGoals, addGoal, contribute } = useGoalsStore()
  const [showAdd, setShowAdd]               = useState(false)
  const [newTitle, setNewTitle]             = useState('')
  const [newTarget, setNewTarget]           = useState('')
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [depositGoalId, setDepositGoalId]   = useState<string | null>(null)
  const [depositAmount, setDepositAmount]   = useState('')

  useEffect(() => {
    if (addTrigger && addTrigger > 0) setShowAdd(true)
  }, [addTrigger])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const target = parseFloat(newTarget)
    if (!newTitle.trim() || !target || target <= 0) return
    addGoal(newTitle.trim(), target)
    setNewTitle('')
    setNewTarget('')
    setShowAdd(false)
  }

  const handleDeposit = (id: string, amount: number) => {
    if (!amount || amount <= 0) return
    contribute(id, amount)
    setDepositGoalId(null)
    setDepositAmount('')
  }

  const selectedGoal = selectedGoalId
    ? goals.find(g => g.id === selectedGoalId) ?? null
    : null

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>Цілі накопичення</span>
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => setShowAdd(v => !v)}
        >
          {showAdd ? '✕' : 'Нова ціль'}
        </button>
      </div>

      {showAdd && (
        <form className={styles.addForm} onSubmit={handleAdd}>
          <input
            className={styles.input}
            placeholder="Назва цілі..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            autoFocus
          />
          <input
            className={styles.input}
            type="number"
            placeholder="Ціль (₴)"
            value={newTarget}
            onChange={e => setNewTarget(e.target.value)}
            min="1"
          />
          <button type="submit" className={styles.submitBtn}>Додати</button>
        </form>
      )}

      {goals.length === 0 && !showAdd ? (
        <p className={styles.empty}>Немає цілей накопичення</p>
      ) : (
        <div className={styles.list}>
          {goals.map(g => (
            <GoalRow
              key={g.id}
              goal={g}
              isDepositing={depositGoalId === g.id}
              depositAmount={depositGoalId === g.id ? depositAmount : ''}
              onOpen={() => { setDepositGoalId(null); setSelectedGoalId(g.id) }}
              onDepositStart={() => { setDepositGoalId(g.id); setDepositAmount('') }}
              onDepositAmountChange={setDepositAmount}
              onDepositConfirm={() => handleDeposit(g.id, parseFloat(depositAmount))}
              onDepositCancel={() => { setDepositGoalId(null); setDepositAmount('') }}
            />
          ))}
        </div>
      )}

      {selectedGoal && (
        <GoalDetail
          goal={selectedGoal}
          onClose={() => setSelectedGoalId(null)}
        />
      )}
    </div>
  )
}

export default GoalsList

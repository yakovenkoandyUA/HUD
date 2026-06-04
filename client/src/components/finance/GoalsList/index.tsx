import React, { useState, useEffect } from 'react'
import { useGoalsStore } from '../../../store/goalsStore'
import { fmt } from '../../../utils/finance'
import type { Goal } from '../../../types'
import GoalDetail from '../GoalDetail'
import styles from './GoalsList.module.css'

/**
 * GoalsList
 * ---------
 * Список цілей накопичення. Кожна ціль — компактний горизонтальний рядок
 * з SVG кільцем 48px і тонким прогрес-баром. Тап на картку відкриває GoalDetail.
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
  onClick: () => void
}

const GoalRow: React.FC<GoalRowProps> = ({ goal, onClick }) => {
  const pct       = goal.targetAmount > 0
    ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
    : 0
  const done      = pct >= 100
  const offset    = CIRC - (pct / 100) * CIRC
  const ringColor = done ? 'var(--second)' : 'var(--gold)'
  const barColor  = done ? 'var(--second)' : 'var(--gold)'

  return (
    <div className={styles.goalCard} onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}>
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
    </div>
  )
}

interface GoalsListProps {
  addTrigger?: number
}

const GoalsList: React.FC<GoalsListProps> = ({ addTrigger }) => {
  const { goals, fetchGoals, addGoal } = useGoalsStore()
  const [showAdd, setShowAdd]         = useState(false)
  const [newTitle, setNewTitle]       = useState('')
  const [newTarget, setNewTarget]     = useState('')
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)

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
            <GoalRow key={g.id} goal={g} onClick={() => setSelectedGoalId(g.id)} />
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

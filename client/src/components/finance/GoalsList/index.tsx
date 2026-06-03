import React, { useState, useEffect } from 'react'
import { useGoalsStore } from '../../../store/goalsStore'
import { fmt } from '../../../utils/finance'
import type { Goal } from '../../../types'
import styles from './GoalsList.module.css'

/**
 * GoalsList
 * ---------
 * Список цілей накопичення. Кожна ціль — компактний горизонтальний рядок
 * з SVG кільцем 48px і тонким прогрес-баром.
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
  onContribute: (goal: Goal) => void
  onDelete: (id: string) => void
}

const GoalRow: React.FC<GoalRowProps> = ({ goal, onContribute, onDelete }) => {
  const pct       = goal.targetAmount > 0
    ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
    : 0
  const done      = pct >= 100
  const offset    = CIRC - (pct / 100) * CIRC
  const ringColor = done ? 'var(--second)' : 'var(--gold)'
  const barColor  = done ? 'var(--second)' : 'var(--gold)'

  return (
    <div className={styles.goalCard}>
      {/* ── SVG ring 48px ── */}
      <svg width="48" height="48" viewBox="0 0 48 48" className={styles.ring}>
        <circle
          cx={CX} cy={CY} r={R}
          fill="none" stroke="var(--border2)" strokeWidth={SW}
        />
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

      {/* ── Centre: name + amount + thin progress bar ── */}
      <div className={styles.goalInfo}>
        <div className={styles.goalHeader}>
          <span className={styles.goalName}>{goal.title}</span>
          <span className={styles.goalAmount}>
            {fmt(goal.currentAmount)} / {fmt(goal.targetAmount)} ₴
          </span>
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div className={styles.goalActions}>
        {!done && (
          <button
            type="button"
            className={styles.contributeBtn}
            onClick={() => onContribute(goal)}
            aria-label="Поповнити"
          >
            +
          </button>
        )}
        <button
          type="button"
          className={styles.deleteBtn}
          onClick={() => onDelete(goal.id)}
          aria-label="Видалити"
        >
          ×
        </button>
      </div>
    </div>
  )
}

interface GoalsListProps {
  addTrigger?: number
}

const GoalsList: React.FC<GoalsListProps> = ({ addTrigger }) => {
  const { goals, fetchGoals, addGoal, contribute, deleteGoal } = useGoalsStore()
  const [showAdd, setShowAdd]               = useState(false)
  const [showContribute, setShowContribute] = useState(false)
  const [activeGoal, setActiveGoal]         = useState<Goal | null>(null)
  const [newTitle, setNewTitle]             = useState('')
  const [newTarget, setNewTarget]           = useState('')
  const [contribAmount, setContribAmount]   = useState('')

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

  const handleContribute = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(contribAmount)
    if (!activeGoal || !amt || amt <= 0) return
    contribute(activeGoal.id, amt)
    setContribAmount('')
    setShowContribute(false)
    setActiveGoal(null)
  }

  const openContribute = (goal: Goal) => {
    setActiveGoal(goal)
    setContribAmount('')
    setShowContribute(true)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>Цілі накопичення</span>
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => setShowAdd((v) => !v)}
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
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
          />
          <input
            className={styles.input}
            type="number"
            placeholder="Ціль (₴)"
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            min="1"
          />
          <button type="submit" className={styles.submitBtn}>Додати</button>
        </form>
      )}

      {goals.length === 0 && !showAdd ? (
        <p className={styles.empty}>Немає цілей накопичення</p>
      ) : (
        <div className={styles.list}>
          {goals.map((g) => (
            <GoalRow
              key={g.id}
              goal={g}
              onContribute={openContribute}
              onDelete={deleteGoal}
            />
          ))}
        </div>
      )}

      {showContribute && activeGoal && (
        <form className={styles.contribForm} onSubmit={handleContribute}>
          <span className={styles.contribLabel}>
            Поповнити «{activeGoal.title}»
          </span>
          <div className={styles.contribRow}>
            <input
              className={styles.input}
              type="number"
              placeholder="Сума (₴)"
              value={contribAmount}
              onChange={(e) => setContribAmount(e.target.value)}
              min="1"
              autoFocus
            />
            <button type="submit" className={styles.submitBtn}>OK</button>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => { setShowContribute(false); setActiveGoal(null) }}
            >✕</button>
          </div>
        </form>
      )}
    </div>
  )
}

export default GoalsList

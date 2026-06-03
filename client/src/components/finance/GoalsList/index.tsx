import React, { useState, useEffect } from 'react'
import { useGoalsStore } from '../../../store/goalsStore'
import { fmt } from '../../../utils/finance'
import type { Goal } from '../../../types'
import styles from './GoalsList.module.css'

/**
 * GoalsList
 * ---------
 * Список цілей накопичення з прогрес-барами.
 * Дозволяє додавати нові цілі та поповнювати існуючі.
 * Синхронізується з backend якщо токен присутній.
 *
 * Props:
 * @prop {boolean} [openAdd] — якщо true, відразу відкриває форму додавання
 */

interface GoalRowProps {
  goal: Goal
  onContribute: (goal: Goal) => void
  onDelete: (id: string) => void
}

const GoalRow: React.FC<GoalRowProps> = ({ goal, onContribute, onDelete }) => {
  const pct = goal.targetAmount > 0
    ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
    : 0
  const done = pct >= 100

  return (
    <div className={`${styles.row} ${done ? styles.rowDone : ''}`}>
      <div className={styles.rowHeader}>
        <div className={styles.rowTitle}>
          <span className={styles.goalName}>{goal.title}</span>
          {done && <span className={styles.doneBadge}>Досягнуто!</span>}
        </div>
        <div className={styles.rowActions}>
          {!done && (
            <button
              type="button"
              className={styles.contributeBtn}
              onClick={() => onContribute(goal)}
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

      <div className={styles.barTrack}>
        <div
          className={styles.barFill}
          style={{
            width: `${pct}%`,
            background: done ? 'var(--positive)' : 'var(--accent)',
          }}
        />
      </div>

      <div className={styles.rowMeta}>
        <span className={styles.savedAmt}>{fmt(goal.currentAmount)} ₴</span>
        <span className={styles.pct}>{Math.round(pct)}%</span>
        <span className={styles.targetAmt}>{fmt(goal.targetAmount)} ₴</span>
      </div>
    </div>
  )
}

interface GoalsListProps {
  addTrigger?: number
}

const GoalsList: React.FC<GoalsListProps> = ({ addTrigger }) => {
  const { goals, fetchGoals, addGoal, contribute, deleteGoal } = useGoalsStore()
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    if (addTrigger && addTrigger > 0) setShowAdd(true)
  }, [addTrigger])
  const [showContribute, setShowContribute] = useState(false)
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null)

  const [newTitle, setNewTitle] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [contribAmount, setContribAmount] = useState('')

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

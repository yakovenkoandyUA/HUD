import React, { useState, useMemo } from 'react'
import type { Goal } from '../../../types'
import { useGoalsStore } from '../../../store/goalsStore'
import { fmt } from '../../../utils/finance'
import Modal from '../../ui/Modal'
import ImageUploadButton from '../../ui/ImageUploadButton'
import styles from './GoalDetail.module.css'

/**
 * GoalDetail
 * ----------
 * Модалка деталей цілі накопичення: зображення, кільце прогресу 96px,
 * форма поповнення, список депозитів, прогноз та видалення.
 *
 * Props:
 * @prop {Goal}        goal    — ціль з goalsStore (реактивна — оновлюється після contribute)
 * @prop {boolean}     isOpen  — контролює анімацію відкриття/закриття Modal
 * @prop {() => void}  onClose — закрити модалку
 */
interface GoalDetailProps {
  goal: Goal
  isOpen: boolean
  onClose: () => void
}

const R    = 40
const SW   = 8
const CX   = 48
const CY   = 48
const CIRC = 2 * Math.PI * R

function calcForecast(goal: Goal): string {
  if (!goal.deposits || goal.deposits.length === 0) return ''
  const now = new Date()
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  const recent = goal.deposits.filter(d => new Date(d.date) >= threeMonthsAgo)
  if (recent.length === 0) return ''
  const total3m = recent.reduce((s, d) => s + d.amount, 0)
  const avgPerMonth = total3m / 3
  if (avgPerMonth <= 0) return ''
  const remaining = goal.targetAmount - goal.currentAmount
  if (remaining <= 0) return ''
  const months = Math.ceil(remaining / avgPerMonth)
  if (months > 120) return ''
  return `~${months} міс.`
}

const GoalDetail: React.FC<GoalDetailProps> = ({ goal, isOpen, onClose }) => {
  const { contribute, updateImage, deleteGoal } = useGoalsStore()
  const [contribAmount, setContribAmount] = useState('')
  const [contribError, setContribError]   = useState<string | undefined>()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const pct    = goal.targetAmount > 0
    ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
    : 0
  const done   = pct >= 100
  const offset = CIRC - (pct / 100) * CIRC
  const color  = done ? 'var(--second)' : 'var(--gold)'

  const forecast = useMemo(() => calcForecast(goal), [goal])

  const handleContribute = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(contribAmount)
    if (!amt || amt <= 0) { setContribError('Введіть суму'); return }
    setContribError(undefined)
    contribute(goal.id, amt)
    setContribAmount('')
  }

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    deleteGoal(goal.id)
    onClose()
  }

  const sortedDeposits = useMemo(() => {
    if (!goal.deposits) return []
    return [...goal.deposits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [goal.deposits])

  return (
    <Modal isOpen={isOpen} onClose={onClose} draggable>
      <div className={styles.wrap}>

        <ImageUploadButton
          currentUrl={goal.imageUrl || ''}
          folder="mimir/goals"
          onUpload={url => updateImage(goal.id, url)}
          placeholder="Додати фото цілі"
          variant="wide"
        />

        <div className={styles.hero}>
          <svg width="96" height="96" viewBox="0 0 96 96" className={styles.ring}>
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border2)" strokeWidth={SW} />
            <circle
              cx={CX} cy={CY} r={R}
              fill="none" stroke={color} strokeWidth={SW}
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${CX} ${CY})`}
            />
            <text
              x={CX} y={CY + 5}
              textAnchor="middle"
              fill={color}
              fontSize="14"
              fontFamily="var(--font-mono)"
              fontWeight="700"
            >
              {pct}%
            </text>
          </svg>

          <div className={styles.heroInfo}>
            <div className={styles.heroTitle}>
              {goal.emoji && <span className={styles.emoji}>{goal.emoji}</span>}
              <span className={styles.name}>{goal.title}</span>
            </div>
            <div className={styles.amounts}>
              <span className={styles.current}>{fmt(goal.currentAmount)} ₴</span>
              <span className={styles.sep}>/</span>
              <span className={styles.target}>{fmt(goal.targetAmount)} ₴</span>
            </div>
            {goal.deadline && (
              <div className={styles.deadline}>до {goal.deadline}</div>
            )}
            {forecast && !done && (
              <div className={styles.forecast}>прогноз: {forecast}</div>
            )}
            {done && <div className={styles.done}>Ціль досягнута ✓</div>}
          </div>
        </div>

        {!done && (
          <form className={styles.contribForm} onSubmit={handleContribute}>
            <div>
              <input
                className={`${styles.input} ${contribError ? 'inputError' : ''}`}
                type="number"
                placeholder="Сума поповнення (₴)"
                value={contribAmount}
                onChange={e => {
                  setContribAmount(e.target.value)
                  if (contribError && parseFloat(e.target.value) > 0) setContribError(undefined)
                }}
              />
              {contribError && <span className="errorMsg">{contribError}</span>}
            </div>
            <button type="submit" className={styles.contribBtn}>Поповнити</button>
          </form>
        )}

        {sortedDeposits.length > 0 && (
          <div className={styles.history}>
            <p className={styles.historyTitle}>Поповнення</p>
            <div className={styles.historyList}>
              {sortedDeposits.slice(0, 10).map((d, i) => (
                <div key={i} className={styles.historyRow}>
                  <span className={styles.historyDate}>
                    {new Date(d.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className={styles.historyAmt}>+{fmt(d.amount)} ₴</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          className={`${styles.deleteBtn} ${confirmDelete ? styles.deleteBtnConfirm : ''}`}
          onClick={handleDelete}
        >
          {confirmDelete ? 'Підтвердити видалення' : 'Видалити ціль'}
        </button>
      </div>
    </Modal>
  )
}

export default GoalDetail

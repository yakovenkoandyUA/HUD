import React, { useState, useMemo, useEffect } from 'react'
import type { Goal } from '@/shared/types'
import { useGoalsStore } from '@/features/finance/store/goalsStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useImageUpload } from '@/shared/hooks/useImageUpload'
import { fmt } from '../../../utils/finance'
import Modal from '@/shared/components/ui/Modal'
import styles from './GoalDetail.module.css'

/**
 * GoalDetail
 * ----------
 * Модалка деталей цілі: кружечок прогресу з фото, форма поповнення,
 * список депозитів, прогноз, видалення.
 *
 * Props:
 * @prop {Goal}        goal    — ціль з goalsStore
 * @prop {boolean}     isOpen  — контролює анімацію
 * @prop {() => void}  onClose — закрити модалку
 */
interface GoalDetailProps {
  goal: Goal
  isOpen: boolean
  onClose: () => void
}

const R    = 40
const SW   = 7
const CX   = 48
const CY   = 48
const CIRC = 2 * Math.PI * R
const INNER_R = R - SW / 2 - 1

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
  const { showToast } = useUiStore()
  const [contribAmount, setContribAmount] = useState('')
  const [contribError, setContribError]   = useState<string | undefined>()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { trigger, uploading, error: uploadError, inputElement } = useImageUpload(
    'mimir/goals',
    (url) => { updateImage(goal.id, url); showToast('Фото оновлено', 'success') }
  )

  useEffect(() => {
    if (uploadError) showToast('Помилка завантаження', 'error')
  }, [uploadError, showToast])

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
        {inputElement}

        <div className={styles.hero}>
          {/* ── Ring з фото всередині ── */}
          <button
            type="button"
            className={styles.ringBtn}
            onClick={trigger}
            disabled={uploading}
            aria-label="Змінити фото"
            title={goal.imageUrl ? 'Змінити фото' : 'Додати фото'}
          >
            {goal.imageUrl && (
              <img src={goal.imageUrl} alt="" className={styles.ringPhoto} />
            )}
            <svg width="96" height="96" viewBox="0 0 96 96" className={styles.ring}>
              <defs>
                <clipPath id={`goal-clip-${goal.id}`}>
                  <circle cx={CX} cy={CY} r={INNER_R} />
                </clipPath>
              </defs>
              <circle cx={CX} cy={CY} r={R} fill="none"
                stroke={goal.imageUrl ? 'rgba(0,0,0,0.25)' : 'var(--border2)'}
                strokeWidth={SW}
              />
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
                fill={goal.imageUrl ? '#fff' : color}
                fontSize="14"
                fontFamily="var(--font-mono)"
                fontWeight="700"
                style={{ textShadow: goal.imageUrl ? '0 1px 3px rgba(0,0,0,0.7)' : undefined }}
              >
                {uploading ? '...' : `${pct}%`}
              </text>
            </svg>
            {!goal.imageUrl && (
              <div className={styles.ringUploadHint}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v8M4 6l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            )}
          </button>

          <div className={styles.heroInfo}>
            <span className={styles.name}>{goal.title}</span>
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

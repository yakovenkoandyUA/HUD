import React from 'react'
import Card from '@/shared/components/ui/Card'
import { useNavigate } from 'react-router-dom'
import type { UnifiedTodo, SprintTag } from '@/shared/types'
import styles from './SprintMini.module.css'

/**
 * SprintMini
 * ----------
 * Мінікартка прогресу спринту для Dashboard.
 * Показує всі задачі тижня (виконані + невиконані) до ліміту.
 * Виконані: зелений заповнений чекбокс + закреслений текст.
 * Невиконані: прозорий чекбокс з тонким бордером.
 *
 * Props:
 * @prop {UnifiedTodo[]} tasks — завдання спринту поточного тижня (type=sprint)
 */
interface SprintMiniProps {
  tasks: UnifiedTodo[]
}

const TAG_LABEL: Record<SprintTag, string> = {
  mentorship: 'Менторство',
  dev:        'Розробка',
  personal:   'Особисте',
  learning:   'Навчання',
}

const LIMIT = 4

const CheckIcon: React.FC = () => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
    <path d="M1.5 4l2 2 3-3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const SprintMini: React.FC<SprintMiniProps> = ({ tasks }) => {
  const navigate = useNavigate()
  const done    = tasks.filter((t) => t.done).length
  const total   = tasks.length
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0
  const allDone = total > 0 && done === total

  const visible = tasks.slice(0, LIMIT)
  const rest    = total - LIMIT

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <span className={styles.label}>Спрінт тижня</span>
        <span
          className={styles.count}
          style={{
            color:      allDone ? 'var(--second)' : 'var(--accent)',
            background: allDone ? 'var(--second-soft)' : 'var(--accent-soft)',
          }}
        >
          {done}/{total}
        </span>
      </div>

      <div className={styles.barTrack}>
        <div
          className={styles.barFill}
          style={{
            width:      `${pct}%`,
            background: allDone ? 'var(--second)' : 'var(--accent)',
          }}
        />
      </div>

      {total === 0 ? (
        <div className={styles.empty}>Завдань немає</div>
      ) : (
        <>
          <ul className={styles.list}>
            {visible.map((t) => (
              <li key={t.id} className={styles.item}>
                <span className={`${styles.checkbox} ${t.done ? styles.checkboxDone : ''}`}>
                  {t.done && <CheckIcon />}
                </span>
                <span className={`${styles.title} ${t.done ? styles.titleDone : ''}`}>
                  {t.title}
                </span>
                {t.tag && !t.done && (
                  <span className={styles.tag}>{TAG_LABEL[t.tag]}</span>
                )}
              </li>
            ))}
          </ul>

          {rest > 0 && (
            <button
              type="button"
              className={styles.moreBtn}
              onClick={() => navigate('/sprint')}
            >
              ще {rest} →
            </button>
          )}
        </>
      )}
    </Card>
  )
}

export default SprintMini

import React, { useEffect } from 'react'
import Modal from '@/shared/components/ui/Modal'
import MoodIcon from '../DayOverlay/MoodIcon'
import { useMoodStore } from '@/features/profile/store/moodStore'
import styles from './MoodDayDetail.module.css'

const MOOD_LABELS: Record<number, string> = {
  1: 'Важко',
  2: 'Так собі',
  3: 'Нормально',
  4: 'Добре',
  5: 'Чудово',
}

/**
 * MoodDayDetail
 * -------------
 * Bottom sheet з деталями настрою за конкретний день з календаря:
 * власна відмітка + нотатка, і те саме для кожного члена сім'ї.
 *
 * Props:
 * @prop {string | null} date — YYYY-MM-DD або null (закрито)
 * @prop {() => void} onClose
 */
interface MoodDayDetailProps {
  date:    string | null
  onClose: () => void
}

const MoodDayDetail: React.FC<MoodDayDetailProps> = ({ date, onClose }) => {
  const { logs, familyMoodsByDate, fetchFamilyMoodsForDate, fetchLogs } = useMoodStore()

  useEffect(() => {
    if (!date) return
    fetchFamilyMoodsForDate(date)
    if (!logs.some(l => l.date === date)) fetchLogs(date, date)
  }, [date]) // eslint-disable-line react-hooks/exhaustive-deps

  const ownLog       = date ? logs.find(l => l.date === date) : undefined
  const familyMoods  = date ? familyMoodsByDate[date] ?? [] : []
  const title        = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''

  return (
    <Modal isOpen={!!date} onClose={onClose} title={title} draggable>
      <div className={styles.list}>
        <div className={styles.row}>
          {ownLog ? (
            <MoodIcon score={ownLog.score} size={28} color="var(--accent)" />
          ) : (
            <span className={styles.emptyIcon} />
          )}
          <div className={styles.info}>
            <span className={styles.name}>Ви</span>
            {ownLog ? (
              <>
                <span className={styles.label}>{MOOD_LABELS[ownLog.score]}</span>
                {ownLog.note && <span className={styles.note}>{ownLog.note}</span>}
              </>
            ) : (
              <span className={styles.label}>Немає відмітки</span>
            )}
          </div>
        </div>

        {familyMoods.map(fm => (
          <div key={fm.userId} className={styles.row}>
            {fm.avatarUrl ? (
              <img src={fm.avatarUrl} className={styles.avatar} alt={fm.name} />
            ) : (
              <span className={styles.avatarInitial}>{fm.name[0]?.toUpperCase()}</span>
            )}
            <div className={styles.info}>
              <span className={styles.name}>{fm.name}</span>
              <span className={styles.label}>{MOOD_LABELS[fm.score]}</span>
              {fm.note && <span className={styles.note}>{fm.note}</span>}
            </div>
            <MoodIcon score={fm.score} size={28} color="var(--text3)" />
          </div>
        ))}
      </div>
    </Modal>
  )
}

export default MoodDayDetail

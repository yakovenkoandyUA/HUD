import React, { useEffect, useRef, useState, useCallback } from 'react'
import styles from './TimeWheelPicker.module.css'

const ITEM_HEIGHT = 36
const VISIBLE_COUNT = 5
const PAD = Math.floor(VISIBLE_COUNT / 2)

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

interface WheelColumnProps {
  values: string[]
  index: number
  onChange: (index: number) => void
}

/**
 * WheelColumn
 * -----------
 * Один прокручуваний барабан значень (iOS-style time wheel), з snap по центру
 * і fade/scale сусідніх рядків залежно від відстані до центру.
 */
const WheelColumn: React.FC<WheelColumnProps> = ({ values, index, onChange }) => {
  const ref = useRef<HTMLDivElement>(null)
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [scrollTop, setScrollTop] = useState(index * ITEM_HEIGHT)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.scrollTop = index * ITEM_HEIGHT
    setScrollTop(index * ITEM_HEIGHT)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop
    setScrollTop(top)
    if (settleRef.current) clearTimeout(settleRef.current)
    settleRef.current = setTimeout(() => {
      const el = ref.current
      if (!el) return
      const nextIndex = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / ITEM_HEIGHT)))
      el.scrollTo({ top: nextIndex * ITEM_HEIGHT, behavior: 'smooth' })
      onChange(nextIndex)
    }, 110)
  }, [values.length, onChange])

  const viewCenter = scrollTop + (ITEM_HEIGHT * VISIBLE_COUNT) / 2
  const maxDist = ITEM_HEIGHT * PAD

  return (
    <div className={styles.wheel} style={{ height: ITEM_HEIGHT * VISIBLE_COUNT }}>
      <div className={styles.highlight} style={{ height: ITEM_HEIGHT, top: ITEM_HEIGHT * PAD }} />
      <div
        ref={ref}
        className={styles.scroller}
        style={{ paddingTop: ITEM_HEIGHT * PAD, paddingBottom: ITEM_HEIGHT * PAD }}
        onScroll={handleScroll}
      >
        {values.map((v, i) => {
          const itemCenter = i * ITEM_HEIGHT + ITEM_HEIGHT / 2
          const ratio = Math.min(1, Math.abs(itemCenter - viewCenter) / maxDist)
          return (
            <div
              key={v}
              className={styles.item}
              style={{ height: ITEM_HEIGHT, opacity: 1 - ratio * 0.75, transform: `scale(${1 - ratio * 0.22})` }}
            >
              {v}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface TimeWheelRowProps {
  value?: string
  onChange: (time: string) => void
}

/**
 * TimeWheelRow
 * ------------
 * Бар самих барабанів години/хвилини без обгортки-шіта — для вбудовування
 * в інші bottom sheets (напр. комбінований редактор дедлайну).
 */
export const TimeWheelRow: React.FC<TimeWheelRowProps> = ({ value, onChange }) => {
  const [h, m] = (value ?? '09:00').split(':').map(Number)
  const [hourIndex, setHourIndex] = useState(h || 0)
  const [minuteIndex, setMinuteIndex] = useState(m || 0)

  const update = (nextHour: number, nextMinute: number) => {
    onChange(`${HOURS[nextHour]}:${MINUTES[nextMinute]}`)
  }

  return (
    <div className={styles.body}>
      <WheelColumn values={HOURS} index={hourIndex} onChange={i => { setHourIndex(i); update(i, minuteIndex) }} />
      <span className={styles.colon}>:</span>
      <WheelColumn values={MINUTES} index={minuteIndex} onChange={i => { setMinuteIndex(i); update(hourIndex, i) }} />
    </div>
  )
}

interface TimeWheelPickerProps {
  value?: string
  title?: string
  onSave: (time: string) => void
  onClose: () => void
}

/**
 * TimeWheelPicker
 * ---------------
 * Bottom sheet з двома прокручуваними барабанами (години/хвилини), iOS-style.
 *
 * Props:
 * @prop {string}   value   — поточний час "HH:MM" (дефолт 09:00)
 * @prop {string}   title   — заголовок шіта
 * @prop {Function} onSave  — викликається з обраним часом "HH:MM" при натисканні "Готово"
 * @prop {Function} onClose — закриття без збереження
 */
const TimeWheelPicker: React.FC<TimeWheelPickerProps> = ({ value, title = 'Час дедлайну', onSave, onClose }) => {
  const [h, m] = (value ?? '09:00').split(':').map(Number)
  const [hourIndex, setHourIndex] = useState(h || 0)
  const [minuteIndex, setMinuteIndex] = useState(m || 0)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">✕</button>
        </div>
        <div className={styles.body}>
          <WheelColumn values={HOURS} index={hourIndex} onChange={setHourIndex} />
          <span className={styles.colon}>:</span>
          <WheelColumn values={MINUTES} index={minuteIndex} onChange={setMinuteIndex} />
        </div>
        <button
          type="button"
          className={styles.doneBtn}
          onClick={() => onSave(`${HOURS[hourIndex]}:${MINUTES[minuteIndex]}`)}
        >
          Готово
        </button>
      </div>
    </div>
  )
}

export default TimeWheelPicker
